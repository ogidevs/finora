from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import CategoryType


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["Food & Dining"])
    type: CategoryType = Field(CategoryType.EXPENSE, examples=[CategoryType.EXPENSE])
    parent_id: Optional[int] = Field(None, description="Parent category ID for subcategories")
    color: Optional[str] = Field(None, examples=["#4F46E5"])
    icon: Optional[str] = Field(None, examples=["utensils"])


class CategoryCreate(CategoryBase):
    pass


class SubcategoryOut(BaseModel):
    id: int
    name: str
    type: CategoryType
    parent_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryOut(CategoryBase):
    id: int
    user_id: Optional[int]
    subcategories: List[SubcategoryOut] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
