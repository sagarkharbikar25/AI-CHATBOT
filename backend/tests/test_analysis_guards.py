import pytest
from backend.app.services.analysis import AnalysisService
from backend.app.schemas import SalesStatus

@pytest.mark.asyncio
async def test_no_response_short_circuit():
    svc = AnalysisService()
    # 0 customer utterances
    res = await svc.run_analysis([], "FlowDesk context")
    assert res["status"] == SalesStatus.NO_RESPONSE.value

    # 1 customer utterance only (<2 rule)
    res2 = await svc.run_analysis([
        {"role": "bot", "text": "Hello, how are you?"},
        {"role": "customer", "text": "Hi"}
    ], "FlowDesk context")
    assert res2["status"] == SalesStatus.NO_RESPONSE.value

@pytest.mark.asyncio
async def test_converted_status_with_evidence():
    svc = AnalysisService()
    messages = [
        {"role": "bot", "text": "FlowDesk starter plan is forty-nine dollars a month."},
        {"role": "customer", "text": "That sounds great for our team size."},
        {"role": "bot", "text": "Would you like to get started?"},
        {"role": "customer", "text": "Yes, please sign me up for the plan today."}
    ]
    res = await svc.run_analysis(messages, "FlowDesk context")
    assert res["status"] == SalesStatus.CONVERTED.value
    assert len(res["status_evidence"]) > 0

@pytest.mark.asyncio
async def test_demo_requested_status():
    svc = AnalysisService()
    messages = [
        {"role": "bot", "text": "FlowDesk automates seventy percent of tickets."},
        {"role": "customer", "text": "We have 10 support agents handling tickets."},
        {"role": "bot", "text": "We can show your team how the deflection works."},
        {"role": "customer", "text": "Can I see a demo on Friday?"}
    ]
    res = await svc.run_analysis(messages, "FlowDesk context")
    assert res["status"] == SalesStatus.DEMO_REQUESTED.value

@pytest.mark.asyncio
async def test_not_interested_status():
    svc = AnalysisService()
    messages = [
        {"role": "bot", "text": "FlowDesk is an AI helpdesk for SMBs."},
        {"role": "customer", "text": "We already have a system."},
        {"role": "bot", "text": "FlowDesk can sit right on top of it."},
        {"role": "customer", "text": "We're happy with our current tool, not interested."}
    ]
    res = await svc.run_analysis(messages, "FlowDesk context")
    assert res["status"] == SalesStatus.NOT_INTERESTED.value

@pytest.mark.asyncio
async def test_follow_up_required_status():
    svc = AnalysisService()
    messages = [
        {"role": "bot", "text": "FlowDesk costs forty nine dollars."},
        {"role": "customer", "text": "Looks interesting."},
        {"role": "bot", "text": "Shall we get you on the 14-day free trial?"},
        {"role": "customer", "text": "Send me details and call me next week, I need to ask my manager."}
    ]
    res = await svc.run_analysis(messages, "FlowDesk context")
    assert res["status"] == SalesStatus.FOLLOW_UP_REQUIRED.value
