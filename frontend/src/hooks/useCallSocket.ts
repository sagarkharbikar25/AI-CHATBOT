import { useState, useRef, useEffect, useCallback } from 'react';
import type { CallState, TranscriptMessage, CallAnalysis } from '../types';
import { createCall, uploadRecording, finalizeCall } from '../lib/api';
import { PlaybackQueue } from '../audio/playback-queue';
import { MixedAudioRecorder } from '../audio/recorder';

interface UseCallSocketOptions {
  productId: string;
  language: string;
  onAnalysisComplete?: (analysis: CallAnalysis) => void;
  onError?: (error: string) => void;
}

export function useCallSocket({
  productId,
  language,
  onAnalysisComplete,
  onError,
}: UseCallSocketOptions) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callId, setCallId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [interimText, setInterimText] = useState<{ role: 'bot' | 'customer'; text: string } | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackQueueRef = useRef<PlaybackQueue | null>(null);
  const recorderRef = useRef<MixedAudioRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const callStateRef = useRef<CallState>('idle');
  const callIdRef = useRef<string | null>(null);
  const durationSecRef = useRef<number>(0);
  const endCallRef = useRef<((reason?: string) => Promise<void>) | null>(null);
  const isFinalizingRef = useRef<boolean>(false);
  // Track bot speaking to suppress echo-triggered barge-in
  const isBotSpeakingRef = useRef<boolean>(false);
  // State the backend wants us to be in — applied only after audio drains
  const pendingStateRef = useRef<CallState | null>(null);

  // Keep refs synced
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);

  // Timer runner
  useEffect(() => {
    if (callState !== 'idle' && callState !== 'ended') {
      timerIntervalRef.current = setInterval(() => {
        setDurationSec((prev) => {
          const next = prev + 1;
          durationSecRef.current = next;
          return next;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [callState]);

  // Clean shutdown
  const cleanupAudio = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (playbackQueueRef.current) {
      playbackQueueRef.current.flush();
      playbackQueueRef.current = null;
    }

    if (recorderRef.current) {
      recorderRef.current.cleanup();
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const startCall = async () => {
    try {
      setCallState('connecting');
      setMessages([]);
      setInterimText(null);
      setDurationSec(0);
      setAnalysis(null);
      setIsFinalizing(false);
      isFinalizingRef.current = false;

      // 1. Initialize AudioContext upon user gesture
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 24000 });
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      audioCtxRef.current = ctx;

      // 2. Request microphone stream
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = micStream;

      // 3. Setup playback queue
      // onIdle fires when audio physically stops — apply pending state THEN notify backend
      const applyPendingState = () => {
        const pending = pendingStateRef.current;
        if (pending) {
          pendingStateRef.current = null;
          isBotSpeakingRef.current = false;
          console.log('[useCallSocket] Audio idle → applying pending state:', pending);
          setCallState(pending);
        }
        // Always tell the backend audio is done — this is what starts the silence timer.
        // Backend will only start its 8s watchdog AFTER receiving this message.
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'audio_complete' }));
        }
      };
      const playbackQueue = new PlaybackQueue(ctx, (level) => {
        setAudioLevel(level);
      }, applyPendingState);
      playbackQueueRef.current = playbackQueue;

      // 4. Setup synchronized dual-stream audio recorder
      const recorder = new MixedAudioRecorder(ctx, micStream, playbackQueue.getGainNode());
      recorderRef.current = recorder;
      recorder.start();

      // 5. Create Call session on backend
      const callData = await createCall(productId, language, true);
      callIdRef.current = callData.call_id;
      setCallId(callData.call_id);

      // 6. Connect WebSocket
      const defaultWs = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
        ? 'wss://ai-chatbot-5v0s.onrender.com'
        : undefined;
      const envWs = (import.meta as any).env?.VITE_WS_URL || defaultWs;
      let wsUrl: string;
      if (envWs) {
        wsUrl = `${envWs}${callData.ws_url}`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.port === '5173' ? '127.0.0.1:8000' : window.location.host;
        wsUrl = `${protocol}//${wsHost}${callData.ws_url}`;
      }
      console.log('Connecting voice WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log('WebSocket connection established');
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'state') {
              const prevBotSpeaking = isBotSpeakingRef.current;
              const newState = data.value as CallState;

              if (newState === 'speaking') {
                // Bot is about to speak — clear any pending and go live
                pendingStateRef.current = null;
                isBotSpeakingRef.current = true;
                setCallState('speaking');
              } else if (prevBotSpeaking && playbackQueueRef.current?.isPlaying) {
                // Bot was speaking and audio is still draining — buffer the state.
                // onIdle callback will apply it once audio actually stops.
                console.log('[useCallSocket] Audio still playing, deferring state:', newState);
                pendingStateRef.current = newState;
              } else {
                // No audio in flight — apply immediately
                isBotSpeakingRef.current = false;
                if (prevBotSpeaking) playbackQueueRef.current?.flush();
                setCallState(newState);
              }
            } else if (data.type === 'transcript') {
              if (data.final) {
                setMessages((prev) => {
                  // Deduplicate if this customer message was already rendered optimistically
                  if (data.role === 'customer' && prev.some((m) => m.role === 'customer' && m.text.trim() === data.text.trim())) {
                    return prev;
                  }
                  return [
                    ...prev,
                    {
                      seq: data.seq,
                      role: data.role,
                      text: data.text,
                      final: true,
                      interrupted: data.interrupted,
                    },
                  ];
                });
                setInterimText(null);
              } else {
                setInterimText({ role: data.role, text: data.text });
              }
            } else if (data.type === 'stop_audio') {
              playbackQueueRef.current?.flush();
            } else if (data.type === 'ended') {
              console.log('[useCallSocket] Backend signaled call ended, reason:', data.reason);
              endCallRef.current?.(data.reason || 'bot_ended');
            }
          } catch (e) {
            console.error('Error parsing WS message', e);
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Received binary audio chunk from backend TTS
          playbackQueueRef.current?.enqueue(event.data);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error', e);
        onError?.('Connection error with voice server');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        if (callStateRef.current !== 'ended' && !isFinalizingRef.current) {
          endCallRef.current?.('disconnected');
        }
      };

      // 7. Setup Web Speech Recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language.startsWith('hi') ? 'hi-IN' : language.startsWith('te') ? 'te-IN' : 'en-US';

        recognition.onresult = (event: any) => {
          // Suppress ALL recognition while bot is speaking — prevents echo-triggered barge-in storm
          if (isBotSpeakingRef.current) return;

          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              // Send final speech only when bot is NOT speaking
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: 'user_speech',
                    text: transcript,
                    is_final: true,
                  })
                );
              }
              setInterimText(null);
            } else {
              interim += transcript;
            }
          }
          if (interim) {
            setInterimText({ role: 'customer', text: interim });
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'user_speech',
                  text: interim,
                  is_final: false,
                })
              );
            }
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition warning:', err.error);
        };

        recognition.onend = () => {
          // Restart recognition if call is still active
          if (callStateRef.current !== 'ended' && callStateRef.current !== 'idle' && !isFinalizingRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err: any) {
      console.error('Call initialization failed', err);
      cleanupAudio();
      setCallState('idle');
      onError?.(err.message || 'Microphone access denied or audio failed to start');
    }
  };

  const endCall = async (reason = 'user_ended') => {
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    setIsFinalizing(true);
    setCallState('ended');
    setInterimText(null);  // clear any in-progress bubble immediately

    // Notify WS if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'end', reason }));
        wsRef.current.close();
      } catch {}
    }

    const currentCallId = callIdRef.current || callId;
    const finalDuration = durationSecRef.current || durationSec;

    // Stop recorder and collect final mixed audio
    let audioBlob: Blob | null = null;
    if (recorderRef.current) {
      try {
        audioBlob = await recorderRef.current.stop();
      } catch (recErr) {
        console.error('[useCallSocket] Error stopping recorder:', recErr);
      }
    }

    cleanupAudio();

    // Upload recording and finalize
    if (currentCallId) {
      try {
        if (audioBlob && audioBlob.size > 0) {
          console.log(`[useCallSocket] Uploading synchronized audio recording (${audioBlob.size} bytes) for call ${currentCallId}...`);
          await uploadRecording(currentCallId, audioBlob);
          console.log('[useCallSocket] Audio recording upload completed successfully');
        } else {
          console.warn('[useCallSocket] Audio recording blob was empty, skipping upload');
        }
        console.log(`[useCallSocket] Finalizing call ${currentCallId} with backend (reason: ${reason}, duration: ${finalDuration}s)...`);
        const finalizeRes = await finalizeCall(currentCallId, reason, finalDuration);
        console.log('[useCallSocket] Call finalized successfully:', finalizeRes);
        setAnalysis(finalizeRes.analysis);
        onAnalysisComplete?.(finalizeRes.analysis);
      } catch (e) {
        console.error('[useCallSocket] Failed to upload recording or finalize call', e);
      } finally {
        setIsFinalizing(false);
      }
    } else {
      console.warn('[useCallSocket] endCall called with missing callId, cannot finalize');
      setIsFinalizing(false);
    }
  };

  // Keep endCallRef in sync every render
  endCallRef.current = endCall;

  const resetCall = useCallback(() => {
    cleanupAudio();
    isFinalizingRef.current = false;
    setIsFinalizing(false);
    callIdRef.current = null;
    durationSecRef.current = 0;
    setCallId(null);
    setCallState('idle');
    setMessages([]);
    setInterimText(null);
    setAudioLevel(0);
    setDurationSec(0);
    setAnalysis(null);
  }, [cleanupAudio]);

  const sendManualMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 1. Optimistically display customer message in Live Transcript
    setMessages((prev) => [
      ...prev,
      {
        seq: Date.now(),
        role: 'customer',
        text: trimmed,
        final: true,
      },
    ]);

    // 2. Always flush bot audio — user is now speaking, regardless of
    //    what state the ref thinks we're in (timing can lag behind).
    playbackQueueRef.current?.flush();
    isBotSpeakingRef.current = false;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'barge_in' }));
    }

    // 3. Dispatch user speech event over WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'user_speech',
          text: trimmed,
          is_final: true,
        })
      );
    } else {
      console.warn('WebSocket not yet in OPEN state to transmit message, readyState:', wsRef.current?.readyState);
    }
  };

  // Dedicated barge-in: immediately cuts bot audio and signals backend
  const bargeIn = () => {
    playbackQueueRef.current?.flush();
    isBotSpeakingRef.current = false;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'barge_in' }));
    }
  };

  return {
    callState,
    callId,
    messages,
    interimText,
    audioLevel,
    durationSec,
    isFinalizing,
    analysis,
    startCall,
    endCall,
    resetCall,
    bargeIn,
    sendManualMessage,
  };
}
