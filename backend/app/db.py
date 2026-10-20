import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.app.config import settings

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS calls (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        call_state TEXT NOT NULL DEFAULT 'in_progress',
        end_reason TEXT,
        consent_given INTEGER NOT NULL,
        consent_at TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_sec INTEGER DEFAULT 0,
        recording_path TEXT,
        recording_mime TEXT,
        summary TEXT,
        requirements TEXT DEFAULT '[]',
        objections TEXT DEFAULT '[]',
        next_steps TEXT DEFAULT '[]',
        sales_status TEXT,
        status_reason TEXT,
        status_evidence TEXT,
        analysis_confidence REAL
    );
    """)
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_calls_session_started 
    ON calls (session_id, started_at DESC);
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        call_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        t_start_ms INTEGER,
        t_end_ms INTEGER,
        interrupted INTEGER DEFAULT 0,
        FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
        UNIQUE (call_id, seq)
    );
    """)
    conn.commit()
    conn.close()

# Initialize upon import
init_db()
