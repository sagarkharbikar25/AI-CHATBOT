import type { SalesStatus } from '../types';
import { 
  CheckCircle, Calendar, PhoneForwarded, ThumbsUp, XCircle, 
  HelpCircle 
} from 'lucide-react';

export const getStatusDisplay = (status: SalesStatus | string) => {
  switch (status) {
    case 'converted':
      return {
        label: 'Converted (Signed Up)',
        color: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 glow-mint',
        icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
        desc: 'Customer explicitly agreed to trial or paid plan activation.',
      };
    case 'demo_requested':
      return {
        label: 'Demo Requested',
        color: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 glow-cyan',
        icon: <Calendar className="w-4 h-4 text-cyan-400" />,
        desc: 'Customer scheduled or requested a dedicated live product demo.',
      };
    case 'follow_up_required':
      return {
        label: 'Follow-up Required',
        color: 'bg-amber-500/15 border-amber-500/40 text-amber-300 glow-amber',
        icon: <PhoneForwarded className="w-4 h-4 text-amber-400" />,
        desc: 'Stakeholder consultation needed or follow-up requested.',
      };
    case 'interested':
      return {
        label: 'Interested (Exploratory)',
        color: 'bg-violet-500/15 border-violet-500/40 text-violet-300',
        icon: <ThumbsUp className="w-4 h-4 text-violet-400" />,
        desc: 'Engaged and asked questions with no concrete commitment.',
      };
    case 'not_interested':
      return {
        label: 'Not Interested',
        color: 'bg-rose-500/15 border-rose-500/40 text-rose-300 glow-crimson',
        icon: <XCircle className="w-4 h-4 text-rose-400" />,
        desc: 'Explicit rejection or content with current software.',
      };
    case 'no_response':
    default:
      return {
        label: 'No Response',
        color: 'bg-slate-700/30 border-slate-600/40 text-slate-400',
        icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
        desc: 'Fewer than two customer utterances detected.',
      };
  }
};
