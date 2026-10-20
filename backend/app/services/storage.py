import os
import aiofiles
import logging
from pathlib import Path
from typing import Optional, Tuple
import httpx
from backend.app.config import settings

logger = logging.getLogger(__name__)

class StorageService:
    @staticmethod
    async def save_recording(call_id: str, file_bytes: bytes, extension: str = "webm") -> Tuple[str, str]:
        """Saves recording locally and uploads to Supabase Storage if configured."""
        filename = f"{call_id}.{extension}"
        filepath = Path(settings.RECORDINGS_PATH) / filename
        
        # 1. Local backup save
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(file_bytes)

        mime = "audio/webm" if extension == "webm" else "audio/wav"

        # 2. Upload to Supabase Storage if configured
        supabase_url = settings.SUPABASE_URL or os.getenv("SUPABASE_URL")
        supabase_key = settings.SUPABASE_SECRET_KEY or settings.SUPABASE_SERVICE_ROLE_KEY or os.getenv("SUPABASE_SECRET_KEY")

        if supabase_url and supabase_key:
            try:
                upload_url = f"{supabase_url.rstrip('/')}/storage/v1/object/{settings.SUPABASE_BUCKET}/{filename}"
                headers = {
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": mime,
                    "x-upsert": "true"
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(upload_url, headers=headers, content=file_bytes)
                    if resp.status_code in (200, 201):
                        public_url = f"{supabase_url.rstrip('/')}/storage/v1/object/public/{settings.SUPABASE_BUCKET}/{filename}"
                        logger.info(f"Successfully uploaded recording to Supabase Storage: {public_url}")
                        return public_url, mime
                    else:
                        logger.warning(f"Supabase storage upload returned {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.error(f"Failed to upload to Supabase Storage: {e}")

        # Fallback to local endpoint
        return f"/api/recordings/{filename}", mime

    @staticmethod
    def get_recording_path(filename: str) -> Optional[Path]:
        filepath = Path(settings.RECORDINGS_PATH) / filename
        if filepath.exists() and filepath.is_file():
            return filepath
        return None
