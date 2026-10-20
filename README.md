# FlowDesk AI • Intelligent Voice Sales Assistant

An enterprise-grade, real-time AI Voice Sales Bot built for the **Sankar Group Intern Assignment**. Designed with ultra-low latency streaming, synchronized dual-channel audio recording, barge-in interruption, and post-call sales intelligence analysis with deterministic rubric guards.

---

## 1. System Architecture

```
 Browser (React + Vite + TypeScript)                    Backend (FastAPI, Python 3.11)                   Providers
 ───────────────────────────────────                    ──────────────────────────────                   ─────────
  Mic -> Web Audio Context (16-24kHz) ── WebSocket ──>   CallSession State Machine
                                                         ├─ STT / Speech Stream ──────────────────────>  Web Speech / Whisper
  Acoustic Halo Canvas (Frequency Bloom)                 ├─ State: Connecting -> Listening -> Thinking
  Live Transcript Stream (Interim & Final) <── JSON ──── │         -> Speaking (Barge-in Interrupt)
  Streaming Audio Playback (Edge-TTS)    <── Binary ─── ├─ Sentence Chunker (<1.5s latency) ──────────>  Edge-TTS (EN & HI)
                                                         ├─ LLM Stream (Groq / OpenAI / Gemini) ──────>  Groq Llama-3.3 / Gemini
  Client-Side Dual-Stream Sync Mix                       └─ Post-Call Analysis & Deterministic Guards
   (Mic + Bot Audio via MediaStreamDestination)
   └─ Uploads WebM Blob on Call End ──── REST PUT ────>   StorageService (Recordings Archive) + SQLite
```

---

## 2. Key Technical Highlights

1. **Bespoke "Obsidian Aurora" UI Design System:**
   - Dark cosmic obsidian canvas (`#070A11`), glassmorphic elevations with multi-layered blur, radiant Cyber Mint (`#00F5A0`) and Electric Cyan (`#00D9F5`) luminescence.
   - Distinctive typography: **Plus Jakarta Sans** (display/brand), **Outfit** (speech dialogue), **Space Grotesk** (timers & metrics), and **JetBrains Mono** (telemetry).
   - Dynamic HTML5 Canvas **Acoustic Halo** that ripples and blooms in sync with microphone audio level and speech frequency.

2. **Synchronized Dual-Voice Client Recording (Requirement 5):**
   - Combines the user's microphone `MediaStreamSource` and the bot's `AudioNode` into a single `MediaStreamDestination`.
   - Records the combined conversation into an opus WebM container without server-side audio re-encoding bottlenecks.

3. **Sub-1.5s Latency & Barge-In Support (Requirement 1 & 4):**
   - **Sentence-chunked TTS:** Starts audio playback on first sentence boundary (`. ? ! \n`) rather than waiting for the entire LLM response.
   - **Instant Barge-in Interrupt:** Cancels server LLM/TTS generation tasks (`asyncio.Task.cancel()`), flushes the client Web Audio buffer instantly, and flags the interrupted transcript turn.

4. **Deterministic Rubric Guards (Requirement 7):**
   - Evaluates the customer's final stance across the 6 mandatory sales statuses:
     - `converted`: Explicit agreement to activate plan / trial.
     - `demo_requested`: Scheduled or requested live walkthrough.
     - `follow_up_required`: Manager approval required / contact next week.
     - `interested`: Positive questions without concrete next step.
     - `not_interested`: Explicit rejection.
     - `no_response`: Automatically short-circuits if fewer than 2 customer utterances detected.
   - Code guards enforce verifiable transcript evidence quotes for high-commitment statuses (`converted` and `demo_requested`).

5. **Multilingual English & Hindi Support (Requirement 2):**
   - Parameterized language toggle:
     - English: `en-US-EmmaNeural`
     - Hindi: `hi-IN-SwaraNeural` (Natural neural Hindi voice)

6. **Full Session Archives & In-App Player (Requirement 8):**
   - History view with persistent SQLite storage, status badges, transcript review, and custom scrubbable audio player.

---

## 3. Quickstart & Local Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+

### Step 1: Backend Setup
```bash
# 1. Create Python virtual environment
python -m venv backend/venv

# 2. Activate virtual environment
# Windows:
backend\venv\Scripts\activate
# Linux/macOS:
source backend/venv/bin/activate

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. (Optional) Configure API keys in backend/.env:
# GROQ_API_KEY=your_groq_key        (Recommended for 200ms TTFT)
# OPENAI_API_KEY=your_openai_key    (Optional)
# GEMINI_API_KEY=your_gemini_key    (Optional)
# Note: If no API key is set, the built-in smart sales simulator and Edge-TTS run offline!

# 5. Start FastAPI Server
python -m uvicorn backend.app.main:app --reload --port 8000
```

### Step 2: Frontend Setup
```bash
# In a new terminal:
cd frontend

# 1. Install packages
npm install

# 2. Start Vite development server
npm run dev
```

Visit **`http://localhost:5173`** in your browser (Google Chrome recommended).

---

## 4. Running the Test Suite

Run the backend unit tests for status rubric classification and deterministic code guards:
```bash
# From repository root:
# Windows PowerShell:
$env:PYTHONPATH="."
backend\venv\Scripts\python -m pytest -v backend/tests

# Linux/macOS:
PYTHONPATH=. backend/venv/bin/pytest -v backend/tests
```

All 9 test cases pass covering:
- No Response short-circuit guard (<2 utterances)
- `converted` status with evidence quote
- `demo_requested` status
- `not_interested` status
- `follow_up_required` status
- REST health check and product configuration APIs
- Mandatory consent gate enforcement

---

## 5. Scripted Test Scenarios (Section 15 of Plan)

The terminal includes a **Scripted Test Bench** row for instant verification of all 6 sales statuses:

| Status | Test Speech / Preset Button | Expected Outcome |
|---|---|---|
| **Converted** | *"Okay, sign me up for the Pro plan today."* | Status badge: `Converted`, confidence: ~96%, evidence quoted |
| **Demo Requested** | *"Can I see a live demo on Friday with our team?"* | Status badge: `Demo Requested`, next step: send calendar invite |
| **Follow-up Required** | *"Send me details and call me next week, I need to ask my manager."* | Status badge: `Follow-up Required`, rationale quoted |
| **Interested** | *"How does FlowDesk handle tier-1 tickets and Shopify?"* | Status badge: `Interested (Exploratory)` |
| **Not Interested** | *"We are happy with our current tool, not interested."* | Status badge: `Not Interested` |
| **No Response** | Click Start Call, stay silent, and click End Call | Status badge: `No Response` (short-circuit guard) |

---

## 6. Project Structure

```
AI-CHATBOT/
├── backend/
│   ├── app/
│   │   ├── config.py             # Settings & environment configuration
│   │   ├── db.py                 # SQLite database & table creation
│   │   ├── main.py               # FastAPI app, REST & WebSocket endpoints
│   │   ├── schemas.py            # Pydantic models & enums
│   │   ├── prompts/
│   │   │   ├── sales_system.md   # Alex conversational sales prompt
│   │   │   └── analysis.md       # Post-call analysis rubric prompt
│   │   ├── providers/
│   │   │   ├── base.py           # Provider abstract classes
│   │   │   ├── llm_provider.py   # Groq / OpenAI / Gemini / smart fallback
│   │   │   └── tts_provider.py   # Edge-TTS streaming neural voices
│   │   ├── services/
│   │   │   ├── analysis.py       # Deterministic rubric guards
│   │   │   ├── calls_repo.py     # Database CRUD repository
│   │   │   └── storage.py        # Local & cloud audio recordings
│   │   └── ws/
│   │       └── call_session.py   # Turn state machine & barge-in manager
│   ├── tests/
│   │   ├── test_analysis_guards.py
│   │   └── test_api.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── audio/
│   │   │   ├── playback-queue.ts # Web Audio queue & instant barge-in flush
│   │   │   └── recorder.ts       # Synchronized dual-stream mic+bot recorder
│   │   ├── components/
│   │   │   ├── AcousticHalo.tsx  # Dynamic canvas frequency halo
│   │   │   ├── AudioPlayer.tsx   # Scrubbable recording player
│   │   │   ├── CallView.tsx      # Terminal workspace & test bench
│   │   │   ├── ConsentModal.tsx  # Mandatory pre-call compliance gate
│   │   │   ├── DetailModal.tsx   # Detailed call audit & transcript review
│   │   │   ├── HistoryView.tsx   # Call history archives
│   │   │   ├── LiveTranscript.tsx# Streaming dialogue bubbles & interim text
│   │   │   ├── StatusBadge.tsx   # State chip with live timer
│   │   │   └── SummaryCard.tsx   # Post-call intelligence dossier
│   │   ├── hooks/
│   │   │   └── useCallSocket.ts  # Web Audio, SpeechRecognition & WebSocket hook
│   │   ├── lib/
│   │   │   └── api.ts            # REST API client
│   │   ├── types.ts              # TypeScript definitions
│   │   ├── App.tsx               # Root app layout & navigation
│   │   └── index.css             # Obsidian Aurora design system tokens
│   ├── index.html
│   └── vite.config.ts
├── products/
│   └── flowdesk.json             # FlowDesk product specification
├── plan.md                       # Complete 48-hour assignment blueprint
└── README.md
```
