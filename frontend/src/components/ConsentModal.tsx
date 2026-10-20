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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl glass-panel-elevated p-7 border border-white/15 shadow-2xl">
        {/* Glow orb */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00F5A0]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#00F5A0]/10 border border-[#00F5A0]/30 flex items-center justify-center text-[#00F5A0]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-white tracking-tight">
              Voice Session Authorization
            </h2>
            <p className="text-xs text-slate-400 font-reading">
              Mandatory compliance requirement before audio connection
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6 text-sm text-slate-300 font-reading leading-relaxed">
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
              <Lock className="w-3.5 h-3.5 text-[#00D9F5]" />
              Data Privacy & Recording Terms
            </div>
            <p className="text-xs text-slate-400">
              This interactive call with {productName}&apos;s AI agent will capture synchronized audio from both your microphone and the synthesized voice. The session is analyzed to generate structured requirements, objection resolution, and sales next steps.
            </p>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Best acoustic experience: Use headphones in a quiet environment to facilitate real-time turn-taking and natural barge-in interruption.
            </span>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#00F5A0]/40 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 text-[#00F5A0] focus:ring-[#00F5A0] focus:ring-offset-slate-900 accent-[#00F5A0]"
            />
            <span className="text-xs text-slate-200">
              I consent to this voice conversation being recorded, transcribed, and analyzed by the AI pipeline for quality assurance and follow-up.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-reading"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!agreed}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider font-display transition-all duration-200 ${
              agreed
                ? 'bg-gradient-to-r from-[#00F5A0] to-[#00D9F5] text-slate-950 glow-mint hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
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
