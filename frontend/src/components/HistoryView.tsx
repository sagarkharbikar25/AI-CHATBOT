import React, { useState, useEffect } from 'react';
import type { CallRecord } from '../types';
import { fetchCalls, fetchCallDetail, deleteCall } from '../lib/api';
import { getStatusDisplay } from '../lib/status';
import { DetailModal } from './DetailModal';
import { History, Play, Trash2, ArrowUpRight, Clock, Calendar, RefreshCw } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchCalls();
      setCalls(data);
    } catch (e) {
      console.error('Failed to load call history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetchCalls()
      .then((data) => {
        if (!ignore) {
          setCalls(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load call history', err);
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenDetail = async (callId: string) => {
    try {
      const detail = await fetchCallDetail(callId);
      setSelectedCall(detail);
    } catch (e) {
      console.error('Failed to load detail', e);
    }
  };

  const handleDelete = async (callId: string) => {
    try {
      await deleteCall(callId);
      setCalls((prev) => prev.filter((c) => c.id !== callId));
    } catch (e) {
      console.error('Failed to delete call', e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
            <History className="w-5 h-5 text-[#00F5A0]" />
            Session Archives & Sales Audits
          </h2>
          <p className="text-xs text-slate-400 font-reading mt-0.5">
            Historical calls, synchronized audio recordings, and classified sales outcomes.
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-xs font-semibold text-slate-300 hover:text-white transition-all font-reading"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00F5A0]' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Calls Table / Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 font-reading text-sm animate-pulse">
          Loading archived sessions...
        </div>
      ) : calls.length === 0 ? (
        <div className="py-20 rounded-3xl glass-panel text-center p-8 border border-white/5 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/50 mx-auto flex items-center justify-center text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <p className="text-sm font-reading font-medium text-slate-300">
            No voice calls recorded in this session yet.
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Initiate a call from the terminal screen to test discovery, objection handling, and automatic post-call categorization.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {calls.map((call) => {
            const statusInfo = getStatusDisplay(call.sales_status || 'no_response');
            const dateStr = new Date(call.started_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={call.id}
                onClick={() => handleOpenDetail(call.id)}
                className="group relative rounded-2xl glass-panel p-4 border border-white/10 hover:border-white/25 hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider font-reading ${statusInfo.color}`}>
                      {statusInfo.icon}
                      <span>{statusInfo.label}</span>
                    </div>

                    <span className="text-xs font-mono uppercase text-slate-400">
                      {call.product_id} • {call.language.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-reading line-clamp-1 max-w-xl">
                    {call.summary || 'Call concluded without detailed summary.'}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {dateStr}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {call.duration_sec || 0}s
                    </span>
                    {call.status_evidence && (
                      <span className="text-[#00D9F5]/80 italic line-clamp-1">
                        &ldquo;{call.status_evidence}&rdquo;
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetail(call.id);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition-colors font-reading"
                  >
                    <Play className="w-3 h-3 text-[#00F5A0]" />
                    Review
                    <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this call record?')) {
                        handleDelete(call.id);
                      }
                    }}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete call"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Call Detail Modal */}
      <DetailModal
        call={selectedCall}
        onClose={() => setSelectedCall(null)}
        onDelete={handleDelete}
      />
    </div>
  );
};
