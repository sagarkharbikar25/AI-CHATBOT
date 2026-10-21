import React, { useState } from 'react';
import { ShieldCheck, Mic, Lock, AlertCircle, ArrowRight } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  productName?: string;
  language?: string;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  productName = 'FlowDesk',
}) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#161820] to-[#0E1015] p-7 border border-slate-700/70 shadow-2xl">
        {/* Glow orb */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FF2A55]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#FF2A55]/10 border border-[#FF2A55]/40 flex items-center justify-center text-[#FF2A55] shadow-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-orbitron font-extrabold text-white tracking-wider uppercase">
              Voice Session Authorization
            </h2>
            <p className="text-xs text-slate-400 font-rajdhani font-medium tracking-wide">
              Mandatory compliance requirement before audio connection
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6 text-sm text-slate-300 font-rajdhani leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-slate-200 uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-[#00D9F5]" />
              Data Privacy & Recording Terms
            </div>
            <p className="text-xs text-slate-400 font-rajdhani leading-relaxed">
              This interactive call with {productName}&apos;s AI agent will capture synchronized audio from both your microphone and the synthesized voice. The session is analyzed to generate structured requirements, objection resolution, and sales next steps.
            </p>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-rajdhani font-medium">
              Best acoustic experience: Use headphones in a quiet environment to facilitate real-time turn-taking and natural barge-in interruption.
            </span>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#FF2A55]/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 text-[#FF2A55] focus:ring-[#FF2A55] focus:ring-offset-slate-900 accent-[#FF2A55]"
            />
            <span className="text-xs text-slate-200 font-rajdhani font-medium leading-relaxed">
              I consent to this voice conversation being recorded, transcribed, and analyzed by the AI pipeline for quality assurance and follow-up.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg text-xs font-orbitron font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!agreed}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-orbitron font-extrabold uppercase tracking-wider transition-all duration-200 ${
              agreed
                ? 'bg-gradient-to-r from-[#FF2A55] to-[#FF003C] hover:from-[#FF476E] hover:to-[#FF1744] text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
            style={agreed ? { boxShadow: '0 0 25px rgba(255, 42, 85, 0.4)' } : undefined}
          >
            <Mic className="w-4 h-4" />
            Authorize & Launch Call
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
