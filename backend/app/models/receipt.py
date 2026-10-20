from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.transaction import Transaction


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("transactions.id", ondelete="SET NULL"),
        unique=True,
        nullable=True
    )
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    ocr_raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    transaction: Mapped[Optional["Transaction"]] = relationship("Transaction", back_populates="receipt")

    def __repr__(self) -> str:
        return f"<Receipt(id={self.id}, transaction_id={self.transaction_id}, image_path='{self.image_path}')>"
