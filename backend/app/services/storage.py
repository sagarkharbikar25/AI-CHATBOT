import os
import aiofiles
from pathlib import Path
from typing import Optional, Tuple
from backend.app.config import settings

class StorageService:
    @staticmethod
    async def save_recording(call_id: str, file_bytes: bytes, extension: str = "webm") -> Tuple[str, str]:
        """Saves recording locally and returns (relative_path, mime_type)."""
        filename = f"{call_id}.{extension}"
        filepath = Path(settings.RECORDINGS_PATH) / filename
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(file_bytes)

        mime = "audio/webm" if extension == "webm" else "audio/wav"
        return f"/api/recordings/{filename}", mime

    @staticmethod
    def get_recording_path(filename: str) -> Optional[Path]:
        filepath = Path(settings.RECORDINGS_PATH) / filename
        if filepath.exists() and filepath.is_file():
            return filepath
        return None
