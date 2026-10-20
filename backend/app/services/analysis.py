import logging
from typing import Dict, Any, List
from backend.app.schemas import CallAnalysis, SalesStatus
from backend.app.providers.llm_provider import UnifiedLLMProvider

logger = logging.getLogger(__name__)

class AnalysisService:
    def __init__(self, llm_provider: UnifiedLLMProvider = None):
        self.llm = llm_provider or UnifiedLLMProvider()

    async def run_analysis(self, transcript_messages: List[Dict[str, Any]], product_context: str) -> Dict[str, Any]:
        """
        Executes analysis with deterministic post-processing guards per section 7 of plan.md:
        1. Short-circuit: <2 meaningful customer utterances => no_response
        2. Evidence guard: 'converted' or 'demo_requested' requires non-empty evidence
        3. Confidence guard: <0.5 confidence downgrades to 'follow_up_required'
        """
        customer_utterances = [
            m["text"].strip() for m in transcript_messages 
            if m.get("role") in ("customer", "user") and len(m.get("text", "").strip()) > 1
        ]

        # Guard 1: Short circuit on insufficient customer response
        if len(customer_utterances) < 2:
            evidence = customer_utterances[0] if customer_utterances else "Customer remained silent"
            return {
                "summary": "Customer did not provide sufficient responses during the call.",
                "customer_requirements": [],
                "objections": [],
                "next_steps": ["Flag for automated follow-up email."],
                "status": SalesStatus.NO_RESPONSE.value,
                "status_reason": "Customer gave fewer than two meaningful utterances during the call.",
                "status_evidence": evidence,
                "confidence": 1.0
            }

        # Build transcript string
        transcript_text = "\n".join([
            f"{m.get('role', 'speaker').title()}: {m.get('text', '')}"
            for m in transcript_messages
        ])

        # Run provider analysis
        raw_analysis = await self.llm.analyze(transcript_text, product_context)

        # Enforce guards on analysis output
        status = raw_analysis.get("status", "follow_up_required")
        evidence = str(raw_analysis.get("status_evidence", "")).strip()
        confidence = float(raw_analysis.get("confidence", 0.8))

        # Guard 2: Evidence guard for high commitment statuses
        if status in ("converted", "demo_requested") and (not evidence or len(evidence) < 3):
            logger.warning(f"Status '{status}' lacked verifiable evidence quote. Downgrading to follow_up_required.")
            status = "follow_up_required"
            raw_analysis["status_reason"] = "Downgraded by guard: missing transcript quote proving explicit commitment."

        # Guard 3: Low confidence safeguard
        if confidence < 0.5:
            logger.warning(f"Confidence {confidence} is below 0.5 threshold. Downgrading to follow_up_required.")
            status = "follow_up_required"
            raw_analysis["status_reason"] = "Downgraded by guard: low classifier confidence."

        raw_analysis["status"] = status
        raw_analysis["status_evidence"] = evidence
        raw_analysis["confidence"] = confidence

        # Validate with Pydantic
        try:
            validated = CallAnalysis(**raw_analysis)
            return validated.model_dump()
        except Exception as e:
            logger.error(f"Pydantic validation failed for analysis: {e}")
            return raw_analysis
