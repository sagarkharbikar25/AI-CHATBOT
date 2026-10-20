import asyncio
import io
import edge_tts
from typing import AsyncGenerator
from backend.app.providers.base import BaseTTSProvider

VOICE_MAP = {
    "en": "en-US-EmmaNeural",
    "hi": "hi-IN-SwaraNeural"
}

class EdgeTTSProvider(BaseTTSProvider):
    def __init__(self, voice_en: str = "en-US-EmmaNeural", voice_hi: str = "hi-IN-SwaraNeural"):
        self.voice_en = voice_en
        self.voice_hi = voice_hi

    def get_voice(self, language: str) -> str:
        return self.voice_hi if language.lower().startswith("hi") else self.voice_en

    async def synthesize_to_bytes(self, text: str, language: str = "en") -> bytes:
        voice = self.get_voice(language)
        communicate = edge_tts.Communicate(text, voice)
        audio_stream = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])
        return audio_stream.getvalue()

    async def stream_audio_chunks(self, text: str, language: str = "en") -> AsyncGenerator[bytes, None]:
        voice = self.get_voice(language)
        communicate = edge_tts.Communicate(text, voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

class MockTTSProvider(BaseTTSProvider):
    """Fallback mock TTS that outputs silence/dummy bytes for testing."""
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
