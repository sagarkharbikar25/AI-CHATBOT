import React from 'react';
import type { CallRecord } from '../types';
import { X, Calendar, Clock, Bot, User, Trash2 } from 'lucide-react';
import { SummaryCard } from './SummaryCard';
import { getStatusDisplay } from '../lib/status';
import { AudioPlayer } from './AudioPlayer';
import { API_BASE } from '../lib/api';

interface DetailModalProps {
  call: CallRecord | null;
  onClose: () => void;
  onDelete?: (callId: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ call, onClose, onDelete }) => {
  if (!call) return null;

  const statusInfo = getStatusDisplay(call.sales_status || 'no_response');
  const formattedDate = new Date(call.started_at).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl glass-panel-elevated p-6 border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold font-display text-white">
                Call Intelligence Review
              </span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider font-reading ${statusInfo.color}`}>
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {call.duration_sec || 0}s duration
              </span>
              <span className="uppercase text-slate-300">
                Language: {call.language}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm('Delete this call record and recording?')) {
                    onDelete(call.id);
                    onClose();
                  }
                }}
                className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                title="Delete call"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
          {/* Synchronized Audio Player */}
          {(call.recording_url || call.recording_path) ? (() => {
            const rawSrc = (call.recording_url || call.recording_path || '');
            const audioSrc = rawSrc.startsWith('http') || !API_BASE ? rawSrc : `${API_BASE}${rawSrc}`;
            return <AudioPlayer src={audioSrc} title="Session Recording (Synchronized Dual Voice)" />;
          })() : (
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-white/5 text-xs text-slate-500 font-reading text-center">
              Recording not stored for this session.
            </div>
          )}

          {/* Analysis Dossier */}
          {call.summary && (
            <SummaryCard
              analysis={{
                summary: call.summary,
                customer_requirements: call.requirements || [],
                objections: call.objections || [],
                next_steps: call.next_steps || [],
                status: call.sales_status || 'no_response',
                status_reason: call.status_reason || '',
                status_evidence: call.status_evidence || '',
                confidence: call.analysis_confidence || 0.85,
              }}
            />
          )}

          {/* Transcript Dialogue */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Complete Session Transcript
            </h4>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 space-y-3 max-h-72 overflow-y-auto">
              {call.messages && call.messages.length > 0 ? (
                call.messages.map((m, idx) => {
                  const isBot = m.role === 'bot';
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}
                    >
                      {isBot && (
                        <div className="w-6 h-6 rounded-md bg-[#00F5A0]/10 border border-[#00F5A0]/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-[#00F5A0]" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-xl px-3.5 py-2 text-xs font-reading ${
                          isBot
                            ? 'glass-bubble-bot text-slate-100'
                            : 'glass-bubble-user text-slate-100'
                        }`}
                      >
                        <span className="text-[10px] font-mono text-slate-400 block mb-0.5 font-semibold uppercase">
                          {isBot ? 'Alex' : 'Customer'}
                        </span>
                        <p className="leading-relaxed">{m.text}</p>
                      </div>
                      {!isBot && (
                        <div className="w-6 h-6 rounded-md bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 italic">No messages stored for this call.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
