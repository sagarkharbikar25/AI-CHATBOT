import React, { useState } from 'react';
import type { Product } from '../types';
import { useCallSocket } from '../hooks/useCallSocket';
import { AcousticHalo } from './AcousticHalo';
import { StatusBadge } from './StatusBadge';
import { LiveTranscript } from './LiveTranscript';
import { ConsentModal } from './ConsentModal';
import { SummaryCard } from './SummaryCard';
import { AudioPlayer } from './AudioPlayer';
import { 
  PhoneCall, PhoneOff, Sparkles, Send, Headphones, 
  Hand, Bot 
} from 'lucide-react';

interface CallViewProps {
  products: Product[];
  selectedProduct: string;
  onSelectProduct: (productId: string) => void;
  language: string;
  onSelectLanguage: (lang: string) => void;
}

export const CallView: React.FC<CallViewProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  language,
  onSelectLanguage,
}) => {
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
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
  } = useCallSocket({
    productId: selectedProduct,
    language,
    onError: (err) => {
      setErrorMessage(err);
    },
  });

  const handleStartClick = () => {
    setErrorMessage(null);
    setShowConsentModal(true);
  };

  const handleConsentConfirm = () => {
    setShowConsentModal(false);
    startCall();
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || callState === 'idle' || callState === 'ended') return;
    sendManualMessage(textInput);
    setTextInput('');
  };

  const currentProductObj = products.find((p) => p.id === selectedProduct) || products[0];

  return (
    <div className="space-y-6">
      {/* Top Bar: Product selector, Language toggle, Headphone tip */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00F5A0]/10 border border-[#00F5A0]/30 flex items-center justify-center text-[#00F5A0]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
              Active Sales Engine
            </span>
            <select
              value={selectedProduct}
              onChange={(e) => onSelectProduct(e.target.value)}
              disabled={callState !== 'idle' && callState !== 'ended'}
              className="bg-transparent text-sm font-bold font-display text-white focus:outline-none cursor-pointer"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name} — {p.tagline}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Toggle */}
          <div className="flex items-center bg-slate-900/60 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => onSelectLanguage('en')}
              disabled={callState !== 'idle' && callState !== 'ended'}
              className={`px-3 py-1 rounded-lg text-xs font-semibold font-reading transition-all ${
                language === 'en'
                  ? 'bg-gradient-to-r from-[#00F5A0]/20 to-[#00D9F5]/20 text-white border border-[#00F5A0]/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => onSelectLanguage('hi')}
              disabled={callState !== 'idle' && callState !== 'ended'}
              className={`px-3 py-1 rounded-lg text-xs font-semibold font-reading transition-all ${
                language === 'hi'
                  ? 'bg-gradient-to-r from-[#00F5A0]/20 to-[#00D9F5]/20 text-white border border-[#00F5A0]/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              हिन्दी (Hindi)
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-reading bg-slate-900/40 px-3 py-1.5 rounded-xl border border-white/5">
            <Headphones className="w-3.5 h-3.5 text-[#00D9F5]" />
            <span>Headphones recommended</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-reading flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Acoustic Orb / Call Controls (Left) + Live Transcript (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[440px]">
        {/* Left Column: Visualizer & Controls */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl glass-panel p-6 border border-white/10 relative overflow-hidden">
          {/* Subtle atmospheric orb in background */}
          <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-[#00F5A0]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Status Header */}
          <div className="flex items-center justify-between relative z-10">
            <StatusBadge state={callState} durationSec={durationSec} />
          </div>

          {/* Acoustic Halo Orb */}
          <div className="py-6 flex flex-col items-center justify-center relative z-10">
            <AcousticHalo
              state={callState}
              audioLevel={audioLevel}
              size={240}
            />
            <p className="text-xs font-reading text-slate-400 mt-2 text-center max-w-xs">
              {callState === 'idle'
                ? 'Ready to connect. Click "Start Voice Call" to begin.'
                : callState === 'connecting'
                ? 'Negotiating audio session...'
                : callState === 'speaking'
                ? 'Alex is talking. Speak or click interrupt to barge in.'
                : callState === 'listening'
                ? 'Microphone live. Listening for your response...'
                : callState === 'thinking'
                ? 'Streaming LLM tokens...'
                : 'Call concluded.'}
            </p>
          </div>

          {/* Call Action Controls */}
          <div className="space-y-3 relative z-10">
            {callState === 'idle' || callState === 'ended' ? (
              <button
                onClick={handleStartClick}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#00F5A0] to-[#00D9F5] text-slate-950 font-display font-bold text-sm uppercase tracking-wider glow-mint hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-xl"
              >
                <PhoneCall className="w-4 h-4 fill-current" />
                Start Voice Call
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => sendManualMessage('barge_in_signal')}
                  className="py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-reading text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Hand className="w-4 h-4" />
                  Barge-in (Interrupt)
                </button>

                <button
                  onClick={() => endCall('user_ended')}
                  className="py-3 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-display text-xs font-bold uppercase tracking-wider glow-crimson flex items-center justify-center gap-2 transition-colors"
                >
                  <PhoneOff className="w-4 h-4" />
                  End Call
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Transcript Dialogue Stream */}
        <div className="lg:col-span-7 flex flex-col h-[460px]">
          <LiveTranscript
            messages={messages}
            interimMessage={interimText}
          />
        </div>
      </div>

      {/* Scripted Prompt Helpers (Section 15 of plan.md) & Text Input Fallback */}
      {callState !== 'idle' && callState !== 'ended' && (
        <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00D9F5]" />
              Scripted Test Bench (Rubric Status Presets):
            </span>
            <span className="text-[10px] text-slate-500 font-reading">
              Click preset or speak via microphone
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => sendManualMessage("Okay, sign me up for the Pro plan today.")}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-reading text-emerald-300 transition-colors"
            >
              Converted: &quot;Sign me up for the plan&quot;
            </button>
            <button
              onClick={() => sendManualMessage("Can I see a live demo on Friday with our team?")}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[11px] font-reading text-cyan-300 transition-colors"
            >
              Demo: &quot;Can I see a demo on Friday?&quot;
            </button>
            <button
              onClick={() => sendManualMessage("Send me details and call me next week, I need to ask my manager.")}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-reading text-amber-300 transition-colors"
            >
              Follow-up: &quot;Need to ask my manager&quot;
            </button>
            <button
              onClick={() => sendManualMessage("How does FlowDesk handle tier-1 tickets and Shopify?")}
              className="px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-[11px] font-reading text-violet-300 transition-colors"
            >
              Interested: &quot;How does it handle tickets?&quot;
            </button>
            <button
              onClick={() => sendManualMessage("We are happy with our current tool, not interested.")}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] font-reading text-rose-300 transition-colors"
            >
              Not Interested: &quot;Happy with current tool&quot;
            </button>
          </div>

          <form onSubmit={handleSendText} className="flex gap-2 pt-1">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type custom customer utterance here..."
              className="flex-1 bg-slate-900/70 border border-white/10 rounded-xl px-4 py-2 text-xs font-reading text-white placeholder-slate-500 focus:outline-none focus:border-[#00F5A0]/50"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-[#00F5A0] hover:text-slate-950 text-slate-200 text-xs font-semibold transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Saving and Analyzing Progress Indicator */}
      {isFinalizing && (
        <div className="p-8 rounded-3xl glass-panel-elevated text-center border border-[#00F5A0]/30 space-y-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-[#00F5A0]/20 text-[#00F5A0] flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <h3 className="text-base font-bold font-display text-white">
            Saving Audio Recording & Synthesizing Post-Call Intelligence...
          </h3>
          <p className="text-xs text-slate-400 font-reading">
            Mixing synchronized audio, evaluating sales stance against rubric, and validating evidence quotes.
          </p>
        </div>
      )}

      {/* Post-Call Summary Card */}
      {analysis && !isFinalizing && (
        <div className="space-y-4">
          <SummaryCard analysis={analysis} />
          {callId && (
            <AudioPlayer
              src={`/api/recordings/${callId}.webm`}
              title="Synchronized Call Recording (Microphone + Alex Voice Mix)"
            />
          )}
        </div>
      )}

      {/* Consent Modal */}
      <ConsentModal
        isOpen={showConsentModal}
        onConfirm={handleConsentConfirm}
        onCancel={() => setShowConsentModal(false)}
        productName={currentProductObj.name}
        language={language}
      />
    </div>
  );
};
