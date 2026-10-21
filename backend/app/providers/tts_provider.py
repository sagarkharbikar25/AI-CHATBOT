import asyncio
import io
import logging
import edge_tts
from typing import AsyncGenerator
from backend.app.providers.base import BaseTTSProvider

logger = logging.getLogger(__name__)

VOICE_MAP = {
    "en": "en-US-GuyNeural",      # natural male US English
    "hi": "hi-IN-MadhurNeural",   # male Hindi
    "te": "te-IN-MohanNeural",    # male Telugu
}

# Fallback voices if primary fails
FALLBACK_VOICE_MAP = {
    "en": "en-GB-RyanNeural",
    "hi": "hi-IN-MadhurNeural",
    "te": "te-IN-MohanNeural",
}


class EdgeTTSProvider(BaseTTSProvider):
    def get_voice(self, language: str) -> str:
        lang = language.lower()
        if lang.startswith("hi"):
            return VOICE_MAP["hi"]
        if lang.startswith("te"):
            return VOICE_MAP["te"]
        return VOICE_MAP["en"]

    def get_fallback_voice(self, language: str) -> str:
        lang = language.lower()
        if lang.startswith("hi"):
            return FALLBACK_VOICE_MAP["hi"]
        if lang.startswith("te"):
            return FALLBACK_VOICE_MAP["te"]
        return FALLBACK_VOICE_MAP["en"]

    async def _synthesize_voice(self, text: str, voice: str) -> bytes:
        """Synthesize text with a specific voice, returns complete MP3 bytes."""
        communicate = edge_tts.Communicate(text, voice)
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        data = buf.getvalue()
        if not data:
            raise ValueError(f"No audio received from edge_tts for voice={voice!r}")
        return data

    async def synthesize_to_bytes(self, text: str, language: str = "en") -> bytes:
        voice = self.get_voice(language)
        try:
            return await self._synthesize_voice(text, voice)
        except Exception:
            fallback = self.get_fallback_voice(language)
            logger.warning(f"Primary voice {voice!r} failed, trying fallback {fallback!r}")
            return await self._synthesize_voice(text, fallback)

    async def stream_audio_chunks(self, text: str, language: str = "en") -> AsyncGenerator[bytes, None]:
        """
        Yields one complete MP3 blob per call.
        Browser's decodeAudioData needs a full, valid MP3 file — not raw fragments.
        Retries with fallback voice if the primary voice returns no audio.
        """
        voice = self.get_voice(language)
        for attempt, v in enumerate([voice, self.get_fallback_voice(language)]):
            try:
                data = await self._synthesize_voice(text, v)
                logger.info(f"TTS OK: voice={v!r}, bytes={len(data)}, text={text[:40]!r}")
                yield data
                return
            except Exception as e:
                logger.warning(f"TTS attempt {attempt + 1} failed (voice={v!r}): {e}")
                if attempt == 0:
                    await asyncio.sleep(0.5)   # brief pause before retry

        logger.error(f"All TTS attempts failed for text={text[:40]!r}")
        # yield nothing — frontend will just skip this chunk silently


class MockTTSProvider(BaseTTSProvider):
    """Fallback mock TTS that outputs silence for testing."""
    async def synthesize_to_bytes(self, text: str, language: str = "en") -> bytes:
        return b"\x00" * 3200

    async def stream_audio_chunks(self, text: str, language: str = "en") -> AsyncGenerator[bytes, None]:
        yield b"\x00" * 1600
        await asyncio.sleep(0.05)
        yield b"\x00" * 1600


def get_tts_provider(provider_type: str = "edge") -> BaseTTSProvider:
    if provider_type == "mock":
        return MockTTSProvider()
    return EdgeTTSProvider()
