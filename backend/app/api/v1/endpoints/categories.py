from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.models.category import Category
from app.models.enums import CategoryType
from app.schemas.category import CategoryCreate, CategoryOut
from app.services.seeder import cleanup_duplicate_defaults

router = APIRouter()


@router.get(
    "/",
    response_model=List[CategoryOut],
    summary="List categories and subcategories",
    description="Returns all top-level categories with their nested subcategories for the current user.",
)
async def list_categories(
    current_user: CurrentUserDep,
    db: SessionDep,
    type: Optional[CategoryType] = Query(None, description="Filter by category type (EXPENSE or INCOME)"),
) -> List[CategoryOut]:
    await cleanup_duplicate_defaults(db, current_user.id)

    query = (
        select(Category)
        .options(selectinload(Category.subcategories))
        .where(
            Category.user_id == current_user.id,
            Category.parent_id.is_(None),
        )
        .order_by(Category.id)
    )

    if type:
        query = query.where(Category.type == type)

    result = await db.execute(query)
    categories = result.scalars().all()
    return [CategoryOut.model_validate(c) for c in categories]


@router.post(
    "/",
    response_model=CategoryOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a category or subcategory",
    description="Creates a new top-level category (parent_id=None) or a subcategory under an existing parent category.",
)
async def create_category(
    cat_in: CategoryCreate,
    current_user: CurrentUserDep,
    db: SessionDep,
) -> CategoryOut:
    if cat_in.parent_id is not None:
        parent_res = await db.execute(
            select(Category).where(
                Category.id == cat_in.parent_id,
                Category.user_id == current_user.id,
            )
        )
        parent = parent_res.scalar_one_or_none()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent category not found.",
            )
        if parent.parent_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot nest a subcategory inside another subcategory.",
            )

    dup_query = select(Category).where(
        Category.user_id == current_user.id,
        Category.name.ilike(cat_in.name.strip()),
        Category.type == cat_in.type,
        Category.parent_id == cat_in.parent_id,
    )
    existing = (await db.execute(dup_query)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A category with this name already exists.",
        )

    new_cat = Category(
        user_id=current_user.id,
        name=cat_in.name.strip(),
        type=cat_in.type,
        parent_id=cat_in.parent_id,
        color=cat_in.color,
        icon=cat_in.icon,
    )
    db.add(new_cat)
    await db.commit()

    res = await db.execute(
        select(Category)
        .options(selectinload(Category.subcategories))
        .where(Category.id == new_cat.id)
    )
    loaded_cat = res.scalar_one()
    return CategoryOut.model_validate(loaded_cat)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a category or subcategory",
    description="Deletes a category or subcategory belonging to the current user.",
)
async def delete_category(
    category_id: int,
    current_user: CurrentUserDep,
    db: SessionDep,
):
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
    )
    cat = result.scalar_one_or_none()

    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    await db.delete(cat)
    await db.commit()
    return None
