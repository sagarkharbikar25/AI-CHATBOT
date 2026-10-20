from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any, List

class BaseLLMProvider(ABC):
    @abstractmethod
    async def stream_response(self, messages: List[Dict[str, str]], system_prompt: str) -> AsyncGenerator[str, None]:
        """Yields text tokens as they are generated."""
        pass

    @abstractmethod
    async def analyze(self, transcript: str, product_context: str) -> Dict[str, Any]:
        """Returns structured JSON analysis."""
        pass

class BaseTTSProvider(ABC):
    @abstractmethod
    async def synthesize_to_bytes(self, text: str, language: str = "en") -> bytes:
        """Synthesizes text into audio bytes."""
        pass

    @abstractmethod
    async def stream_audio_chunks(self, text: str, language: str = "en") -> AsyncGenerator[bytes, None]:
        """Streams audio chunks for real-time playback."""
        pass

class BaseSTTProvider(ABC):
    @abstractmethod
    async def transcribe_audio_chunk(self, audio_data: bytes, language: str = "en") -> str:
        """Transcribes audio chunk."""
        pass
