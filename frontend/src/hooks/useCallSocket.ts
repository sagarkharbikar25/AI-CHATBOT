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
  const isFinalizingRef = useRef<boolean>(false);

  // Keep ref synced
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Timer runner
  useEffect(() => {
    if (callState !== 'idle' && callState !== 'ended') {
      timerIntervalRef.current = setInterval(() => {
        setDurationSec((prev) => prev + 1);
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
      const playbackQueue = new PlaybackQueue(ctx, (level) => {
        setAudioLevel(level);
      });
      playbackQueueRef.current = playbackQueue;

      // 4. Setup synchronized dual-stream audio recorder
      const recorder = new MixedAudioRecorder(ctx, micStream, playbackQueue.getGainNode());
      recorderRef.current = recorder;
      recorder.start();

      // 5. Create Call session on backend
      const callData = await createCall(productId, language, true);
      setCallId(callData.call_id);

      // 6. Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}${callData.ws_url}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'state') {
              setCallState(data.value);
            } else if (data.type === 'transcript') {
              if (data.final) {
                setMessages((prev) => [
                  ...prev,
                  {
                    seq: data.seq,
                    role: data.role,
                    text: data.text,
                    final: true,
                    interrupted: data.interrupted,
                  },
                ]);
                setInterimText(null);
              } else {
                setInterimText({ role: data.role, text: data.text });
              }
            } else if (data.type === 'stop_audio') {
              playbackQueueRef.current?.flush();
            } else if (data.type === 'ended') {
              endCall(data.reason || 'bot_ended');
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
          endCall('disconnected');
        }
      };

      // 7. Setup Web Speech Recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language.startsWith('hi') ? 'hi-IN' : 'en-US';

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              // Send final speech
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
              // Barge-in trigger: if bot is speaking and user speaks, flush audio immediately
              if (callStateRef.current === 'speaking') {
                playbackQueueRef.current?.flush();
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'barge_in' }));
                }
              }
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

    // Notify WS if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'end', reason }));
        wsRef.current.close();
      } catch {}
    }

    const currentCallId = callId;
    const finalDuration = durationSec;

    // Stop recorder and collect final mixed audio
    let audioBlob: Blob | null = null;
    if (recorderRef.current) {
      audioBlob = await recorderRef.current.stop();
    }

    cleanupAudio();

    // Upload recording and finalize
    if (currentCallId) {
      try {
        if (audioBlob && audioBlob.size > 0) {
          await uploadRecording(currentCallId, audioBlob);
        }
        const finalizeRes = await finalizeCall(currentCallId, reason, finalDuration);
        setAnalysis(finalizeRes.analysis);
        onAnalysisComplete?.(finalizeRes.analysis);
      } catch (e) {
        console.error('Failed to finalize call', e);
      } finally {
        setIsFinalizing(false);
      }
    } else {
      setIsFinalizing(false);
    }
  };

  const sendManualMessage = (text: string) => {
    if (!text.trim()) return;
    if (callStateRef.current === 'speaking') {
      playbackQueueRef.current?.flush();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'barge_in' }));
      }
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'user_speech',
          text,
          is_final: true,
        })
      );
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
    sendManualMessage,
  };
}
