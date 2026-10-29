from fastapi import APIRouter
from app.api.v1.endpoints import (
    accounts,
    analytics,
    auth,
    categories,
    health,
    receipts,
    settings,
    transactions,
    assistant,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health & System"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(receipts.router, prefix="/receipts", tags=["Receipts & OCR"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["AI Assistant"])

