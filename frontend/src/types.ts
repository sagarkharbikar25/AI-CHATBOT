export type SalesStatus = 
  | 'converted' 
  | 'interested' 
  | 'follow_up_required' 
  | 'not_interested' 
  | 'demo_requested' 
  | 'no_response';

export type CallState = 
  | 'idle' 
  | 'connecting' 
  | 'listening' 
  | 'thinking' 
  | 'speaking' 
  | 'ended';

export interface Product {
  id: string;
  name: string;
  tagline: string;
  one_liner: string;
  languages: string[];
}

export interface TranscriptMessage {
  id?: number;
  seq: number;
  role: 'bot' | 'customer';
  text: string;
  final: boolean;
  interrupted?: boolean;
}

export interface Objection {
  text: string;
  resolved: boolean;
}

export interface CallAnalysis {
  summary: string;
  customer_requirements: string[];
  objections: Objection[];
  next_steps: string[];
  status: SalesStatus;
  status_reason: string;
  status_evidence: string;
  confidence: number;
}

export interface CallRecord {
  id: string;
  session_id: string;
  product_id: string;
  language: string;
  call_state: string;
  end_reason?: string;
  consent_given: boolean;
  consent_at: string;
  started_at: string;
  ended_at?: string;
  duration_sec?: number;
  recording_path?: string;
  recording_url?: string;
  recording_mime?: string;
  summary?: string;
  requirements?: string[];
  objections?: Objection[];
  next_steps?: string[];
  sales_status?: SalesStatus;
  status_reason?: string;
  status_evidence?: string;
  analysis_confidence?: number;
  messages?: TranscriptMessage[];
}
