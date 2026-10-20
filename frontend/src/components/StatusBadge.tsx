import React from 'react';
import type { CallState } from '../types';
import { Radio, Mic, Sparkles, Volume2, CheckCircle2, Clock } from 'lucide-react';

interface StatusBadgeProps {
  state: CallState;
  durationSec?: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state, durationSec = 0 }) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getBadgeConfig = () => {
    switch (state) {
      case 'connecting':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-400 animate-ping',
          icon: <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />,
          label: 'Connecting...',
        };
      case 'listening':
        return {
          bg: 'bg-[#00D9F5]/10 border-[#00D9F5]/30 text-[#00D9F5] glow-cyan',
          dot: 'bg-[#00D9F5] animate-pulse',
          icon: <Mic className="w-3.5 h-3.5 text-[#00D9F5]" />,
          label: 'Listening (Speak now)',
        };
      case 'thinking':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300 glow-amber',
          dot: 'bg-amber-400 animate-spin',
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />,
          label: 'Synthesizing response...',
        };
      case 'speaking':
        return {
          bg: 'bg-[#00F5A0]/10 border-[#00F5A0]/30 text-[#00F5A0] glow-mint',
          dot: 'bg-[#00F5A0] animate-ping',
          icon: <Volume2 className="w-3.5 h-3.5 text-[#00F5A0]" />,
          label: 'Alex Speaking',
        };
      case 'ended':
        return {
          bg: 'bg-slate-800/60 border-slate-700 text-slate-300',
          dot: 'bg-slate-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />,
          label: 'Call Concluded',
        };
      default:
        return {
          bg: 'bg-slate-800/40 border-slate-700/60 text-slate-400',
          dot: 'bg-slate-500',
          icon: <Radio className="w-3.5 h-3.5 text-slate-500" />,
          label: 'Ready to connect',
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md transition-all duration-300 ${badge.bg}`}>
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${badge.dot}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${badge.dot.split(' ')[0]}`} />
        </span>
        {badge.icon}
        <span className="text-xs font-semibold tracking-wide uppercase font-reading">{badge.label}</span>
      </div>

      {state !== 'idle' && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800/80 text-slate-300 font-numeric text-xs font-semibold tracking-wider">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{formatTime(durationSec)}</span>
        </div>
      )}
    </div>
  );
};
