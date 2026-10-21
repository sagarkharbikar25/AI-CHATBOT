import asyncio
import hmac
import hashlib
import json
import logging
import os
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.schemas import (
    CreateCallRequest, CreateCallResponse, CallDetailResponse, 
    FinalizeCallRequest, CallAnalysis
)
from backend.app.services.calls_repo import CallsRepository
from backend.app.services.storage import StorageService
from backend.app.services.analysis import AnalysisService
from backend.app.ws.call_session import CallSession

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("voice-sales-bot")

app = FastAPI(
    title="AI Voice Sales Bot API",
    description="Real-time voice conversation pipeline, turn state machine, audio recording, and sales intelligence analysis.",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache loaded products
PRODUCTS: Dict[str, Any] = {}

def load_products():
    products_dir = Path(settings.PRODUCTS_PATH)
    if not products_dir.exists():
        return
    for file in products_dir.glob("*.json"):
        try:
            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)
                PRODUCTS[data.get("id", file.stem)] = data
                logger.info(f"Loaded product config: {data.get('id')}")
        except Exception as e:
            logger.error(f"Failed to load product config {file}: {e}")

load_products()

def generate_ws_token(call_id: str) -> str:
    return hmac.new(
        settings.WS_TOKEN_SECRET.encode(),
        call_id.encode(),
        hashlib.sha256
    ).hexdigest()

def verify_ws_token(call_id: str, token: str) -> bool:
    expected = generate_ws_token(call_id)
    return hmac.compare_digest(expected, token)

# --- REST Endpoints ---

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Voice Sales Bot",
        "version": "1.0.0",
        "llm_provider": settings.LLM_PROVIDER,
        "tts_provider": settings.TTS_PROVIDER
    }

@app.get("/api/products")
def list_products():
    return [
        {
            "id": p.get("id"),
            "name": p.get("name"),
            "tagline": p.get("tagline"),
            "one_liner": p.get("one_liner"),
            "languages": list(p.get("languages", {}).keys()) or ["en", "hi"]
        }
        for p in PRODUCTS.values()
    ]

@app.post("/api/calls", response_model=CreateCallResponse)
def create_call(req: CreateCallRequest):
    if not req.consent_given:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Mandatory recording consent must be granted before initiating a call."
        )

    product_id = req.product_id or "flowdesk"
    if product_id not in PRODUCTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Product '{product_id}' not found."
        )

    call_id = str(uuid.uuid4())
    ws_token = generate_ws_token(call_id)

    CallsRepository.create_call(
        call_id=call_id,
        session_id=req.session_id,
        product_id=product_id,
        language=req.language,
        consent_given=req.consent_given
    )

    ws_url = f"/ws/calls/{call_id}?token={ws_token}"
    return CreateCallResponse(
        call_id=call_id,
        ws_token=ws_token,
        ws_url=ws_url,
        product_id=product_id,
        language=req.language
    )

@app.post("/api/calls/{call_id}/recording")
async def upload_recording(call_id: str, file: UploadFile = File(...)):
    call = CallsRepository.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    content = await file.read()
    ext = file.filename.split(".")[-1] if "." in file.filename else "webm"
    rec_url, mime = await StorageService.save_recording(call_id, content, ext)
    CallsRepository.update_call_recording(call_id, rec_url, mime)

    return {"status": "uploaded", "recording_url": rec_url, "size_bytes": len(content)}

@app.post("/api/calls/{call_id}/finalize")
async def finalize_call(call_id: str, req: FinalizeCallRequest):
    call = CallsRepository.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    messages = CallsRepository.get_messages(call_id)
    product_config = PRODUCTS.get(call.get("product_id", "flowdesk"), {})
    product_context = f"{product_config.get('name')}: {product_config.get('one_liner')}"

    # Run analysis service with deterministic guards
    analysis_svc = AnalysisService()
    analysis_result = await analysis_svc.run_analysis(messages, product_context)

    # Persist in DB
    CallsRepository.finalize_call(
        call_id=call_id,
        end_reason=req.end_reason or "user_ended",
        duration_sec=req.duration_sec or 0,
        analysis=analysis_result
    )

    updated_call = CallsRepository.get_call(call_id)
    return {
        "status": "finalized",
        "analysis": analysis_result,
        "call": updated_call
    }

@app.get("/api/calls")
def list_calls(session_id: str = Query(..., description="Browser session ID")):
    calls = CallsRepository.list_calls_by_session(session_id)
    return calls

@app.get("/api/calls/{call_id}")
def get_call_detail(call_id: str):
    call = CallsRepository.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    messages = CallsRepository.get_messages(call_id)
    call["messages"] = messages
    return call

@app.post("/api/calls/{call_id}/reanalyze")
async def reanalyze_call(call_id: str):
    call = CallsRepository.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    messages = CallsRepository.get_messages(call_id)
    product_config = PRODUCTS.get(call.get("product_id", "flowdesk"), {})
    product_context = f"{product_config.get('name')}: {product_config.get('one_liner')}"

    analysis_svc = AnalysisService()
    analysis_result = await analysis_svc.run_analysis(messages, product_context)

    CallsRepository.finalize_call(
        call_id=call_id,
        end_reason=call.get("end_reason", "user_ended"),
        duration_sec=call.get("duration_sec", 0),
        analysis=analysis_result
    )
    return {"status": "reanalyzed", "analysis": analysis_result}

@app.delete("/api/calls/{call_id}")
def delete_call(call_id: str):
    success = CallsRepository.delete_call(call_id)
    if not success:
        raise HTTPException(status_code=404, detail="Call not found")
    return {"status": "deleted", "id": call_id}

@app.get("/api/recordings/{filename}")
def serve_recording(filename: str):
    filepath = StorageService.get_recording_path(filename)
    if not filepath:
        raise HTTPException(status_code=404, detail="Recording file not found")
    return FileResponse(filepath, media_type="audio/webm")

# --- WebSocket Endpoint ---

@app.websocket("/ws/calls/{call_id}")
async def websocket_call_endpoint(websocket: WebSocket, call_id: str, token: Optional[str] = Query(None)):
    await websocket.accept()

    # Verify call exists and token is valid
    call = CallsRepository.get_call(call_id)
    if not call:
        await websocket.send_text(json.dumps({"type": "error", "message": "Call not found"}))
        await websocket.close(code=4004)
        return

    if token and not verify_ws_token(call_id, token):
        logger.warning(f"Invalid token for call {call_id}")

    product_id = call.get("product_id", "flowdesk")
    product_config = PRODUCTS.get(product_id, {})
    language = call.get("language", "en")

    session = CallSession(
        ws=websocket,
        call_id=call_id,
        product_config=product_config,
        language=language
    )

    start_task = asyncio.create_task(session.start())

    try:
        while True:
            # Handle incoming WS frames
            message = await websocket.receive()
            if "text" in message:
                try:
                    payload = json.loads(message["text"])
                    msg_type = payload.get("type")

                    if msg_type == "user_speech":
                        await session.handle_user_speech(
                            text=payload.get("text", ""),
                            is_final=payload.get("is_final", True)
                        )
                    elif msg_type == "barge_in":
                        await session.cancel_active_turn()
                    elif msg_type == "audio_complete":
                        # Client finished playing bot audio — now safe to start silence timer
                        await session.handle_audio_complete()
                    elif msg_type == "end":
                        await session.end_call(reason=payload.get("reason", "user_ended"))
                        break
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON received over WebSocket")

            elif "bytes" in message:
                # Binary audio frames from browser mic
                pass

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for call {call_id}")
    except Exception as e:
        logger.error(f"Unexpected error in websocket loop: {e}")
    finally:
        if not start_task.done():
            start_task.cancel()
        await session.end_call(reason="disconnected")
