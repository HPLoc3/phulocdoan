from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_db
from app.models.event import Event, TicketCategory
from app.schemas.event import (
    TicketCategoryCreate,
    TicketCategoryUpdate,
    TicketCategoryResponse,
)

router = APIRouter()


@router.post(
    "/events/{event_id}/ticket-categories",
    response_model=TicketCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["ticket-categories"],
)
async def create_category(
    event_id: int,
    payload: TicketCategoryCreate,
    db: AsyncSession = Depends(get_db),
):
    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if payload.total_quantity <= 0:
        raise HTTPException(status_code=400, detail="total_quantity phải > 0")
    if payload.price < 0:
        raise HTTPException(status_code=400, detail="price không thể âm")

    category = TicketCategory(
        event_id=event_id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        total_quantity=payload.total_quantity,
        remaining_quantity=payload.total_quantity,
        max_per_booking=payload.max_per_booking,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.patch(
    "/ticket-categories/{category_id}",
    response_model=TicketCategoryResponse,
    tags=["ticket-categories"],
)
async def update_category(
    category_id: int,
    payload: TicketCategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    category = (
        await db.execute(select(TicketCategory).where(TicketCategory.id == category_id))
    ).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Ticket category not found")

    data = payload.model_dump(exclude_unset=True)

    if "total_quantity" in data:
        new_total = data["total_quantity"]
        sold = category.total_quantity - category.remaining_quantity
        if new_total < sold:
            raise HTTPException(
                status_code=400,
                detail=f"Không thể giảm tổng số vé xuống dưới số đã bán ({sold})",
            )
        category.remaining_quantity = new_total - sold
        category.total_quantity = new_total
        data.pop("total_quantity")

    if "price" in data and data["price"] is not None and data["price"] < 0:
        raise HTTPException(status_code=400, detail="price không thể âm")

    for key, value in data.items():
        setattr(category, key, value)

    await db.commit()
    await db.refresh(category)
    return category


@router.delete(
    "/ticket-categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["ticket-categories"],
)
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    category = (
        await db.execute(select(TicketCategory).where(TicketCategory.id == category_id))
    ).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Ticket category not found")

    sold = category.total_quantity - category.remaining_quantity
    if sold > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Không thể xoá loại vé đã bán {sold} vé. Hãy huỷ event trước.",
        )

    await db.delete(category)
    await db.commit()
    return None
