# 🛠️ Technology Stack & Architecture Decisions

> Tài liệu giải thích lý do lựa chọn công nghệ và kiến trúc hệ thống cho Concert Ticket Booking Platform.

---

## Stack Overview

```
┌──────────────────────────────────────────────────┐
│                   CLIENT LAYER                   │
│                                                  │
│   React + Refine (Operation Dashboard)           │
│   + Any frontend / Postman (Customer API)        │
└──────────────────┬───────────────────────────────┘
                   │ HTTP / REST
┌──────────────────▼───────────────────────────────┐
│                   API LAYER                      │
│                                                  │
│   FastAPI (ASGI / Uvicorn)                       │
│   ├── Auto Swagger / OpenAPI docs                │
│   ├── Pydantic v2 validation                     │
│   └── Dependency Injection                       │
└───────┬──────────────────────┬───────────────────┘
        │                      │
┌───────▼──────────┐  ┌───────▼───────────────────┐
│   DATA LAYER     │  │   CACHE / LOCK LAYER      │
│                  │  │                            │
│  PostgreSQL      │  │  Redis                     │
│  + SQLAlchemy 2  │  │  ├── Distributed Lock      │
│  + Alembic       │  │  ├── Reservation TTL       │
│                  │  │  └── Rate Limiting          │
└──────────────────┘  └───────────────────────────┘
```

---

## 1. Backend Framework — FastAPI

| | Chi tiết |
|---|---|
| **Package** | `fastapi` + `uvicorn[standard]` |
| **Python** | 3.11+ |
| **Paradigm** | Async-first (ASGI) |

### Tại sao FastAPI?

**1. Async-native cho high-concurrency**

Flash sale với 300–500 booking requests/phút yêu cầu non-blocking I/O. FastAPI chạy trên ASGI (Uvicorn), mỗi worker xử lý hàng trăm concurrent connections mà không block thread khi chờ DB hoặc Redis respond.

```python
# Async endpoint — không block event loop khi query DB
@router.post("/bookings")
async def create_booking(payload: BookingCreate, db: AsyncSession = Depends(get_db)):
    return await booking_service.reserve_ticket(db, payload)
```

So sánh với Django (WSGI-default): mỗi request chiếm 1 thread/process → cần nhiều workers hơn cho cùng throughput.

**2. Auto-generated API Documentation**

Bài test yêu cầu API docs (Swagger). FastAPI tự động generate từ Pydantic schemas — không cần setup thêm bất kỳ library nào.

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

**3. Pydantic v2 — Type-safe Validation**

Mọi request/response đều được validate tự động qua Pydantic models, giảm bugs và tạo contract rõ ràng giữa frontend–backend.

```python
class BookingCreate(BaseModel):
    event_id: int
    ticket_category_id: int
    quantity: int = Field(gt=0, le=10)
    voucher_code: str | None = None
    idempotency_key: UUID  # Chống duplicate booking
```

**4. Dependency Injection**

Clean architecture: DB session, auth, Redis client được inject vào endpoint qua DI system, dễ test và maintain.

### Các alternatives đã cân nhắc

| Framework | Lý do không chọn |
|-----------|-----------------|
| **Django + DRF** | Admin panel là điểm cộng, nhưng sync-first architecture khó thể hiện tư duy thiết kế cho flash sale. ORM kém linh hoạt hơn SQLAlchemy cho complex locking queries. |
| **Flask** | Sync (WSGI), không có built-in validation, phải manual setup quá nhiều. Không phù hợp cho bài toán high-concurrency. |

---

## 2. Database — PostgreSQL

| | Chi tiết |
|---|---|
| **Engine** | PostgreSQL 15+ |
| **Driver** | `asyncpg` (async, C-based, nhanh nhất cho Python) |
| **ORM** | SQLAlchemy 2.x (async mode) |
| **Migration** | Alembic |

### Tại sao PostgreSQL?

**1. Row-level Locking — Chống Overselling**

Bài toán cốt lõi: nhiều users cùng đặt vé cuối cùng → cần lock chính xác row đang update.

```sql
-- Pessimistic lock: chỉ 1 transaction được modify row này tại 1 thời điểm
SELECT * FROM ticket_categories
WHERE id = 123 AND remaining_quantity > 0
FOR UPDATE;
```

MySQL cũng hỗ trợ, nhưng PostgreSQL có thêm `FOR UPDATE SKIP LOCKED` — cực kỳ hữu ích cho queue-style processing trong flash sale.

**2. Advisory Locks — Application-level Locking**

```sql
-- Lock theo event_id, không cần lock toàn bộ table
SELECT pg_try_advisory_xact_lock(event_id);
```

Cho phép lock ở granularity tùy chọn (per-event, per-category) mà không ảnh hưởng các rows khác.

**3. ACID Compliance + MVCC**

PostgreSQL đảm bảo transaction isolation qua MVCC, readers không block writers — quan trọng khi vừa có users browse concerts vừa có users đang booking.

### Tại sao SQLAlchemy 2.x (Async)?

```python
# Async session — non-blocking DB operations
async with async_session() as session:
    stmt = select(TicketCategory).where(
        TicketCategory.id == category_id,
        TicketCategory.remaining_quantity > 0
    ).with_for_update()  # SELECT ... FOR UPDATE
    
    result = await session.execute(stmt)
    ticket = result.scalar_one_or_none()
```

- **Async mode** kết hợp hoàn hảo với FastAPI
- **`with_for_update()`** API cho pessimistic locking
- **Relationship loading** strategies (selectinload, joinedload) chống N+1

---

## 3. Cache & Distributed Locking — Redis

| | Chi tiết |
|---|---|
| **Package** | `redis[hiredis]` (with C parser for speed) |
| **Use cases** | Distributed lock, reservation TTL, idempotency cache |

### Vai trò trong hệ thống

**1. Distributed Lock — Gatekeeper Layer**

Trước khi request chạm DB, Redis lock ngăn concurrent requests trên cùng 1 resource:

```python
# Redis lock: chỉ 1 request được vào booking logic cho seat/event này
lock_key = f"booking:event:{event_id}:category:{category_id}"
lock = redis.lock(lock_key, timeout=5, blocking_timeout=2)

if await lock.acquire():
    try:
        result = await booking_service.process(db, payload)
    finally:
        await lock.release()
```

**2. Reservation Window (TTL)**

Khi user bắt đầu checkout → "hold" vé trong Redis với TTL 10 phút. Nếu không thanh toán → tự động release.

```python
# Hold ticket trong 10 phút
await redis.setex(
    f"reservation:{booking_id}",
    timedelta(minutes=10),
    json.dumps(reservation_data)
)
```

**3. Idempotency Cache**

Chống duplicate booking từ client retries:

```python
# Nếu idempotency_key đã tồn tại → trả kết quả cũ, không tạo booking mới
cached = await redis.get(f"idempotency:{idempotency_key}")
if cached:
    return json.loads(cached)
```

---

## 4. Operation Dashboard — React + Refine

| | Chi tiết |
|---|---|
| **Framework** | React 18+ |
| **Admin toolkit** | Refine (`@refinedev/core`) |
| **UI Library** | Ant Design (`@refinedev/antd`) |
| **Data Provider** | `@refinedev/simple-rest` |

### Tại sao Refine?

**1. CRUD UI trong vài phút**

Refine tự động generate List/Create/Edit/Show pages từ resource config:

```tsx
<Refine
  dataProvider={dataProvider("http://localhost:8000/api/v1")}
  resources={[
    { name: "concerts", list: "/concerts", create: "/concerts/create", edit: "/concerts/edit/:id" },
    { name: "bookings", list: "/bookings", show: "/bookings/show/:id" },
    { name: "vouchers", list: "/vouchers", create: "/vouchers/create" },
  ]}
/>
```

**2. Kết nối FastAPI — Zero config**

FastAPI REST endpoints theo convention chuẩn → Refine `simple-rest` data provider hoạt động ngay, chỉ cần thêm `Content-Range` header:

```python
# FastAPI: thêm header cho Refine pagination
response.headers["Content-Range"] = f"bookings 0-9/100"
response.headers["Access-Control-Expose-Headers"] = "Content-Range"
```

**3. Đáp ứng Operation Dashboard requirements**

| Yêu cầu Operation Dashboard | Refine component |
|---|---|
| Monitor bookings | `<List>` + `<Table>` với filters, sorting |
| Manage concerts/tickets | `<Create>`, `<Edit>` forms |
| Validate ticket availability | Custom column với real-time data |
| Manage voucher campaigns | Thêm 1 resource `vouchers` |
| Handle failed bookings | Custom action buttons |
| Update booking status | `<Edit>` page + status dropdown |

---

## 5. Chiến lược chống Overselling — 3 Lớp Phòng Thủ

> Đây là thiết kế quan trọng nhất của hệ thống.

```
Request đặt vé
    │
    ▼
┌─────────────────────────────────┐
│  Layer 1: Redis Distributed Lock │  ← Fast gatekeeper
│  SET lock:event:123 NX PX 5000  │     Ngăn concurrent access
└────────────┬────────────────────┘
             │ (chỉ 1 request đi qua)
             ▼
┌─────────────────────────────────┐
│  Layer 2: DB Pessimistic Lock   │  ← Consistency guarantee
│  SELECT ... FOR UPDATE          │     Lock row trong transaction
└────────────┬────────────────────┘
             │ (check & update atomically)
             ▼
┌─────────────────────────────────┐
│  Layer 3: DB Constraints        │  ← Final safety net
│  CHECK (remaining_qty >= 0)     │     DB reject nếu logic sai
│  UNIQUE (event, seat)           │     Chống duplicate booking
└─────────────────────────────────┘
```

| Layer | Cơ chế | Vai trò | Khi nào active |
|-------|--------|---------|---------------|
| 1 | Redis `SET NX PX` | Giảm tải DB, chặn concurrent flood | Mọi request |
| 2 | `SELECT FOR UPDATE` | Đảm bảo isolation trong transaction | Request qua Layer 1 |
| 3 | `CHECK`, `UNIQUE` constraints | An toàn tuyệt đối ở DB level | Nếu Layer 1-2 fail |
| Bonus | Idempotency key (UUID) | Chống duplicate từ client retries | Mọi request |

---

## 6. Testing Strategy

| Tool | Mục đích |
|------|----------|
| `pytest` + `pytest-asyncio` | Unit test & integration test cho async code |
| `httpx` (AsyncClient) | Test FastAPI endpoints không cần chạy server |
| Postman Collection | API testing collection (export từ Swagger) |

```python
# Ví dụ test chống overselling
@pytest.mark.asyncio
async def test_cannot_overbook():
    """Khi chỉ còn 1 vé, 2 requests đồng thời chỉ 1 thành công."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        tasks = [
            client.post("/api/v1/bookings", json=booking_data_1),
            client.post("/api/v1/bookings", json=booking_data_2),
        ]
        results = await asyncio.gather(*tasks)
        
        success = [r for r in results if r.status_code == 201]
        failed = [r for r in results if r.status_code == 409]
        
        assert len(success) == 1
        assert len(failed) == 1
```

---

## 7. Dev Environment

### Dependencies chính

```txt
# Core
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pydantic>=2.9
pydantic-settings>=2.5

# Database
sqlalchemy[asyncio]>=2.0
asyncpg>=0.30.0
alembic>=1.14

# Cache & Locking
redis[hiredis]>=5.2

# Auth
python-jose[cryptography]
passlib[bcrypt]

# Testing
pytest>=8.3
pytest-asyncio>=0.24
httpx>=0.28

# Dev
ruff
```

### Local setup

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: concert_booking
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

```bash
# Quick start
docker-compose up -d          # Start PostgreSQL + Redis
pip install -r requirements.txt
alembic upgrade head          # Run migrations
uvicorn app.main:app --reload # Start API server
```

---

## 8. Tổng kết quyết định

| Quyết định | Trade-off đã cân nhắc |
|---|---|
| **FastAPI over Django** | Mất Admin UI built-in, nhưng đổi lại async-native + auto Swagger + lighter footprint |
| **PostgreSQL over MySQL** | Advisory locks + `SKIP LOCKED` là unique advantage cho ticket booking |
| **Redis cho locking** | Thêm 1 infra component, nhưng giảm DB contention đáng kể dưới flash sale load |
| **Refine cho Dashboard** | Nhanh hơn tự build UI, nhưng phải tuân thủ REST convention ở backend |
| **SQLAlchemy over Django ORM** | Verbose hơn, nhưng kiểm soát tốt hơn cho `FOR UPDATE`, raw SQL khi cần |
