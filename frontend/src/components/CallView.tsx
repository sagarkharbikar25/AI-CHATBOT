import React, { useState } from 'react';
import type { Product } from '../types';
import { useCallSocket } from '../hooks/useCallSocket';
import { RobotAvatar } from './RobotAvatar';
import { StatusBadge } from './StatusBadge';
import { LiveTranscript } from './LiveTranscript';
import { ConsentModal } from './ConsentModal';
import { SummaryCard } from './SummaryCard';
import { AudioPlayer } from './AudioPlayer';
import { API_BASE } from '../lib/api';
import {
  PhoneCall, PhoneOff, Sparkles, Send, Headphones,
  Hand, Activity, Zap, ShieldCheck, ArrowRight,
  Play, RotateCcw
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
    resetCall,
    bargeIn,
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

  // Barge-in: flush local audio queue + notify backend
  const handleBargeIn = () => bargeIn();

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
      {/* ABOVE-THE-FOLD NARRATIVE: What it is, Who it is for, Why it matters, What to do next */}
      <div className="pt-1 pb-4 border-b border-white/5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF2A55]" />
              <span className="text-[10px] font-mono tracking-widest text-[#FF2A55] uppercase font-bold">
                FlowDesk AI // Autonomous Voice Specialist
              </span>
            </div>

            {/* WHAT IT IS (H1) */}
            <h1 className="editorial-hero-title text-2xl sm:text-3xl lg:text-3.5xl font-extrabold text-white">
              Voice AI that resolves <span className="text-[#FF2A55]">70% of tickets</span> &amp; closes sales in real time.
            </h1>

            {/* WHO IT IS FOR & WHY IT MATTERS */}
            <p className="text-xs sm:text-sm text-slate-300 font-rajdhani font-semibold leading-relaxed">
              Engineered for scaling e-commerce &amp; SMB teams losing customers to delayed response times. Alex speaks with sub-450ms human cadence, negotiates trials, answers complex technical inquiries grounded in your knowledge base, and syncs directly into Shopify &amp; Zendesk.
            </p>

            {/* WHAT TO DO NEXT */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pt-0.5">
              <ArrowRight className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>
                <strong>Next Step:</strong> Speak naturally into your microphone below to experience live objection handling, or click a direct test directive.
              </span>
            </div>
          </div>

          {/* Configuration Console (Product & Language) */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-end bg-[#0A0D14] p-1.5 rounded-xl border border-white/10">
            {/* Product Switcher */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-xs">
              <span className="text-slate-400 font-mono text-[10px] uppercase">Catalog:</span>
              <select
                value={selectedProduct}
                onChange={(e) => onSelectProduct(e.target.value)}
                disabled={isCallActive}
                className="bg-transparent text-xs font-orbitron font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/5 text-xs font-orbitron font-bold">
              <button
                onClick={() => onSelectLanguage('en')}
                disabled={isCallActive}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${language === 'en'
                  ? 'bg-[#FF2A55] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                EN
              </button>
              <button
                onClick={() => onSelectLanguage('hi')}
                disabled={isCallActive}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${language === 'hi'
                  ? 'bg-[#A855F7] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                हिन्दी
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] text-slate-400 font-mono">
              <Headphones className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>HEADPHONES RECOMMENDED</span>
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-rajdhani font-semibold flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* DISTINCTIVE COMMAND STAGE */}
      {!isCallActive && messages.length === 0 ? (
        /* Widescreen Integrated Pre-Call Intelligence Stage */
        <div className="architect-stage rounded-3xl p-5 sm:p-6 space-y-5 relative overflow-hidden">
          {/* Subtle Ambient Radial Flare */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF2A55]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Stage Header Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src="/logo.png"
                  alt="Alex Voice Specialist"
                  className="w-9 h-9 rounded-lg object-cover bg-black border border-white/10"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00E5FF] border-2 border-[#080A10]" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-orbitron font-extrabold text-white">Alex · Voice Executive</div>
                <div className="text-[11px] font-rajdhani text-slate-400 font-semibold">Conversational AI for {currentProductObj.name}</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-[#00E5FF]" />
                <span>&lt;450ms Latency</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-[#FF2A55]" />
                <span>Real-Time Barge-in</span>
              </span>
              <span className="flex items-center gap-1.5 hidden md:flex">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>Synchronized Audio</span>
              </span>
            </div>
          </div>

          {/* Central Acoustic Core & Primary Hero CTA */}
          <div className="flex flex-col items-center justify-center text-center space-y-3 relative z-10">
            <div className="relative">
              <RobotAvatar
                state={callState}
                audioLevel={audioLevel}
                size={220}
              />
            </div>

            {/* Simulated Live Equalizer Frequency Spectrum */}
            <div className="flex items-center gap-1.5 h-5 px-3 py-0.5 rounded-full bg-black/60 border border-white/10">
              <span className="w-1 h-2.5 bg-[#FF2A55] rounded-full opacity-60" />
              <span className="w-1 h-3.5 bg-[#00E5FF] rounded-full opacity-70" />
              <span className="w-1 h-2 bg-[#FF2A55] rounded-full opacity-40" />
              <span className="w-1 h-4 bg-[#00E5FF] rounded-full opacity-80" />
              <span className="w-1 h-2.5 bg-[#FF2A55] rounded-full opacity-60" />
              <span className="text-[9px] font-mono text-slate-400 ml-2 uppercase tracking-wider">
                Acoustic Standby // Ready
              </span>
            </div>

            {/* UNMISSABLE HERO CTA */}
            <div className="w-full max-w-sm pt-1">
              <button
                onClick={handleStartClick}
                className="hero-primary-cta w-full py-3 px-5 rounded-xl flex items-center justify-center gap-3 cursor-pointer font-orbitron font-black text-xs sm:text-sm tracking-widest uppercase"
              >
                <div className="w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center">
                  <PhoneCall className="w-3.5 h-3.5 text-white fill-current animate-pulse" />
                </div>
                <span>Start Voice Call With Alex</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
              <div className="text-[10px] font-mono text-slate-400 text-center mt-1.5">
                1-Click instant stream • Sub-450ms human cadence • Zero login required
              </div>
            </div>
          </div>

          {/* Direct Interactive Test Directives (Sleek horizontal grid, NO Russian-doll cards) */}
          <div className="relative z-10 pt-4 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Or select an instant customer scenario to test:
              </span>
              <span className="text-[10px] font-mono text-[#00E5FF]">
                DIRECT LAUNCH READY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div
                onClick={handleStartClick}
                className="directive-strip p-3.5 rounded-xl cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-orbitron font-bold text-white mb-1 group-hover:text-[#FF2A55] transition-colors">
                    <span>1. Pro Trial &amp; Pricing</span>
                    <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#FF2A55] transition-colors" />
                  </div>
                  <p className="text-xs font-rajdhani text-slate-300 font-semibold line-clamp-2">
                    Inquire pricing, challenge with budget objection, then agree to start 14-day Pro trial.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-[#FF2A55] mt-2 font-bold flex items-center gap-1">
                  <span>TEST CONVERSION</span> &rarr;
                </div>
              </div>

              <div
                onClick={handleStartClick}
                className="directive-strip p-3.5 rounded-xl cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-orbitron font-bold text-white mb-1 group-hover:text-[#00E5FF] transition-colors">
                    <span>2. Schedule Live Demo</span>
                    <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#00E5FF] transition-colors" />
                  </div>
                  <p className="text-xs font-rajdhani text-slate-300 font-semibold line-clamp-2">
                    Ask how FlowDesk integrates with Zendesk, then request a 15-minute live team demo.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-[#00E5FF] mt-2 font-bold flex items-center gap-1">
                  <span>TEST INTEGRATIONS</span> &rarr;
                </div>
              </div>

              <div
                onClick={handleStartClick}
                className="directive-strip p-3.5 rounded-xl cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-orbitron font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">
                    <span>3. Deflection Follow-Up</span>
                    <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                  <p className="text-xs font-rajdhani text-slate-300 font-semibold line-clamp-2">
                    Inquire about 70% deflection metrics, then request follow-up email and callback next week.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-amber-400 mt-2 font-bold flex items-center gap-1">
                  <span>TEST RETENTION</span> &rarr;
                </div>
              </div>

              <div
                onClick={() => {
                  onSelectLanguage('hi');
                  handleStartClick();
                }}
                className="directive-strip p-3.5 rounded-xl cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-orbitron font-bold text-white mb-1 group-hover:text-[#A855F7] transition-colors">
                    <span>4. हिन्दी Conversation</span>
                    <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#A855F7] transition-colors" />
                  </div>
                  <p className="text-xs font-rajdhani text-slate-300 font-semibold line-clamp-2">
                    Switch to natural SwaraNeural Hindi speech mode with native regional sales responses.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-[#A855F7] mt-2 font-bold flex items-center gap-1">
                  <span>TEST HINDI AI</span> &rarr;
                </div>
              </div>
            </div>
          </div>

          {/* Clean Metric Baseline Ribbon (Grounding Telemetry) */}
          <div className="pt-4 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-2">
              <div className="text-base font-orbitron font-black text-white">70%</div>
              <div className="text-[11px] font-rajdhani text-slate-400 font-semibold">Instant Ticket Deflection</div>
            </div>
            <div className="p-2">
              <div className="text-base font-orbitron font-black text-white">&lt;450ms</div>
              <div className="text-[11px] font-rajdhani text-slate-400 font-semibold">Human Speech Latency</div>
            </div>
            <div className="p-2">
              <div className="text-base font-orbitron font-black text-white">Shopify &amp; CRM</div>
              <div className="text-[11px] font-rajdhani text-slate-400 font-semibold">Unified Inbox Sync</div>
            </div>
            <div className="p-2">
              <div className="text-base font-orbitron font-black text-white">Human HITL</div>
              <div className="text-[11px] font-rajdhani text-slate-400 font-semibold">Frictionless Escalation</div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Conversation Cockpit (Live Transcript + Visualizer) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
          {/* Left Column: Visualizer & Call Controls */}
          <div className="lg:col-span-5 architect-stage rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <StatusBadge state={callState} durationSec={durationSec} />
              <div className="text-[10px] font-mono text-[#00E5FF] uppercase tracking-wider">
                ● LIVE TRANSMISSION
              </div>
            </div>

            <div className="py-4 flex flex-col items-center justify-center">
              <RobotAvatar
                state={callState}
                audioLevel={audioLevel}
                size={210}
              />
              <p className="text-xs font-rajdhani font-semibold text-slate-300 mt-3 text-center max-w-xs">
                {callState === 'speaking'
                  ? 'Alex is speaking. Speak at any moment or click Barge-in.'
                  : callState === 'listening'
                    ? 'Microphone active. Alex is listening to your voice...'
                    : callState === 'thinking'
                      ? 'Synthesizing verified knowledge response...'
                      : callState === 'connecting'
                        ? 'Establishing secure voice channel...'
                        : callState === 'ended'
                          ? 'Call concluded. Post-call analysis complete.'
                          : 'Initializing session...'}
              </p>
            </div>

            {callState === 'ended' ? (
              <div className="pt-3 border-t border-white/5 space-y-2">
                <button
                  onClick={resetCall}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#FF2A55] to-[#FF4B72] hover:opacity-95 text-white font-orbitron text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#FF2A55]/30"
                >
                  <RotateCcw className="w-4 h-4" />
                  Start New Call / Reset Terminal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={handleBargeIn}
                  disabled={callState !== 'speaking'}
                  title="Interrupt bot and speak now"
                  className="py-3 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-orbitron text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Hand className="w-4 h-4" />
                  Barge-In
                </button>

                <button
                  onClick={() => endCall('user_ended')}
                  disabled={isFinalizing}
                  title="End the call"
                  className="py-3 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/50 text-rose-300 font-orbitron text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PhoneOff className={`w-4 h-4 ${isFinalizing ? 'animate-spin' : ''}`} />
                  {isFinalizing ? 'Saving...' : 'End Call'}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Live Streaming Transcript */}
          <div className="lg:col-span-7 flex flex-col h-[500px]">
            <LiveTranscript
              messages={messages}
              interimMessage={interimText}
            />
          </div>
        </div>
      )}

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
        <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-orbitron font-extrabold uppercase tracking-widest text-[#00E5FF]">
              Session Wrap-Up & Intelligence Dossier
            </span>
            <button
              onClick={resetCall}
              className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-orbitron font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#FF2A55]" />
              Start Next Call
            </button>
          </div>
          <SummaryCard analysis={analysis} />
          {callId && (
            <AudioPlayer
              src={`${API_BASE}/api/recordings/${callId}.webm`}
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
