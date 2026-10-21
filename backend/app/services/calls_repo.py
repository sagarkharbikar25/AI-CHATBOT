import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from backend.app.config import settings
from backend.app.db import get_connection

logger = logging.getLogger(__name__)

class CallsRepository:
    @staticmethod
    def _get_supabase_headers() -> Optional[Dict[str, str]]:
        try:
            url = getattr(settings, "SUPABASE_URL", "")
            key = getattr(settings, "SUPABASE_SECRET_KEY", "") or getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")
            if url and key:
                return {
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                }
        except Exception:
            pass
        return None

    @staticmethod
    def create_call(call_id: str, session_id: str, product_id: str, language: str, consent_given: bool) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO calls (id, session_id, product_id, language, call_state, consent_given, consent_at, started_at)
            VALUES (?, ?, ?, ?, 'in_progress', ?, ?, ?)
        """, (call_id, session_id, product_id, language, 1 if consent_given else 0, now_iso, now_iso))
        conn.commit()
        conn.close()

        # Optional Supabase async sync
        headers = CallsRepository._get_supabase_headers()
        if headers and settings.SUPABASE_URL:
            try:
                payload = {
                    "id": call_id,
                    "session_id": session_id,
                    "product_id": product_id,
                    "language": language,
                    "call_state": "in_progress",
                    "consent_given": consent_given,
                    "consent_at": now_iso,
                    "started_at": now_iso
                }
                httpx.post(f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/calls", headers=headers, json=payload, timeout=3.0)
            except Exception as e:
                logger.debug(f"Supabase call sync note: {e}")

        return {
            "id": call_id,
            "session_id": session_id,
            "product_id": product_id,
            "language": language,
            "call_state": "in_progress",
            "consent_given": consent_given,
            "started_at": now_iso
        }

    @staticmethod
    def get_call(call_id: str) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM calls WHERE id = ?", (call_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["consent_given"] = bool(d["consent_given"])
        d["requirements"] = json.loads(d["requirements"] or "[]")
        d["objections"] = json.loads(d["objections"] or "[]")
        d["next_steps"] = json.loads(d["next_steps"] or "[]")
        d["recording_url"] = d.get("recording_path")
        return d

    @staticmethod
    def list_calls_by_session(session_id: str) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM calls WHERE session_id = ? ORDER BY started_at DESC
        """, (session_id,))
        rows = cursor.fetchall()
        conn.close()
        results = []
        for row in rows:
            d = dict(row)
            d["consent_given"] = bool(d["consent_given"])
            d["requirements"] = json.loads(d["requirements"] or "[]")
            d["objections"] = json.loads(d["objections"] or "[]")
            d["next_steps"] = json.loads(d["next_steps"] or "[]")
            d["recording_url"] = d.get("recording_path")
            results.append(d)
        return results

    @staticmethod
    def add_message(call_id: str, seq: int, role: str, text: str, 
                    t_start_ms: Optional[int] = None, t_end_ms: Optional[int] = None, 
                    interrupted: bool = False) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO messages (call_id, seq, role, text, t_start_ms, t_end_ms, interrupted)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (call_id, seq, role, text, t_start_ms, t_end_ms, 1 if interrupted else 0))
        conn.commit()
        conn.close()

        # Optional Supabase sync
        headers = CallsRepository._get_supabase_headers()
        if headers and settings.SUPABASE_URL:
            try:
                payload = {
                    "call_id": call_id,
                    "seq": seq,
                    "role": role,
                    "text": text,
                    "interrupted": interrupted
                }
                httpx.post(f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/messages", headers=headers, json=payload, timeout=3.0)
            except Exception as e:
                logger.debug(f"Supabase message sync note: {e}")

    @staticmethod
    def get_messages(call_id: str) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM messages WHERE call_id = ? ORDER BY seq ASC
        """, (call_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            {
                "id": r["id"],
                "call_id": r["call_id"],
                "seq": r["seq"],
                "role": r["role"],
                "text": r["text"],
                "t_start_ms": r["t_start_ms"],
                "t_end_ms": r["t_end_ms"],
                "interrupted": bool(r["interrupted"])
            }
            for r in rows
        ]

    @staticmethod
    def update_call_recording(call_id: str, recording_path: str, recording_mime: str) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE calls 
            SET recording_path = ?, recording_mime = ?
            WHERE id = ?
        """, (recording_path, recording_mime, call_id))
        conn.commit()
        conn.close()

        headers = CallsRepository._get_supabase_headers()
        if headers and settings.SUPABASE_URL:
            try:
                httpx.patch(
                    f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/calls?id=eq.{call_id}",
                    headers=headers,
                    json={"recording_path": recording_path, "recording_mime": recording_mime},
                    timeout=3.0
                )
            except Exception as e:
                logger.debug(f"Supabase update recording note: {e}")

    @staticmethod
    def finalize_call(call_id: str, end_reason: str, duration_sec: int, analysis: Dict[str, Any]) -> None:
        now_iso = datetime.now(timezone.utc).isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE calls 
            SET call_state = 'completed',
                end_reason = ?,
                ended_at = ?,
                duration_sec = ?,
                summary = ?,
                requirements = ?,
                objections = ?,
                next_steps = ?,
                sales_status = ?,
                status_reason = ?,
                status_evidence = ?,
                analysis_confidence = ?
            WHERE id = ?
        """, (
            end_reason,
            now_iso,
            duration_sec,
            analysis.get("summary", ""),
            json.dumps(analysis.get("customer_requirements", [])),
            json.dumps(analysis.get("objections", [])),
            json.dumps(analysis.get("next_steps", [])),
            analysis.get("status", "follow_up_required"),
            analysis.get("status_reason", ""),
            analysis.get("status_evidence", ""),
            analysis.get("confidence", 0.8),
            call_id
        ))
        conn.commit()
        conn.close()

        headers = CallsRepository._get_supabase_headers()
        if headers and settings.SUPABASE_URL:
            try:
                payload = {
                    "call_state": "completed",
                    "end_reason": end_reason,
                    "ended_at": now_iso,
                    "duration_sec": duration_sec,
                    "summary": analysis.get("summary", ""),
                    "requirements": analysis.get("customer_requirements", []),
                    "objections": analysis.get("objections", []),
                    "next_steps": analysis.get("next_steps", []),
                    "sales_status": analysis.get("status", "follow_up_required"),
                    "status_reason": analysis.get("status_reason", ""),
                    "status_evidence": analysis.get("status_evidence", ""),
                    "analysis_confidence": analysis.get("confidence", 0.8)
                }
                httpx.patch(
                    f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/calls?id=eq.{call_id}",
                    headers=headers,
                    json=payload,
                    timeout=3.0
                )
            except Exception as e:
                logger.debug(f"Supabase finalize call note: {e}")

    @staticmethod
    def delete_call(call_id: str) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE call_id = ?", (call_id,))
        cursor.execute("DELETE FROM calls WHERE id = ?", (call_id,))
        affected = cursor.rowcount
        conn.commit()
        conn.close()

        headers = CallsRepository._get_supabase_headers()
        if headers and settings.SUPABASE_URL:
            try:
                httpx.delete(f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/messages?call_id=eq.{call_id}", headers=headers, timeout=3.0)
                httpx.delete(f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/calls?id=eq.{call_id}", headers=headers, timeout=3.0)
            except Exception as e:
                logger.debug(f"Supabase delete call note: {e}")

        return affected > 0
