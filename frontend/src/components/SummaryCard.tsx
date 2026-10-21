import React from 'react';
import type { CallAnalysis } from '../types';
import { getStatusDisplay } from '../lib/status';
import { 
  Quote, ListChecks, ShieldAlert, Sparkles, RefreshCw
} from 'lucide-react';

interface SummaryCardProps {
  analysis: CallAnalysis;
  onReanalyze?: () => void;
  isReanalyzing?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  analysis,
  onReanalyze,
  isReanalyzing = false,
}) => {
  const statusInfo = getStatusDisplay(analysis.status);
  const confidencePercent = Math.round((analysis.confidence || 0.8) * 100);

  return (
    <div className="mecha-chassis animate-in fade-in duration-300">
      <div className="mecha-inner p-6 space-y-6">
        {/* Header with Status & Confidence */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF2A55]" />
              <span className="text-xs font-orbitron font-extrabold uppercase tracking-widest text-slate-300">
                Post-Call Intelligence Dossier
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-orbitron font-bold uppercase tracking-wider ${statusInfo.color}`}>
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] font-orbitron uppercase tracking-wider text-slate-400 block font-bold">
                Auditor Confidence
              </span>
              <span className="text-xl font-numeric font-extrabold text-white tracking-tight">
                {confidencePercent}%
              </span>
            </div>

            {onReanalyze && (
              <button
                onClick={onReanalyze}
                disabled={isReanalyzing}
                title="Re-run post-call analysis"
                className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isReanalyzing ? 'animate-spin text-[#FF2A55]' : ''}`} />
              </button>
            )}
          </div>
        </div>

      {/* Summary Narrative */}
      <div className="space-y-2">
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
          Executive Recap
        </h4>
        <p className="text-sm font-reading text-slate-200 leading-relaxed bg-slate-900/40 p-4 rounded-2xl border border-white/5">
          {analysis.summary}
        </p>
      </div>

      {/* Status Evidence Quote */}
      {analysis.status_evidence && (
        <div className="p-4 rounded-2xl bg-[#00D9F5]/5 border border-[#00D9F5]/20 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#00D9F5] font-semibold">
            <Quote className="w-3.5 h-3.5" /> Verifiable Customer Evidence Quote
          </div>
          <p className="text-xs font-reading italic text-slate-200 pl-2 border-l-2 border-[#00D9F5]/50">
            &ldquo;{analysis.status_evidence}&rdquo;
          </p>
          <p className="text-[11px] text-slate-400 font-reading pt-1">
            <strong>Rationale:</strong> {analysis.status_reason}
          </p>
        </div>
      )}

      {/* Grid: Requirements, Objections, Next Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Customer Requirements */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            <ListChecks className="w-3.5 h-3.5 text-[#00F5A0]" />
            Requirements
          </div>
          {analysis.customer_requirements.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-300 font-reading">
              {analysis.customer_requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-[#00F5A0] mt-0.5">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-slate-500 italic font-reading">No specific requirements stated</span>
          )}
        </div>

        {/* Objections Handled */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Objections Handled
          </div>
          {analysis.objections && analysis.objections.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300 font-reading">
              {analysis.objections.map((obj, i) => (
                <li key={i} className="p-2 rounded-lg bg-black/20 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">{obj.text}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      obj.resolved 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {obj.resolved ? 'Resolved' : 'Pending'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-slate-500 italic font-reading">No objections recorded</span>
          )}
        </div>

        {/* Next Steps */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#00D9F5]" />
            Actionable Next Steps
          </div>
          {analysis.next_steps && analysis.next_steps.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-300 font-reading">
              {analysis.next_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-[#00D9F5] mt-0.5">→</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-slate-500 italic font-reading">No specific next steps</span>
          )}
        </div>
      </div>
    </div>
  </div>
);
};
