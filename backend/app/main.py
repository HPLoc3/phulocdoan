import asyncio
from contextlib import suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.services.booking_service import BookingService

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Backend API cho Concert Ticket Booking Platform (GEEK Up Test)"
)

# Cấu hình CORS để frontend React Refine gọi được
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong thực tế cần setup origin cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Content-Range rất quan trọng cho React Admin/Refine pagination
    expose_headers=["Content-Range", "X-Total-Count"]
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Concert Ticket Booking API is running"}


expiry_task: asyncio.Task | None = None


async def booking_expiry_worker():
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await BookingService.expire_stale_bookings(db)
        except Exception as exc:
            print(f"[booking-expiry-worker] {exc}")
        await asyncio.sleep(30)


@app.on_event("startup")
async def start_booking_expiry_worker():
    global expiry_task
    expiry_task = asyncio.create_task(booking_expiry_worker())


@app.on_event("shutdown")
async def stop_booking_expiry_worker():
    if expiry_task:
        expiry_task.cancel()
        with suppress(asyncio.CancelledError):
            await expiry_task

from app.api import auth, bookings, events, venues, ticket_categories

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(bookings.router, prefix=f"{settings.API_V1_STR}/bookings", tags=["bookings"])
app.include_router(events.router, prefix=f"{settings.API_V1_STR}/events", tags=["events"])
app.include_router(venues.router, prefix=f"{settings.API_V1_STR}/venues", tags=["venues"])
app.include_router(ticket_categories.router, prefix=settings.API_V1_STR)
