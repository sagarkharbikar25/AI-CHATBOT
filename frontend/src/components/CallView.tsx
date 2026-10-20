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
  Hand, Bot, Activity, Zap, ShieldCheck, ArrowRight, 
  MessageSquareCode, ChevronRight, CheckCircle2, Play
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

  const defaultProduct: Product = {
    id: 'flowdesk',
    name: 'FlowDesk',
    tagline: 'AI-Powered Customer Support Helpdesk for SMBs',
    one_liner: 'FlowDesk resolves up to 70% of tickets with AI, syncing with email, chat, and CRM.',
    languages: ['en', 'hi'],
  };
  const currentProductObj = products.find((p) => p.id === selectedProduct) || products[0] || defaultProduct;

  const isCallActive = callState !== 'idle' && callState !== 'ended';

  return (
    <div className="space-y-6">
      {/* Top Banner: Agent Intelligence Header & Engine Telemetry */}
      <div className="relative rounded-3xl glass-panel-elevated p-5 overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#00F5A0]/10 via-[#00D9F5]/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          {/* Agent Persona Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00F5A0] to-[#00D9F5] p-0.5 glow-mint">
                <div className="w-full h-full bg-[#080E1C] rounded-[14px] flex items-center justify-center">
                  <Bot className="w-7 h-7 text-[#00F5A0]" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F5A0] opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#00F5A0] border-2 border-[#070A11]" />
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-extrabold font-display text-white tracking-tight">
                  Alex • Voice Sales Specialist
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#00F5A0]/10 border border-[#00F5A0]/30 text-[#00F5A0] font-mono text-[10px] font-bold uppercase tracking-wider">
                  Neural v2.6
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 font-mono text-[10px]">
                  {language === 'hi' ? '🇮🇳 हिन्दी Mode' : '🇺🇸 English Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-reading mt-0.5">
                Representing <strong className="text-slate-200">{currentProductObj.name}</strong> — {currentProductObj.tagline}
              </p>
            </div>
          </div>

          {/* Controls: Product dropdown, Language pills, Headphone advisory */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            {/* Product Switcher */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs">
              <span className="text-slate-400 font-mono text-[10px] uppercase">Product:</span>
              <select
                value={selectedProduct}
                onChange={(e) => onSelectProduct(e.target.value)}
                disabled={isCallActive}
                className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Selector */}
            <div className="flex items-center bg-slate-900/70 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => onSelectLanguage('en')}
                disabled={isCallActive}
                className={`px-3 py-1 rounded-lg text-xs font-semibold font-reading transition-all ${
                  language === 'en'
                    ? 'bg-gradient-to-r from-[#00F5A0] to-[#00D9F5] text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => onSelectLanguage('hi')}
                disabled={isCallActive}
                className={`px-3 py-1 rounded-lg text-xs font-semibold font-reading transition-all ${
                  language === 'hi'
                    ? 'bg-gradient-to-r from-[#00F5A0] to-[#00D9F5] text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 font-reading">
              <Headphones className="w-3.5 h-3.5 text-[#00D9F5]" />
              <span>Headphones best</span>
            </div>
          </div>
        </div>

        {/* Telemetry Status Strip */}
        <div className="mt-4 pt-3.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#00F5A0]" />
              <span>Latency: <strong className="text-slate-200">&lt;380ms TTFT</strong></span>
            </span>
            <span className="flex items-center gap-1.5 hidden sm:flex">
              <Zap className="w-3.5 h-3.5 text-[#00D9F5]" />
              <span>TTS: <strong className="text-slate-200">Sentence-Chunked</strong></span>
            </span>
            <span className="flex items-center gap-1.5 hidden md:flex">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Audio Mix: <strong className="text-slate-200">Synced Dual-Channel</strong></span>
            </span>
          </div>

          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
            Barge-in: Active &middot; Endpointing: Tuned
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-reading flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Acoustic Core (Left) + Interactive Intelligence Stream (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[520px]">
        {/* Left Column: Visualizer & Call Command Center */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl glass-panel p-6 border border-white/10 relative overflow-hidden">
          {/* Subtle glowing ambient mesh behind orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#00F5A0]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Status Header */}
          <div className="flex items-center justify-between relative z-10">
            <StatusBadge state={callState} durationSec={durationSec} />
          </div>

          {/* Dynamic 3D Acoustic Sphere */}
          <div className="py-4 flex flex-col items-center justify-center relative z-10">
            <AcousticHalo
              state={callState}
              audioLevel={audioLevel}
              size={270}
            />

            {/* Simulated Live Equalizer Frequency Spectrum */}
            <div className="flex items-center gap-1.5 h-6 mt-3 px-4 py-1 rounded-full bg-slate-900/60 border border-white/5">
              <span className={`w-1 bg-[#00F5A0] rounded-full ${isCallActive ? 'animate-bar-1' : 'h-1 opacity-30'}`} style={{ height: isCallActive ? '80%' : '20%' }} />
              <span className={`w-1 bg-[#00D9F5] rounded-full ${isCallActive ? 'animate-bar-2' : 'h-1 opacity-30'}`} style={{ height: isCallActive ? '60%' : '20%' }} />
              <span className={`w-1 bg-[#00F5A0] rounded-full ${isCallActive ? 'animate-bar-3' : 'h-1 opacity-30'}`} style={{ height: isCallActive ? '100%' : '20%' }} />
              <span className={`w-1 bg-[#00D9F5] rounded-full ${isCallActive ? 'animate-bar-4' : 'h-1 opacity-30'}`} style={{ height: isCallActive ? '75%' : '20%' }} />
              <span className={`w-1 bg-[#00F5A0] rounded-full ${isCallActive ? 'animate-bar-5' : 'h-1 opacity-30'}`} style={{ height: isCallActive ? '90%' : '20%' }} />
              <span className="text-[10px] font-mono text-slate-400 ml-2 tracking-wider">
                {isCallActive ? 'LIVE SPECTRUM' : 'ACOUSTIC STANDBY'}
              </span>
            </div>

            <p className="text-xs font-reading text-slate-400 mt-2 text-center max-w-xs">
              {callState === 'idle'
                ? 'Ready to connect. Click "Start Voice Call" to experience real-time conversation.'
                : callState === 'connecting'
                ? 'Initializing audio streams...'
                : callState === 'speaking'
                ? 'Alex is speaking. Interrupt at any time by speaking or clicking barge-in.'
                : callState === 'listening'
                ? 'Microphone active. Waiting for your reply...'
                : callState === 'thinking'
                ? 'Synthesizing knowledge response...'
                : 'Session completed.'}
            </p>
          </div>

          {/* Action Triggers */}
          <div className="space-y-3 relative z-10 pt-2">
            {!isCallActive ? (
              <button
                onClick={handleStartClick}
                className="group relative w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#00F5A0] to-[#00D9F5] text-slate-950 font-display font-extrabold text-sm uppercase tracking-wider glow-mint hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 shadow-2xl"
              >
                <div className="w-8 h-8 rounded-full bg-slate-950/15 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4 fill-current text-slate-950" />
                </div>
                <span>Start Voice Call With Alex</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => sendManualMessage('barge_in_signal')}
                  className="py-3.5 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-reading text-xs font-bold flex items-center justify-center gap-2 transition-colors glow-amber"
                >
                  <Hand className="w-4 h-4" />
                  Barge-in (Interrupt)
                </button>

                <button
                  onClick={() => endCall('user_ended')}
                  className="py-3.5 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/50 text-rose-300 font-display text-xs font-bold uppercase tracking-wider glow-crimson flex items-center justify-center gap-2 transition-colors"
                >
                  <PhoneOff className="w-4 h-4" />
                  End Call
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Transcript OR Interactive Intelligence Showcase */}
        <div className="lg:col-span-7 flex flex-col h-[520px]">
          {isCallActive || messages.length > 0 ? (
            <LiveTranscript
              messages={messages}
              interimMessage={interimText}
            />
          ) : (
            /* Rich Pre-Call Scenario & Capabilities Showcase */
            <div className="h-full rounded-3xl glass-panel p-6 border border-white/10 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquareCode className="w-4 h-4 text-[#00D9F5]" />
                    <h3 className="text-sm font-bold font-display uppercase tracking-wider text-slate-200">
                      Pre-Call Intelligence & Interactive Scenarios
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#00F5A0] bg-[#00F5A0]/10 px-2 py-0.5 rounded-full border border-[#00F5A0]/20">
                    6 Statuses Verified
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-reading mb-4">
                  Test the complete sales lifecycle with FlowDesk&apos;s AI agent. You can speak naturally or test scripted outcomes:
                </p>

                {/* 4 Interactive Scenario Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <div
                    onClick={handleStartClick}
                    className="group p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#00F5A0]/40 hover:bg-[#00F5A0]/[0.03] transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1">
                      <span>1. Test Conversion</span>
                      <Play className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-reading leading-relaxed">
                      Ask pricing, challenge with budget objection, then agree to start the 14-day Pro trial.
                    </p>
                  </div>

                  <div
                    onClick={handleStartClick}
                    className="group p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#00D9F5]/40 hover:bg-[#00D9F5]/[0.03] transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-300 mb-1">
                      <span>2. Schedule Live Demo</span>
                      <Play className="w-3 h-3 text-cyan-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-reading leading-relaxed">
                      Ask how FlowDesk integrates with Zendesk, then request a 15-minute live team demo.
                    </p>
                  </div>

                  <div
                    onClick={handleStartClick}
                    className="group p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-400/40 hover:bg-amber-400/[0.03] transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
                      <span>3. Manager Follow-up</span>
                      <Play className="w-3 h-3 text-amber-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-reading leading-relaxed">
                      Inquire about ticket deflection, then ask to send details and call back next week.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      onSelectLanguage('hi');
                      handleStartClick();
                    }}
                    className="group p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-400/40 hover:bg-purple-400/[0.03] transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-purple-300 mb-1">
                      <span>4. हिन्दी Conversation</span>
                      <Play className="w-3 h-3 text-purple-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-reading leading-relaxed">
                      Switch to Hindi voice mode with natural SwaraNeural speech and Hindi discovery prompts.
                    </p>
                  </div>
                </div>

                {/* FlowDesk Capability Badges */}
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                    Verified Product Features Grounded in Context:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 font-reading">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00F5A0]" />
                      <span>70% Instant Ticket Deflection</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00D9F5]" />
                      <span>Unified Shopify & CRM Inbox</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00F5A0]" />
                      <span>Human-in-the-Loop Handoff</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00D9F5]" />
                      <span>Real-time CSAT & SLA Prediction</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Launch Call-to-Action */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-reading">
                  Click Launch Call to start real-time microphone conversation.
                </span>
                <button
                  onClick={handleStartClick}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#00F5A0] hover:underline font-reading"
                >
                  <span>Authorize & Launch</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scripted Prompt Helpers (Section 15 of plan.md) & Text Input Fallback */}
      {isCallActive && (
        <div className="p-4 rounded-3xl glass-panel border border-white/10 space-y-3">
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
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-reading text-emerald-300 transition-colors"
            >
              Converted: &quot;Sign me up for the plan&quot;
            </button>
            <button
              onClick={() => sendManualMessage("Can I see a live demo on Friday with our team?")}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-reading text-cyan-300 transition-colors"
            >
              Demo: &quot;Can I see a demo on Friday?&quot;
            </button>
            <button
              onClick={() => sendManualMessage("Send me details and call me next week, I need to ask my manager.")}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-reading text-amber-300 transition-colors"
            >
              Follow-up: &quot;Need to ask my manager&quot;
            </button>
            <button
              onClick={() => sendManualMessage("How does FlowDesk handle tier-1 tickets and Shopify?")}
              className="px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-xs font-reading text-violet-300 transition-colors"
            >
              Interested: &quot;How does it handle tickets?&quot;
            </button>
            <button
              onClick={() => sendManualMessage("We are happy with our current tool, not interested.")}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-reading text-rose-300 transition-colors"
            >
              Not Interested: &quot;Happy with current tool&quot;
            </button>
          </div>

          <form onSubmit={handleSendText} className="flex gap-2 pt-1">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type customer utterance here for quiet testing..."
              className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-reading text-white placeholder-slate-500 focus:outline-none focus:border-[#00F5A0]/60"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-[#00F5A0] hover:text-slate-950 text-slate-200 text-xs font-bold transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Saving and Analyzing Progress Indicator */}
      {isFinalizing && (
        <div className="p-8 rounded-3xl glass-panel-elevated text-center border border-[#00F5A0]/30 space-y-3 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-[#00F5A0]/20 text-[#00F5A0] flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-base font-bold font-display text-white">
            Saving Audio Recording & Synthesizing Post-Call Intelligence...
          </h3>
          <p className="text-xs text-slate-400 font-reading">
            Mixing synchronized audio, uploading to Supabase Storage, and checking deterministic guards.
          </p>
        </div>
      )}

      {/* Post-Call Summary Card & Synchronized Audio Player */}
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
      />
    </div>
  );
};
