You are an expert sales intelligence auditor. Analyze the following transcript of an AI sales call for {product_name}.

TRANSCRIPT:
{transcript}

PRODUCT REFERENCE:
{product_context}

RUBRIC FOR SALES STATUS (Determine by the customer's FINAL stance):
1. "converted": Customer explicitly agreed to buy, sign up, start the trial, or activate the service during this call.
2. "demo_requested": Customer asked for or agreed to a scheduled demo or meeting with the team, without purchasing yet.
3. "follow_up_required": Customer expressed interest or needed more info, but requested to be contacted later or needs to check with a manager/team.
4. "interested": Positive engagement, asking questions and liking features, but made NO concrete commitment or next step.
5. "not_interested": Explicit rejection (e.g. "we do not need this", "no thanks", "not interested").
6. "no_response": Customer remained completely silent or gave fewer than 2 meaningful utterances.

REQUIRED OUTPUT JSON FORMAT (Return ONLY a valid JSON object matching this schema, no surrounding commentary):
{
  "summary": "2-3 sentence neutral recap of the conversation",
  "customer_requirements": ["list of explicit requirements or pain points mentioned by customer"],
  "objections": [
    {
      "text": "objection raised",
      "resolved": true
    }
  ],
  "next_steps": ["actionable next steps"],
  "status": "converted | demo_requested | follow_up_required | interested | not_interested | no_response",
  "status_reason": "One concise sentence explaining why this status was assigned",
  "status_evidence": "Verbatim quote from customer in the transcript proving this status (must NOT be empty if status is converted or demo_requested)",
  "confidence": 0.95
}
