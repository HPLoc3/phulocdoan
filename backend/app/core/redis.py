import redis.asyncio as redis
from app.core.config import settings

# Khởi tạo connection pool tới Redis
redis_client = redis.from_url(
    settings.REDIS_URI,
    encoding="utf-8",
    decode_responses=True
)

async def get_redis():
    """Dependency injection cho Redis"""
    yield redis_client
