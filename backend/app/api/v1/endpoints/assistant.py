from datetime import date
from typing import Optional
from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantInsightResponse,
)
from app.services.assistant_service import (
    chat_with_assistant,
    get_assistant_insights,
)

router = APIRouter()


@router.get(
    "/insights",
    response_model=AssistantInsightResponse,
    summary="Get AI financial assistant analysis and recommendations",
)
async def get_insights(
    current_user: CurrentUserDep,
    db: SessionDep,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
) -> AssistantInsightResponse:
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year
    return await get_assistant_insights(db, current_user, target_month, target_year)


@router.post(
    "/chat",
    response_model=AssistantChatResponse,
    summary="Chat with the AI financial assistant",
)
async def chat_assistant(
    payload: AssistantChatRequest,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> AssistantChatResponse:
    today = date.today()
    target_month = payload.month or today.month
    target_year = payload.year or today.year
    return await chat_with_assistant(
        db,
        current_user,
        payload.message,
        target_month,
        target_year
    )
