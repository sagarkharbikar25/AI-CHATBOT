import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from fastapi import WebSocket, WebSocketDisconnect
from backend.app.config import settings
from backend.app.services.calls_repo import CallsRepository
from backend.app.providers.llm_provider import UnifiedLLMProvider
from backend.app.providers.tts_provider import get_tts_provider

logger = logging.getLogger(__name__)

class CallSession:
    def __init__(self, ws: WebSocket, call_id: str, product_config: Dict[str, Any], language: str = "en"):
        self.ws = ws
        self.call_id = call_id
        self.product_config = product_config
        self.language = language
        self.state = "idle"
        
        self.llm = UnifiedLLMProvider()
        self.tts = get_tts_provider(settings.TTS_PROVIDER)
        
        self.messages: List[Dict[str, Any]] = []
        self.current_seq = 0
        
        # Async tasks
        self.active_llm_task: Optional[asyncio.Task] = None
        self.active_tts_task: Optional[asyncio.Task] = None
        self.silence_timer_task: Optional[asyncio.Task] = None
        self.silence_count = 0
        self.is_active = True

    async def send_json(self, payload: Dict[str, Any]):
        try:
            await self.ws.send_text(json.dumps(payload))
        except Exception as e:
            logger.warning(f"Failed to send JSON to websocket: {e}")

    async def send_state(self, state: str):
        self.state = state
        await self.send_json({"type": "state", "value": state})

    async def send_transcript(self, role: str, text: str, final: bool = True, seq: Optional[int] = None, interrupted: bool = False):
        if seq is None:
            self.current_seq += 1
            seq = self.current_seq

        await self.send_json({
            "type": "transcript",
            "role": role,
            "text": text,
            "final": final,
            "seq": seq,
            "interrupted": interrupted
        })

        if final:
            self.messages.append({
                "seq": seq,
                "role": role,
                "text": text,
                "interrupted": interrupted
            })
            CallsRepository.add_message(self.call_id, seq, role, text, interrupted=interrupted)

    async def start(self):
        """Initializes session and plays spoken greeting."""
        try:
            lang_key = "hi" if self.language.lower().startswith("hi") else "en"
            greeting_text = self.product_config.get("languages", {}).get(lang_key, {}).get(
                "greeting",
                f"Hello! This is Alex from {self.product_config.get('name', 'FlowDesk')}. How can I help your support team today?"
            )

            await self.send_state("speaking")

            # Start TTS synthesis immediately in the background while send_transcript
            # does its Supabase DB write (~300-500ms). The audio arrives faster because
            # both operations run in parallel instead of sequentially.
            tts_task = asyncio.create_task(
                self.tts.synthesize_to_bytes(greeting_text, self.language)
            )

            await self.send_transcript(role="bot", text=greeting_text, final=True)

            # By now the DB write is done; TTS is either ready or nearly ready
            audio_bytes = await tts_task
            if audio_bytes and self.is_active and self.state == "speaking":
                await self.ws.send_bytes(audio_bytes)

        except asyncio.CancelledError:
            logger.info("Greeting turn cancelled by barge-in")
        except Exception as e:
            logger.error(f"Error during greeting start: {e}")
        finally:
            if self.is_active and self.state != "ended":
                await self.send_state("listening")
                # Silence timer starts ONLY when client confirms audio playback done.


    async def handle_user_speech(self, text: str, is_final: bool = True):
        """Called when user speech is detected or transcribed."""
        text = text.strip()
        if not text:
            return

        # Barge-in: if bot is speaking, cancel immediately
        if self.state == "speaking":
            await self.cancel_active_turn()

        # Cancel any pending silence watchdog — Alex is about to respond.
        # Do NOT start a new timer here: the timer only starts in handle_audio_complete()
        # once the client confirms Alex's audio has finished playing.
        if self.silence_timer_task and not self.silence_timer_task.done():
            self.silence_timer_task.cancel()
        self.silence_count = 0

        if not is_final:
            # Send interim transcript
            await self.send_json({
                "type": "transcript",
                "role": "customer",
                "text": text,
                "final": False,
                "seq": self.current_seq + 1
            })
            return

        # Final customer turn
        await self.send_transcript(role="customer", text=text, final=True)
        await self.send_state("thinking")

        # Launch LLM + TTS pipeline in a cancellable task
        if self.active_llm_task and not self.active_llm_task.done():
            self.active_llm_task.cancel()
        
        self.active_llm_task = asyncio.create_task(self._process_bot_turn())

    async def cancel_active_turn(self):
        """Barge-in: cancels LLM generation and TTS audio playback immediately."""
        logger.info(f"Barge-in triggered for call {self.call_id}. Cancelling tasks.")
        if self.active_llm_task and not self.active_llm_task.done():
            self.active_llm_task.cancel()
        if self.active_tts_task and not self.active_tts_task.done():
            self.active_tts_task.cancel()

        # Tell client to stop audio playback immediately
        await self.send_json({"type": "stop_audio"})

        # Mark last bot message as interrupted if applicable
        if self.messages and self.messages[-1]["role"] == "bot":
            self.messages[-1]["interrupted"] = True
            CallsRepository.add_message(
                self.call_id, 
                self.messages[-1]["seq"], 
                "bot", 
                self.messages[-1]["text"], 
                interrupted=True
            )

    async def handle_audio_complete(self):
        """Client confirmed it finished playing audio — safe to start silence watchdog now."""
        if self.is_active and self.state == "listening":
            logger.info(f"audio_complete received for call {self.call_id} — starting silence timer")
            self._reset_silence_timer()

    async def _process_bot_turn(self):
        try:
            system_prompt = self._build_system_prompt()
            chat_history = [
                {"role": "assistant" if m["role"] == "bot" else "user", "content": m["text"]}
                for m in self.messages[-6:]  # keep context lean for low latency
            ]

            full_reply = ""
            current_sentence = ""
            self.current_seq += 1
            bot_seq = self.current_seq

            await self.send_state("speaking")

            async for token in self.llm.stream_response(chat_history, system_prompt):
                full_reply += token
                current_sentence += token

                # Sentence chunker: flush on sentence boundaries for instant TTS
                if any(punct in token for punct in [".", "?", "!", "\n"]) and len(current_sentence.strip()) > 15:
                    chunk_to_speak = current_sentence.strip()
                    current_sentence = ""
                    # Stream interim transcript update
                    await self.send_json({
                        "type": "transcript",
                        "role": "bot",
                        "text": full_reply.strip(),
                        "final": False,
                        "seq": bot_seq
                    })
                    await self._speak_text(chunk_to_speak)

            # Remaining sentence fragment
            if current_sentence.strip():
                await self._speak_text(current_sentence.strip())

            # Finalize transcript for bot
            final_bot_text = full_reply.strip() or "I'm here to help. What questions do you have about FlowDesk?"
            await self.send_transcript(role="bot", text=final_bot_text, final=True, seq=bot_seq)

            await self.send_state("listening")
            # Silence timer starts only when client confirms audio done.

        except asyncio.CancelledError:
            logger.info("Bot turn cancelled due to barge-in.")
        except Exception as e:
            logger.error(f"Error during bot turn: {e}")
            await self.send_state("listening")

    async def _speak_text(self, text: str):
        """Synthesizes text and streams raw audio bytes to WebSocket client."""
        try:
            async for audio_chunk in self.tts.stream_audio_chunks(text, self.language):
                if not self.is_active or self.state != "speaking":
                    break
                await self.ws.send_bytes(audio_chunk)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"TTS streaming error: {e}")

    def _reset_silence_timer(self):
        if self.silence_timer_task and not self.silence_timer_task.done():
            self.silence_timer_task.cancel()
        self.silence_timer_task = asyncio.create_task(self._silence_watchdog())

    async def _silence_watchdog(self):
        try:
            await asyncio.sleep(8.0)
            if not self.is_active or self.state != "listening":
                return

            self.silence_count += 1
            if self.silence_count == 1:
                reprompt = "Are you still there? I'm happy to answer any questions about FlowDesk."
                if self.language.startswith("hi"):
                    reprompt = "क्या आप सुन पा रहे हैं? मैं FlowDesk के बारे में आपके सवालों के जवाब देने के लिए यहाँ हूँ।"
                await self.send_state("speaking")
                await self.send_transcript(role="bot", text=reprompt, final=True)
                await self._speak_text(reprompt)
                await self.send_state("listening")
                self._reset_silence_timer()
            else:
                # Polite sign-off
                goodbye = "It looks like we lost connection. Thank you for your time, have a wonderful day!"
                if self.language.startswith("hi"):
                    goodbye = "लगता है आवाज़ नहीं आ रही है। समय देने के लिए धन्यवाद, आपका दिन शुभ हो!"
                await self.send_state("speaking")
                await self.send_transcript(role="bot", text=goodbye, final=True)
                await self._speak_text(goodbye)
                await self.end_call(reason="silence")
        except asyncio.CancelledError:
            pass

    async def end_call(self, reason: str = "user_ended"):
        self.is_active = False
        if self.silence_timer_task:
            self.silence_timer_task.cancel()
        if self.active_llm_task:
            self.active_llm_task.cancel()
        if self.active_tts_task:
            self.active_tts_task.cancel()

        await self.send_state("ended")
        await self.send_json({"type": "ended", "reason": reason})

    def _build_system_prompt(self) -> str:
        features_str = "\n".join([f"- {f['name']}: {f['benefit']}" for f in self.product_config.get("features", [])])
        pricing_str = "\n".join([f"- {p['tier']}: {p['price']} ({p['highlights']})" for p in self.product_config.get("pricing_tiers", [])])
        objections_str = "\n".join([f"- Objection: {o['objection']}\n  Response: {o['response']}" for o in self.product_config.get("objections", [])])
        
        lang_label = "Hindi" if self.language.startswith("hi") else "English"
        return f"""You are Alex, an elite, friendly AI sales specialist for {self.product_config.get('name')}.

PRODUCT:
{self.product_config.get('one_liner')}
{self.product_config.get('company_overview')}

FEATURES:
{features_str}

PRICING:
{pricing_str}

TRIAL:
{self.product_config.get('free_trial', {}).get('duration_days', 14)}-day free trial, no credit card required.

OBJECTIONS & APPROVED ANSWERS:
{objections_str}

DEMO RULE:
{self.product_config.get('demo_rule')}

LANGUAGE: Speak strictly in {lang_label}.
VOICE RULES:
1. Speak in 1-2 short, punchy sentences (maximum 30 words per turn).
2. Never use markdown, bullet points, numbers, or emojis. Output plain speakable sentences only.
3. Be helpful, empathetic, and guide them to start a free trial or book a demo."""
