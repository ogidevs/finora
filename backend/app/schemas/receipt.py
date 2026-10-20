import datetime as dt
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class ReceiptScanResponse(BaseModel):
    amount: Optional[Decimal] = Field(None, description="Extracted total amount")
    date: dt.date = Field(..., description="Detected transaction date")
    currency: str = Field("RSD", description="Detected currency (EUR or RSD)")
    items_note: Optional[str] = Field(None, description="Extracted line items formatted for note")
    raw_text: str = Field("", description="Raw OCR extracted text")
