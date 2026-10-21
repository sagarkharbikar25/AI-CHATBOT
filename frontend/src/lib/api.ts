import type { Product, CallRecord, CallAnalysis } from '../types';

export const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

export function getSessionId(): string {
  let sessionId = localStorage.getItem('flowdesk_voice_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem('flowdesk_voice_session_id', sessionId);
  }
  return sessionId;
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/api/products`);
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}

export async function createCall(productId: string, language: string, consentGiven: boolean): Promise<{
  call_id: string;
  ws_token: string;
  ws_url: string;
}> {
  const sessionId = getSessionId();
  const res = await fetch(`${API_BASE}/api/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      product_id: productId,
      language,
      consent_given: consentGiven,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create call' }));
    throw new Error(err.detail || 'Failed to create call');
  }
  return res.json();
}

export async function uploadRecording(callId: string, blob: Blob): Promise<{ recording_url: string }> {
  const formData = new FormData();
  formData.append('file', blob, `${callId}.webm`);
  const res = await fetch(`${API_BASE}/api/calls/${callId}/recording`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload recording');
  return res.json();
}

export async function finalizeCall(callId: string, endReason: string, durationSec: number): Promise<{
  analysis: CallAnalysis;
  call: CallRecord;
}> {
  const res = await fetch(`${API_BASE}/api/calls/${callId}/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      end_reason: endReason,
      duration_sec: durationSec,
    }),
  });
  if (!res.ok) throw new Error('Failed to finalize call');
  return res.json();
}

export async function fetchCalls(): Promise<CallRecord[]> {
  const sessionId = getSessionId();
  const res = await fetch(`${API_BASE}/api/calls?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error('Failed to fetch calls');
  return res.json();
}

export async function fetchCallDetail(callId: string): Promise<CallRecord> {
  const res = await fetch(`${API_BASE}/api/calls/${callId}`);
  if (!res.ok) throw new Error('Failed to fetch call detail');
  return res.json();
}

export async function deleteCall(callId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/calls/${callId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete call');
}

export async function reanalyzeCall(callId: string): Promise<CallAnalysis> {
  const res = await fetch(`${API_BASE}/api/calls/${callId}/reanalyze`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reanalyze call');
  const data = await res.json();
  return data.analysis;
}
