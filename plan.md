# Plan: AI Voice Sales Bot (Sankar Group Intern Assignment)

**Deadline:** 48 hours from receipt. **Deliverables:** working website link + short explainer video.
**Optimization target:** a call that *feels* real (low latency, natural turn-taking), with every one of the 8 requirements visibly working in a 3-minute demo. Evaluators explicitly weigh functionality and UX over architectural complexity, so the plan spends effort on reliability and polish, not on clever infrastructure.

---

## 0. Key decisions (read this first)

| Decision | Choice | Why / trade-off |
|---|---|---|
| Build vs. platform | **Custom pipeline** (own backend) | Vapi/Retell would ship faster, but a custom build shows real engineering and gives control over consent, recording, and analysis. Vapi/Retell stays as the **emergency fallback (Plan C)** if the core loop is not working by hour ~12. |
| Voice transport | **WebSocket, browser to FastAPI** | Simpler than WebRTC/SFU for a 1:1 bot call. Cost: no built-in echo/jitter handling, so we rely on browser AEC and a playback queue. |
| STT | **Streaming STT (Deepgram-class)** with endpointing | Streaming gives interim text for the live screen. Verify Hindi/English support on Day 0. |
| LLM | **Fast Flash/Haiku-class model, streamed** | Time-to-first-token dominates perceived latency. Reasoning-heavy models are too slow for voice. |
| TTS | **Streaming TTS, sentence-chunked** | Start speaking after the first sentence, not the full reply. Pick the provider by measured first-byte latency and Hindi quality. |
| Recording | **Client-side mix (mic + bot audio) via Web Audio + MediaRecorder** | Captures both sides with perfect sync and zero server audio plumbing. Trade-off: if the tab dies mid-call, audio is lost (acceptable here). |
| Analysis | **Post-call LLM with strict JSON schema + deterministic guards** | LLM judges nuance; code enforces hard rules (e.g. no customer speech means `No Response`). |
| Language | **English first, Hindi as P1 toggle** | One language done well beats three done badly. Prompts and STT/TTS are parameterized by language code. |
| Auth | **None; anonymous session id per browser** | Zero friction for evaluators. History is scoped to the session so strangers' recordings are never exposed. |

---

## 1. Requirements traceability

| # | Requirement | Implementation | Acceptance test |
|---|---|---|---|
| 1 | Voice conversation | WS audio loop: mic to STT to LLM to TTS to speaker, barge-in supported | 10+ turns, bot answers product questions and tries to close |
| 2 | Language | `language` param (`en`, `hi`) selects STT model, TTS voice, and prompt | Full call in both languages |
| 3 | Live chat screen | WS `transcript` events (interim + final) rendered as chat bubbles | Text appears while speaking, before the turn ends |
| 4 | Call controls | Start/End buttons, timer, status chip (Connecting, Listening, Thinking, Speaking, Ended) | Timer runs only while connected; End works mid-sentence |
| 5 | Recording + consent | Consent modal gates the call, bot announces recording, upload to storage, in-app player | Record, end call, replay audio containing both voices |
| 6 | AI summary | Post-call LLM: summary, requirements, objections, next steps | Summary card appears within ~10s of ending |
| 7 | Sales status | Enum of the 6 statuses assigned by rubric + guards | One scripted test call per status (section 15) |
| 8 | Call history | List + detail page: recording, summary, transcript, status | Past calls persist after refresh and across deploys |

---

## 2. Architecture

```
 Browser (React + Vite, Vercel, HTTPS)                 Backend (FastAPI, WebSocket)                     Providers
 ─────────────────────────────────────                 ───────────────────────────                      ─────────
 Mic -> AudioWorklet (PCM16 16kHz) ──── binary ─────>  CallSession                                      
                                                         ├─ STT stream  ──────────────────────────────> STT (streaming)
 Live transcript UI  <──── JSON events ──────────────    │    interim/final text, endpointing
 Bot audio queue     <──── PCM chunks ───────────────    ├─ Turn manager (state machine)
 (AudioContext)                                          │    LISTENING -> THINKING -> SPEAKING
                                                         ├─ LLM stream (sentence chunker) ────────────> LLM (streaming)
 MediaRecorder on mixed stream (mic + bot)               ├─ TTS stream per sentence ──────────────────> TTS (streaming)
   └─ upload blob at end ─────────────────────────────>  └─ Finalizer: persist, analyze (JSON mode) ──> LLM
                                                                         │
                                                              Supabase Postgres + Storage (recordings)
```

**Why the browser records instead of the server:** the server would have to time-align two independent streams (user and TTS) and encode them. The browser already has both in one `AudioContext`, so one `MediaRecorder` yields a synced mix for free.

**Provider interfaces:** `STTProvider`, `LLMProvider`, `TTSProvider` as small abstract classes. Swapping a provider (or falling back when one is down) is a config change, which also protects us from free-tier limits mid-demo.

---

## 3. Tech stack

- **Frontend:** React + Vite + TypeScript + Tailwind. Vercel (static, HTTPS is mandatory for mic access).
- **Backend:** Python FastAPI + `asyncio` (WebSocket endpoint, REST endpoints). Host on a platform that supports long-lived WebSockets (Render, Railway, or Fly). **Not Vercel serverless** since it cannot hold WebSockets.
- **DB + storage:** Supabase Postgres + Storage (private bucket, signed URLs).
- **Validation:** Pydantic models for WS messages and the analysis JSON.
- **Provider selection (Day 0 spike, 45 min):** test 2-3 TTS options with the same English and Hindi sentence, record time-to-first-audio-byte and subjective quality, then lock the choice. Re-verify current free-tier limits and Hindi model availability before committing.

---

## 4. Voice pipeline details

### 4.1 Turn state machine (server-side, per call)

`IDLE -> GREETING -> LISTENING -> THINKING -> SPEAKING -> LISTENING ... -> ENDING -> FINALIZING -> DONE`

Every state change is pushed to the UI as `{type:"state", value}` and drives the status chip.

### 4.2 Latency budget (target: user stops talking to first bot audio < 1.5 s)

| Stage | Budget | Lever |
|---|---|---|
| Endpointing (end-of-speech detection) | 300-500 ms | STT endpointing tuned, not default |
| LLM time-to-first-token | 300-500 ms | Small fast model, short prompt, history trimmed |
| First sentence to TTS first byte | 200-300 ms | Flush on first sentence boundary (`. ? ! ,` with min length) |
| Network + playback start | ~100 ms | Backend region close to the user (India if possible) |

Prompt rule that also helps latency: **1-2 short sentences per turn**, because voice replies must be brief.

### 4.3 Barge-in (interrupting the bot)

- When STT reports user speech while state is `SPEAKING`: server cancels the LLM and TTS tasks (`asyncio.Task.cancel()`), sends `{type:"stop_audio"}`, client flushes its playback queue immediately.
- Persist the partial bot text with `interrupted=true` so the transcript reflects what the customer actually heard.
- Guard against false triggers from speaker bleed: `echoCancellation`, `noiseSuppression` enabled in `getUserMedia`; require a minimum speech duration (~250 ms) before interrupting. Recommend headphones for the demo.

### 4.4 Silence and no-response handling

- 8 s of customer silence after a bot turn: bot re-prompts once ("Are you still there?").
- Second silence: polite goodbye, end call, `end_reason="silence"`.
- Hard cap: 5 min per call (cost control and demo discipline).

### 4.5 Client audio specifics

- Capture: `AudioWorklet` downsamples to 16 kHz mono PCM16, 20-40 ms frames over WS.
- Playback: schedule PCM chunks on `AudioContext` for gapless output and instant cancel (avoid `<audio>` streaming hacks).
- Browsers block audio until a user gesture, so **Start Call click** creates/resumes the `AudioContext`.

---

## 5. Conversation design

### 5.1 Product

Make the product **config-driven** (`products/<id>.json`) so "any SaaS" is literally true and swapping it in the demo is one dropdown.

Primary demo product (fictional, so no accuracy risk): **FlowDesk, an AI-powered customer support helpdesk for SMBs.**
Config includes: one-liner, 3-5 features with benefits, 3 pricing tiers, free trial terms, integrations, 4-5 common objections with approved responses, demo-booking rule.

### 5.2 Sales flow (stages injected into the system prompt, not hard-coded branches)

1. **Greeting + disclosure:** introduce, state "this call is recorded for quality and summary", ask permission to continue.
2. **Discovery:** 2-3 questions (team size, current tool, pain point). Store answers for the summary.
3. **Pitch:** map features to *their* stated pain, not a feature dump.
4. **Objection handling:** acknowledge, answer from the config only, reframe, confirm.
5. **Close:** ask for a concrete next step (start trial / book demo / schedule follow-up). One soft retry if declined, then respect the no.
6. **Wrap-up:** recap the agreed next step, thank, end.

### 5.3 Guardrails (in the system prompt and enforced in code where possible)

- Answer only from the product config. If unknown: "I'll have our team confirm that", and log it as a follow-up item.
- Never invent pricing, discounts, or integrations.
- No pressure tactics; the first "not interested" is handled once, the second is accepted.
- Output is plain speakable text: no markdown, lists, emojis, or long numbers.
- LLM may call an `end_call(reason)` tool when the conversation has naturally concluded.

---

## 6. Recording and consent

1. **Pre-call consent modal** (required checkbox): "I agree to this call being recorded and transcribed for sales follow-up." Start Call stays disabled until checked.
2. **Server stores** `consent_given=true` and `consent_at` on the call row, and refuses to create a call without it.
3. **Spoken disclosure** in the bot's first line (also covers the transcript).
4. **Mix + record:** mic `MediaStreamSource` and bot playback `GainNode` both connect to one `MediaStreamDestination`; `MediaRecorder` records that stream (`audio/webm;codecs=opus`, with `audio/mp4` fallback for Safari).
5. **Upload at end:** client requests a signed upload URL, PUTs the blob, then calls `finalize`.
6. **Playback:** history detail page uses `<audio controls>` with a short-lived signed GET URL.
7. **Retention note** shown in UI: recordings are tied to this browser session and can be deleted (P1: a Delete button that removes row + file).

---

## 7. Post-call analysis

Triggered by `finalize`. Single LLM call in JSON mode against this schema, validated with Pydantic (one retry on invalid JSON):

```json
{
  "summary": "2-3 sentence neutral recap",
  "customer_requirements": ["..."],
  "objections": [{"text": "...", "resolved": true}],
  "next_steps": ["..."],
  "status": "converted | interested | follow_up_required | not_interested | demo_requested | no_response",
  "status_reason": "one sentence",
  "status_evidence": "short transcript quote supporting the status",
  "confidence": 0.0
}
```

### 7.1 Status rubric (classify by the customer's **final stance**)

| Status | Rule |
|---|---|
| Converted | Customer explicitly agreed to buy / sign up / start the paid plan or trial during the call |
| Demo Requested | Customer asked for or agreed to a demo/meeting, without buying |
| Follow-up Required | Customer wants contact later, needs info, or a decision-maker is absent |
| Interested | Positive engagement and questions, but no commitment and no specific follow-up asked |
| Not Interested | Explicit rejection |
| No Response | Fewer than 2 meaningful customer utterances (set by **code before** the LLM runs) |

**Deterministic guards (in code):** `No Response` short-circuit; reject `converted` or `demo_requested` if `status_evidence` is empty; confidence below 0.5 downgrades to `follow_up_required` and flags the row for review.

---

## 8. Data model (Postgres)

```sql
create table calls (
  id               uuid primary key default gen_random_uuid(),
  session_id       text not null,                       -- anonymous browser id
  product_id       text not null,
  language         text not null default 'en',
  call_state       text not null default 'in_progress'
                   check (call_state in ('in_progress','processing','completed','failed')),
  end_reason       text,                                -- user_ended | bot_ended | silence | timeout | error
  consent_given    boolean not null,
  consent_at       timestamptz not null,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_sec     int,
  recording_path   text,
  recording_mime   text,
  summary          text,
  requirements     jsonb default '[]',
  objections       jsonb default '[]',
  next_steps       jsonb default '[]',
  sales_status     text check (sales_status in
                   ('converted','interested','follow_up_required','not_interested','demo_requested','no_response')),
  status_reason    text,
  status_evidence  text,
  analysis_confidence real
);
create index on calls (session_id, started_at desc);

create table messages (
  id           bigserial primary key,
  call_id      uuid not null references calls(id) on delete cascade,
  seq          int not null,
  role         text not null check (role in ('bot','customer')),
  text         text not null,
  t_start_ms   int,
  t_end_ms     int,
  interrupted  boolean default false,
  unique (call_id, seq)
);
```

Access model: the frontend never talks to the DB directly. All reads/writes go through the backend, which filters by `session_id`. Storage bucket is private; only signed URLs are issued.

---

## 9. API and WebSocket protocol

### REST

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness + warm-up (frontend pings on page load to avoid cold start) |
| GET | `/api/products` | Product list for the selector |
| POST | `/api/calls` | Create call (requires consent, language, product); returns `call_id`, `ws_token` |
| POST | `/api/calls/{id}/recording-url` | Signed upload URL |
| POST | `/api/calls/{id}/finalize` | Mark ended, run analysis, return the analysis |
| GET | `/api/calls` | History for this session |
| GET | `/api/calls/{id}` | Detail: summary, status, transcript, signed recording URL |
| POST | `/api/calls/{id}/reanalyze` | Re-run analysis (debug and prompt-tuning aid) |
| DELETE | `/api/calls/{id}` | P1: delete row + recording |

### WebSocket `/ws/calls/{id}?token=...`

- **Client to server:** binary audio frames; JSON `{type:"start"}`, `{type:"end"}`.
- **Server to client:** `{type:"state", value}`, `{type:"transcript", role, text, final, seq}`, binary bot audio frames, `{type:"stop_audio"}` (barge-in), `{type:"ended", reason}`, `{type:"error", code, message}`.

---

## 10. Frontend

**Screens**
1. **Call screen:** product + language selectors, consent modal, Start/End Call, timer, status chip, audio-level meter, live chat panel (customer = right, bot = left, interim text in lighter style), post-call summary card with status badge.
2. **History screen:** table/cards with date, duration, product, status badge, one-line summary; click opens detail.
3. **Call detail:** audio player, full transcript, summary, requirements, objections, next steps, status + reason.

**UX details that separate "works" from "feels good"**
- Visible state feedback at all times (the user must know when to speak).
- Animated "bot speaking / listening" indicator.
- Clear error states: mic denied, unsupported browser, backend waking up, provider failure (with retry).
- "Saving recording and generating summary…" progress state after End Call (do not leave a blank screen).
- Status badges with distinct colors; mobile-responsive layout.
- Small "Use Chrome + headphones" hint near Start.

---

## 11. Folder structure

```
voice-sales-bot/
├─ README.md
├─ plan.md
├─ products/
│  └─ flowdesk.json
├─ backend/
│  ├─ app/
│  │  ├─ main.py                 # FastAPI app, routers, CORS, rate limiting
│  │  ├─ config.py               # env settings
│  │  ├─ ws/call_session.py      # CallSession: state machine, tasks, cancellation
│  │  ├─ providers/
│  │  │  ├─ base.py              # STT/LLM/TTS interfaces
│  │  │  ├─ stt_*.py  llm_*.py  tts_*.py
│  │  ├─ prompts/
│  │  │  ├─ sales_system.md      # conversation prompt template
│  │  │  └─ analysis.md          # summary + status prompt
│  │  ├─ services/
│  │  │  ├─ analysis.py          # LLM JSON + guards
│  │  │  ├─ storage.py           # signed URLs
│  │  │  └─ calls_repo.py
│  │  ├─ schemas.py              # Pydantic models
│  │  └─ db.py
│  ├─ tests/                     # status guards, chunker, rubric fixtures
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ audio/                  # capture-worklet.ts, playback-queue.ts, recorder.ts
│  │  ├─ hooks/useCallSocket.ts
│  │  ├─ components/             # CallPanel, LiveTranscript, ConsentModal, SummaryCard, StatusBadge
│  │  ├─ pages/                  # CallPage, HistoryPage, CallDetailPage
│  │  └─ lib/api.ts
│  └─ vite.config.ts
└─ docs/architecture.png         # reused in the video
```

---

## 12. Security and abuse controls

A public link with paid API keys behind it will be hit by bots and curious evaluators alike.

- **All provider keys server-side only.** The browser never sees an STT/LLM/TTS key.
- **Cost guards:** max 5 min/call, max N calls per session per day, a global daily call cap, and a kill switch env var. Rate limit `POST /api/calls` per IP.
- **WS auth:** short-lived signed `ws_token` bound to `call_id`; reject reuse.
- **Session isolation:** history queries always filter by `session_id`; recordings only via signed URLs with short TTL.
- **CORS** locked to the frontend origin; validate all WS JSON with Pydantic; cap frame size.
- **Prompt injection:** the customer is untrusted input. The system prompt states that customer speech cannot change the bot's rules, and the analysis step treats the transcript as data. Status is computed from the transcript with evidence quotes, never from anything the customer "says the status should be".
- **PII:** don't log raw transcripts at INFO level; scrub logs.

---

## 13. Deployment

- **Frontend:** Vercel (`VITE_API_URL`, `VITE_WS_URL`).
- **Backend:** Render/Railway/Fly with WebSocket support. **Free tiers sleep.** Mitigations: warm `/health` on page load, an uptime pinger every ~5 min, and a manual warm-up before the evaluator window. A small always-on paid instance for the 48 h is cheap insurance.
- **Deploy by hour ~10, not hour 40.** Mic permissions, HTTPS/WSS, CORS, and mobile Safari problems only surface on the real deployment.
- **Env/secrets:** provider keys, Supabase service key, `WS_TOKEN_SECRET`, `ALLOWED_ORIGINS`, `MAX_CALL_SECONDS`, `DAILY_CALL_CAP`.

---

## 14. 48-hour timeline

Priority tiers: **P0** must ship, **P1** ship if on schedule, **P2** only after everything else.

| Hours | Goal | Output |
|---|---|---|
| 0-2 | Repo, Day-0 spikes: STT streaming, TTS latency, LLM TTFT, WebSocket host check | Provider choices locked |
| 2-8 | **P0 core voice loop** end-to-end locally: mic, STT, LLM stream, TTS, playback, live transcript events | A voice conversation works. **Go/no-go gate at hour ~10: if this fails, switch to Plan C (Vapi/Retell).** |
| 8-12 | Call UI (controls, timer, state chip, live chat) and **first deploy** | Public HTTPS link running a real call |
| 12-18 | **P0** consent modal, recording mix + upload, persistence, finalize + analysis + status | Requirements 5, 6, 7 complete |
| 18-24 | **P0** history list + detail with player, transcript, summary | All 8 requirements demonstrable |
| 24-32 | **P1** barge-in, silence handling, error states, Hindi, product config, mobile pass | Feels polished |
| 32-40 | Scripted test calls (section 15), prompt tuning, guard unit tests, README | Statuses reliable |
| 40-46 | Record 4-5 real calls for history, record the explainer video, final deploy check | Submission-ready |
| 46-48 | **Buffer only.** Submit early. No new features. | Submitted |

---

## 15. Test plan: one scripted call per status

| Status | Script the tester plays |
|---|---|
| Converted | Asks price, objects once to cost, then says "okay, sign me up for the Pro plan" |
| Demo Requested | Interested, says "can I see a demo on Friday?" |
| Follow-up Required | "Send me details and call me next week, I need to ask my manager" |
| Interested | Asks several feature questions, ends with "sounds good, I'll think about it" with no commitment |
| Not Interested | "We're happy with our current tool, not interested" (twice) |
| No Response | Start the call and stay silent (also test mic muted) |

Extra cases: barge-in mid-sentence, 30 s of background noise, refreshing mid-call, mic permission denied, backend cold start, Safari/iOS smoke test, recording playback in Chrome and Safari.

Unit tests (cheap, high value): sentence chunker, `No Response` short-circuit, evidence-required guard, JSON retry path, token expiry.

---

## 16. Demo video and submission strategy (about 3 minutes)

| Time | Content |
|---|---|
| 0:00-0:30 | Problem + one architecture diagram: mic to STT to LLM to TTS, recording mix, analysis |
| 0:30-2:00 | **One uninterrupted live call**: consent, discovery, an objection, barge-in once, a close ending in a demo request |
| 2:00-2:30 | End Call: saving state, summary card, status `Demo Requested` with the evidence quote |
| 2:30-3:00 | History page: play a recording, open a different call, point out all 6 statuses exist across calls |

Tips: record in a quiet room with headphones, rehearse the call script twice, show the live transcript prominently, and mention two engineering decisions (client-side recording mix, deterministic guards on top of LLM status) as they show judgment.

**Submission checklist**
- [ ] Public HTTPS link works from an incognito window and a phone
- [ ] Backend warm; `/health` OK; keys have quota left
- [ ] History already contains 4-6 genuine calls covering most statuses
- [ ] Short "how to test" note on the page: use Chrome, allow the mic, headphones recommended
- [ ] Video link accessible without login
- [ ] README: architecture, env vars, run locally, limitations
- [ ] Submitted at least a few hours before the deadline

---

## 17. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Voice latency feels robotic | High | Streaming at every stage, sentence-chunked TTS, short replies, endpointing tuned, hosted near India |
| Free-tier cold start / quota exhaustion mid-evaluation | High | Warm pings, provider fallback config, paid always-on instance for 48 h, daily-cap alerts |
| Echo or bleed triggers false barge-in | Medium | AEC on, min speech duration, headphone hint, barge-in toggle |
| Browser incompatibility (Safari audio/recording formats) | Medium | Target Chrome first, MIME fallback, clear unsupported-browser message |
| STT quality on Hindi/accents | Medium | Language-specific STT model, English as the safe default, Hindi flagged beta |
| LLM hallucinates product facts | Medium | Config-grounded prompt, "I'll confirm" fallback, tests with trap questions |
| LLM misclassifies status | Medium | Rubric, evidence requirement, deterministic guards, test-call suite |
| Recording not saved (tab closed, upload failure) | Medium | Retry upload, keep transcript regardless, show "recording unavailable" instead of failing the whole call |
| Scope creep eats the buffer | High | P0/P1/P2 tiers, feature freeze at hour 40 |
| Stuck on the core loop past hour 10 | Low-Medium | Plan C (Vapi/Retell) with the same UI, history, and analysis layer around it |

### Fallback plans
- **Plan B (degraded but independent):** browser Web Speech API for STT and `speechSynthesis` for TTS, turn-based via REST. No keys needed. Limitation: bot audio is not captured, so the recording is customer-side only. Use only if streaming providers fail.
- **Plan C (platform):** Vapi/Retell for the voice leg. Keep our own UI, consent, history DB, and analysis step fed by their webhook/transcript.

---

## 18. Post-submission improvements (if time remains, or as talking points)

- Streaming server-side VAD (e.g. Silero) for tighter turn-taking than STT endpointing alone
- WebRTC transport for better jitter and packet-loss handling at scale
- Call analytics dashboard: conversion funnel by status, average duration, top objections
- Objection library learned from past calls; A/B test of pitch prompts by conversion rate
- Outbound dialing via telephony (Twilio/Exotel) reusing the same pipeline
- CRM export (webhook/CSV) of lead, status, and next steps
- Human-in-the-loop review queue for low-confidence statuses
- Observability: per-stage latency metrics (STT final, LLM TTFT, TTS first byte) per call
