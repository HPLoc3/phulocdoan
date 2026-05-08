from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

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

from app.api import bookings, events, venues

app.include_router(bookings.router, prefix=f"{settings.API_V1_STR}/bookings", tags=["bookings"])
app.include_router(events.router, prefix=f"{settings.API_V1_STR}/events", tags=["events"])
app.include_router(venues.router, prefix=f"{settings.API_V1_STR}/venues", tags=["venues"])
