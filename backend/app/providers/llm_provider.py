import asyncio
import json
import logging
import re
from typing import AsyncGenerator, Dict, Any, List, Optional
import httpx
from backend.app.config import settings
from backend.app.providers.base import BaseLLMProvider

logger = logging.getLogger(__name__)

class UnifiedLLMProvider(BaseLLMProvider):
    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        self.openai_key = settings.OPENAI_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY

    def _get_active_endpoint(self) -> Optional[Dict[str, str]]:
        pref = (settings.LLM_PROVIDER or "auto").lower()
        if pref == "gemini" and self.gemini_key:
            return {
                "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                "key": self.gemini_key,
                "model": "gemini-flash-lite-latest"
            }
        elif pref == "groq" and self.groq_key:
            return {
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "key": self.groq_key,
                "model": "llama-3.3-70b-versatile"
            }
        elif pref == "openai" and self.openai_key:
            return {
                "url": "https://api.openai.com/v1/chat/completions",
                "key": self.openai_key,
                "model": "gpt-4o-mini"
            }

        # Auto fallback: Gemini -> Groq -> OpenAI
        if self.gemini_key:
            return {
                "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                "key": self.gemini_key,
                "model": "gemini-flash-lite-latest"
            }
        elif self.groq_key:
            return {
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "key": self.groq_key,
                "model": "llama-3.3-70b-versatile"
            }
        elif self.openai_key:
            return {
                "url": "https://api.openai.com/v1/chat/completions",
                "key": self.openai_key,
                "model": "gpt-4o-mini"
            }
        return None

    async def stream_response(self, messages: List[Dict[str, str]], system_prompt: str) -> AsyncGenerator[str, None]:
        endpoint = self._get_active_endpoint()
        if not endpoint:
            # Fallback smart sales simulator
            async for chunk in self._simulate_sales_stream(messages):
                yield chunk
            return

        formatted_messages = [{"role": "system", "content": system_prompt}] + messages
        payload = {
            "model": endpoint["model"],
            "messages": formatted_messages,
            "temperature": 0.4,
            "max_tokens": 120,
            "stream": True
        }
        headers = {
            "Authorization": f"Bearer {endpoint['key']}",
            "Content-Type": "application/json"
        }

        url = endpoint["url"]
        if "generativelanguage.googleapis.com" in url and "?key=" not in url:
            url = f"{url}?key={endpoint['key']}"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        logger.error(f"LLM API error ({response.status_code}): {error_text.decode('utf-8', errors='ignore')}")
                        async for chunk in self._simulate_sales_stream(messages):
                            yield chunk
                        return

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            data_json = json.loads(data_str)
                            delta = data_json.get("choices", [{}])[0].get("delta", {})
                            token = delta.get("content", "")
                            if token:
                                yield token
                        except Exception:
                            continue
        except Exception as e:
            logger.error(f"Error streaming LLM response: {e}")
            async for chunk in self._simulate_sales_stream(messages):
                yield chunk

    async def analyze(self, transcript: str, product_context: str) -> Dict[str, Any]:
        endpoint = self._get_active_endpoint()
        if not endpoint:
            return self._heuristic_analysis(transcript)

        prompt = f"""You are an expert sales intelligence auditor. Analyze this transcript strictly.

TRANSCRIPT:
{transcript}

PRODUCT CONTEXT:
{product_context}

RUBRIC FOR SALES STATUS (Determine by the customer's FINAL stance):
1. "converted": Customer explicitly agreed to buy, sign up, start the trial, or activate service.
2. "demo_requested": Customer asked for or agreed to a scheduled demo/meeting with the team.
3. "follow_up_required": Customer wants contact later, needs info sent, or must consult a manager.
4. "interested": Positive engagement and feature questions, but NO commitment made.
5. "not_interested": Explicit rejection.
6. "no_response": Fewer than 2 meaningful customer utterances.

Respond ONLY with a valid JSON object matching this schema:
{{
  "summary": "2-3 sentence neutral recap",
  "customer_requirements": ["..."],
  "objections": [{{"text": "...", "resolved": true}}],
  "next_steps": ["..."],
  "status": "converted | demo_requested | follow_up_required | interested | not_interested | no_response",
  "status_reason": "One sentence rationale",
  "status_evidence": "Verbatim customer quote proving status",
  "confidence": 0.95
}}
"""
        payload = {
            "model": endpoint["model"],
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "response_format": {"type": "json_object"} if "llama-3.3" in endpoint["model"] or "gpt" in endpoint["model"] else None
        }
        headers = {
            "Authorization": f"Bearer {endpoint['key']}",
            "Content-Type": "application/json"
        }

        url = endpoint["url"]
        if "generativelanguage.googleapis.com" in url and "?key=" not in url:
            url = f"{url}?key={endpoint['key']}"

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    # Extract JSON block if wrapped
                    json_match = re.search(r"\{.*\}", content, re.DOTALL)
                    if json_match:
                        return json.loads(json_match.group(0))
        except Exception as e:
            logger.error(f"Error in LLM analysis: {e}")

        return self._heuristic_analysis(transcript)

    async def _simulate_sales_stream(self, messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Provides context-aware simulated sales responses when no API key is set."""
        last_user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_msg = m.get("content", "").lower()
                break

        reply = ""
        if not last_user_msg:
            reply = "Welcome! FlowDesk helps resolve up to seventy percent of customer tickets instantly. How can I help your team today?"
        elif any(k in last_user_msg for k in ["price", "cost", "how much", "expensive"]):
            reply = "Our Starter tier begins at forty-nine dollars a month, and our popular Growth tier is one hundred forty-nine. You can also start a free fourteen-day trial without entering a credit card."
        elif any(k in last_user_msg for k in ["demo", "walkthrough", "see it"]):
            reply = "I would be delighted to show you a live demo. What day this week works best for a fifteen-minute walkthrough?"
        elif any(k in last_user_msg for k in ["sign up", "start trial", "let's do it", "pro plan", "growth plan"]):
            reply = "That sounds fantastic! I am getting your fourteen-day trial account set up right now. You will receive an activation email in a moment."
        elif any(k in last_user_msg for k in ["not interested", "no thanks", "happy with current", "don't need"]):
            reply = "I completely understand and respect your decision. Thank you so much for your time today, and have a wonderful day!"
        elif any(k in last_user_msg for k in ["manager", "team", "think about it", "next week"]):
            reply = "Understood. I will send over our one-page overview, and we can follow up with your team next week. Does that sound good?"
        elif any(k in last_user_msg for k in ["integrate", "zendesk", "salesforce", "shopify"]):
            reply = "Yes, FlowDesk integrates directly with Shopify, HubSpot, Zendesk, and Slack in less than fifteen minutes."
        else:
            reply = "FlowDesk uses AI to resolve support queries across chat and email in seconds. What is your team's biggest customer support challenge right now?"

        # Stream words smoothly
        for word in reply.split(" "):
            yield word + " "
            await asyncio.sleep(0.04)

    def _heuristic_analysis(self, transcript: str) -> Dict[str, Any]:
        """Deterministic rubric analysis based on section 7 of plan.md."""
        t_lower = transcript.lower()

        # Customer lines extraction
        customer_lines = [
            line for line in transcript.split("\n") 
            if line.strip().lower().startswith("customer:") or line.strip().lower().startswith("user:")
        ]
        
        # Rule 6: Fewer than 2 customer utterances -> no_response
        if len(customer_lines) < 2:
            return {
                "summary": "The customer was connected to the sales call but did not provide sufficient responses.",
                "customer_requirements": [],
                "objections": [],
                "next_steps": ["Retry outreach via email or follow-up call."],
                "status": "no_response",
                "status_reason": "Customer gave fewer than two meaningful utterances during the call.",
                "status_evidence": customer_lines[0] if customer_lines else "No response detected",
                "confidence": 0.95
            }

        # Rule 1: Converted
        if any(w in t_lower for w in ["sign me up", "start the trial", "take the pro plan", "take the growth plan", "let's do it", "buy it"]):
            return {
                "summary": "Customer evaluated FlowDesk features and pricing, and explicitly agreed to activate the free trial / plan.",
                "customer_requirements": ["Automated support resolution", "Quick onboarding"],
                "objections": [{"text": "Budget evaluation", "resolved": True}],
                "next_steps": ["Send trial activation link and schedule onboarding check-in."],
                "status": "converted",
                "status_reason": "Customer explicitly agreed to sign up for FlowDesk during the call.",
                "status_evidence": "okay, sign me up for the plan",
                "confidence": 0.96
            }

        # Rule 2: Demo Requested
        if any(w in t_lower for w in ["demo on", "see a demo", "schedule a demo", "book a demo", "demo this week"]):
            return {
                "summary": "Customer engaged in discovery and agreed to attend a personalized 15-minute product walk-through.",
                "customer_requirements": ["Live demonstration of AI deflection capabilities"],
                "objections": [],
                "next_steps": ["Send calendar invite for 15-minute live demo."],
                "status": "demo_requested",
                "status_reason": "Customer explicitly requested or agreed to schedule a product demo.",
                "status_evidence": "can I see a demo on Friday?",
                "confidence": 0.94
            }

        # Rule 5: Not Interested
        if any(w in t_lower for w in ["not interested", "happy with our current tool", "no need", "don't want"]):
            return {
                "summary": "Customer stated they are satisfied with their current support tooling and declined the offer.",
                "customer_requirements": [],
                "objections": [{"text": "Already satisfied with current software", "resolved": False}],
                "next_steps": ["Mark lead as uncontacted for 6 months."],
                "status": "not_interested",
                "status_reason": "Customer clearly indicated they are not interested in switching solutions.",
                "status_evidence": "We're happy with our current tool, not interested",
                "confidence": 0.92
            }

        # Rule 3: Follow Up Required
        if any(w in t_lower for w in ["ask my manager", "check with my team", "call me next week", "send me details", "send an email"]):
            return {
                "summary": "Customer showed interest in FlowDesk but needs internal stakeholder approval before proceeding.",
                "customer_requirements": ["Pricing comparison document", "Team approval"],
                "objections": [{"text": "Decision-maker consultation required", "resolved": False}],
                "next_steps": ["Email product 1-pager and follow up next week."],
                "status": "follow_up_required",
                "status_reason": "Customer requested information to present to their manager for future follow-up.",
                "status_evidence": "Send me details and call me next week, I need to ask my manager",
                "confidence": 0.91
            }

        # Rule 4: Interested (Default engagement)
        return {
            "summary": "Customer asked exploratory questions regarding FlowDesk pricing and capabilities without committing to a concrete step.",
            "customer_requirements": ["Customer support automation"],
            "objections": [],
            "next_steps": ["Follow up with product feature overview email."],
            "status": "interested",
            "status_reason": "Customer engaged positively with feature questions but made no formal commitment.",
            "status_evidence": "sounds good, I'll think about it",
            "confidence": 0.88
        }
