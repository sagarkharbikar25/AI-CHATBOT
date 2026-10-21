import React, { useEffect, useRef } from 'react';
import type { TranscriptMessage } from '../types';
import { Bot, User, Ban, MessageSquare } from 'lucide-react';

interface LiveTranscriptProps {
  messages: TranscriptMessage[];
  interimMessage?: { role: 'bot' | 'customer'; text: string } | null;
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  messages,
  interimMessage,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimMessage]);

  return (
    <div className="flex flex-col h-full rounded-2xl bg-gradient-to-b from-[#14161C] to-[#0D0E12] p-4 overflow-hidden border border-slate-700/60 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#FF2A55]" />
          <h3 className="text-xs font-orbitron font-extrabold text-white tracking-wider uppercase">
            Live Telemetry Stream
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#00D9F5] uppercase tracking-widest px-2 py-0.5 rounded bg-[#00D9F5]/10 border border-[#00D9F5]/30 font-semibold">
          {messages.length} Utterances
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-2 scroll-smooth"
      >
        {messages.length === 0 && !interimMessage && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-[#FF2A55]" />
            </div>
            <p className="text-xs font-orbitron font-bold uppercase tracking-wider text-slate-300">
              Dialogue Stream Ready
            </p>
            <p className="text-xs font-rajdhani text-slate-400 mt-1 max-w-xs leading-relaxed">
              Real-time speech synthesis and acoustic barge-in active.
            </p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isBot = msg.role === 'bot';
          return (
            <div
              key={index}
              className={`flex items-start gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
            >
              {isBot && (
                <div className="w-7 h-7 rounded-lg bg-[#FF2A55]/10 border border-[#FF2A55]/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-[#FF2A55]" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-xl px-4 py-2.5 text-sm font-rajdhani shadow-lg transition-all duration-200 ${
                  isBot
                    ? 'bg-slate-900/90 border border-white/10 text-slate-100'
                    : 'bg-[#FF2A55]/10 border border-[#FF2A55]/30 text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    {isBot ? 'Alex (FlowDesk)' : 'Customer'}
                  </span>
                  {msg.interrupted && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">
                      <Ban className="w-2.5 h-2.5" /> Interrupted
                    </span>
                  )}
                </div>
                <p className="leading-relaxed text-[13.5px]">{msg.text}</p>
              </div>

              {!isBot && (
                <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-[#8B5CF6]" />
                </div>
              )}
            </div>
          );
        })}

        {/* Interim Streaming Speech Bubble */}
        {interimMessage && (
          <div
            className={`flex items-start gap-3 ${
              interimMessage.role === 'bot' ? 'justify-start' : 'justify-end'
            }`}
          >
            {interimMessage.role === 'bot' && (
              <div className="w-7 h-7 rounded-lg bg-[#00F5A0]/20 border border-[#00F5A0]/40 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4 text-[#00F5A0]" />
              </div>
            )}

            <div
              className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm font-reading opacity-90 border border-dashed ${
                interimMessage.role === 'bot'
                  ? 'bg-[#00F5A0]/5 border-[#00F5A0]/40 text-slate-200 rounded-tl-sm'
                  : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/40 text-slate-200 rounded-tr-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  {interimMessage.role === 'bot' ? 'Alex (Streaming)' : 'Speaking...'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D9F5] animate-ping" />
              </div>
              <p className="leading-relaxed text-[13.5px] italic shimmer-text">
                {interimMessage.text}
              </p>
            </div>

            {interimMessage.role !== 'bot' && (
              <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center shrink-0 animate-pulse">
                <User className="w-4 h-4 text-[#8B5CF6]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
