from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class SalesStatus(str, Enum):
    CONVERTED = "converted"
    INTERESTED = "interested"
    FOLLOW_UP_REQUIRED = "follow_up_required"
    NOT_INTERESTED = "not_interested"
    DEMO_REQUESTED = "demo_requested"
    NO_RESPONSE = "no_response"

class CallState(str, Enum):
    IN_PROGRESS = "in_progress"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class EndReason(str, Enum):
    USER_ENDED = "user_ended"
    BOT_ENDED = "bot_ended"
    SILENCE = "silence"
    TIMEOUT = "timeout"
    ERROR = "error"

class CreateCallRequest(BaseModel):
    session_id: str = Field(..., description="Anonymous browser session identifier")
    product_id: str = Field("flowdesk", description="Selected product configuration ID")
    language: str = Field("en", description="Language code: en or hi")
    consent_given: bool = Field(..., description="Must be true to initiate voice call")

class CreateCallResponse(BaseModel):
    call_id: str
    ws_token: str
    ws_url: str
    product_id: str
    language: str

class ObjectionItem(BaseModel):
    text: str
    resolved: bool = False

class CallAnalysis(BaseModel):
    summary: str = Field(..., description="2-3 sentence neutral recap")
    customer_requirements: List[str] = Field(default_factory=list)
    objections: List[ObjectionItem] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    status: SalesStatus
    status_reason: str = Field(..., description="One sentence rationale for status assignment")
    status_evidence: str = Field("", description="Short transcript quote directly supporting status")
    confidence: float = Field(0.9, ge=0.0, le=1.0)

class MessageRecord(BaseModel):
    id: Optional[int] = None
    call_id: str
    seq: int
    role: str  # "bot" or "customer"
    text: str
    t_start_ms: Optional[int] = None
    t_end_ms: Optional[int] = None
    interrupted: bool = False

class CallDetailResponse(BaseModel):
    id: str
    session_id: str
    product_id: str
    language: str
    call_state: str
    end_reason: Optional[str] = None
    consent_given: bool
    consent_at: str
    started_at: str
    ended_at: Optional[str] = None
    duration_sec: Optional[int] = None
    recording_url: Optional[str] = None
    recording_path: Optional[str] = None
    recording_mime: Optional[str] = None
    summary: Optional[str] = None
    requirements: List[str] = Field(default_factory=list)
    objections: List[Dict[str, Any]] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    sales_status: Optional[str] = None
    status_reason: Optional[str] = None
    status_evidence: Optional[str] = None
    analysis_confidence: Optional[float] = None
    messages: List[MessageRecord] = Field(default_factory=list)

class FinalizeCallRequest(BaseModel):
    end_reason: Optional[str] = "user_ended"
    duration_sec: Optional[int] = 0
