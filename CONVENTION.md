# 📝 Coding Guideline & Convention

Tài liệu này hướng dẫn các quy chuẩn viết code, cách thêm một API mới và cách thực thi unit test trong dự án.

---

## 1. Coding Convention

### Backend (Python/FastAPI)
- **Style Guide:** Tuân thủ [PEP 8](https://peps.python.org/pep-0008/).
- **Linter & Formatter:** Sử dụng `ruff` để kiểm tra và format code.
- **Typing:** Bắt buộc sử dụng type hints cho tất cả các functions (arguments và return type).
- **Naming Convention:**
  - Variables/Functions: `snake_case`
  - Classes/Models: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`
- **File Structure:** Mỗi module (như `bookings`, `events`) nên có các file `router.py`, `schemas.py`, `services.py`.

### Frontend (React/TypeScript)
- **Style Guide:** Sử dụng ESLint (theo chuẩn React) và Prettier.
- **Naming Convention:**
  - Components: `PascalCase` (ví dụ `EventList.tsx`)
  - Variables/Functions: `camelCase`
  - Files/Folders: `kebab-case` cho thư mục, `PascalCase` cho component files.
- **Typing:** Sử dụng TypeScript interfaces/types cho tất cả các props và data models.

---

## 2. Cách tạo API mới (Backend)

Hệ thống tuân theo kiến trúc 3 lớp (Router -> Service -> Database). Dưới đây là luồng các bước để thêm một API mới:

### Bước 1: Định nghĩa Pydantic Schema (`schemas.py`)
Tạo request/response model để FastAPI tự động validate data và sinh Swagger docs.
```python
from pydantic import BaseModel

class ItemCreate(BaseModel):
    name: str
    quantity: int
```

### Bước 2: Tạo Service Logic (`services.py`)
Viết logic xử lý nghiệp vụ, không chứa logic của framework web (HTTP request/response).
```python
from sqlalchemy.ext.asyncio import AsyncSession
from src.models import Item

async def create_item(db: AsyncSession, payload: ItemCreate):
    new_item = Item(name=payload.name, quantity=payload.quantity)
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return new_item
```

### Bước 3: Đăng ký Endpoint (`router.py`)
Tạo route gọi tới service layer.
```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db

router = APIRouter(prefix="/items", tags=["Items"])

@router.post("/", response_model=ItemResponse)
async def api_create_item(payload: ItemCreate, db: AsyncSession = Depends(get_db)):
    return await create_item(db, payload)
```

### Bước 4: Khai báo Router ở `main.py`
```python
from src.api.items import router as items_router
app.include_router(items_router)
```

---

## 3. Cách chạy Unit Test

Dự án sử dụng `pytest` kết hợp với `pytest-asyncio` và `httpx` (để test bất đồng bộ).

### 3.1 Cài đặt môi trường test
Đảm bảo bạn đã cài đặt các thư viện test (thường nằm trong `requirements.txt` hoặc dev dependencies):
```bash
pip install pytest pytest-asyncio httpx
```

### 3.2 Cấu trúc thư mục test
Các file test được đặt trong thư mục `tests/` ở thư mục gốc của backend. Tên file phải bắt đầu bằng `test_` (ví dụ: `test_concurrency.py`, `test_bookings.py`).

### 3.3 Chạy tất cả Unit Tests
Mở terminal, di chuyển vào thư mục `backend/` và chạy lệnh:
```bash
cd backend
pytest
```
Lệnh này sẽ tự động tìm kiếm toàn bộ các file `test_*.py` và thực thi chúng.

### 3.4 Chạy một file test hoặc hàm cụ thể
- **Chạy một file cụ thể:**
```bash
pytest tests/test_concurrency.py
```
- **Chạy một hàm test cụ thể (theo tên):**
```bash
pytest tests/test_concurrency.py -k "test_cannot_overbook"
```

### 3.5 Các cờ (flags) hữu ích của pytest
- `-v`: (Verbose) Hiển thị chi tiết các test case pass/fail.
- `-s`: In ra các kết quả `print()` từ trong code lúc chạy test.
- `--disable-warnings`: Tắt các cảnh báo (warnings) giúp console sạch hơn.
