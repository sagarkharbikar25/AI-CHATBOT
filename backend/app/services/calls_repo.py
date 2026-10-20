import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.app.db import get_connection
from backend.app.schemas import CallDetailResponse, MessageRecord

class CallsRepository:
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

    @staticmethod
    def delete_call(call_id: str) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE call_id = ?", (call_id,))
        cursor.execute("DELETE FROM calls WHERE id = ?", (call_id,))
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0
