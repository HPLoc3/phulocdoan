# 🧪 Testing Guide

Hai loại test trong project:

| Loại | File pattern | Cần API chạy? | Cần DB seed? |
|---|---|---|---|
| **Unit** (logic thuần) | `test_security.py` | ❌ | ❌ |
| **Integration** (HTTP) | `test_*_api.py` + `test_concurrency.py` | ✅ `localhost:8000` | ✅ `event_id=1` |

Tất cả test integration được mark `@pytest.mark.integration` để có thể loại trừ khi cần (vd CI nhanh).

---

## 1. Cách chạy

### 1.1. Chạy trong Docker (khuyên dùng)

API + DB + Redis đã được orchestrate sẵn — không cần cài Python local.

```bash
# Khởi chạy stack (nếu chưa)
docker compose up -d

# Chạy toàn bộ test suite
docker exec phulocdoan-api-1 sh -c "cd /app && API_URL=http://localhost:8000 pytest"

# Chỉ unit tests (không cần API/DB)
docker exec phulocdoan-api-1 sh -c "cd /app && pytest -m 'not integration'"

# Chỉ integration tests
docker exec phulocdoan-api-1 sh -c "cd /app && API_URL=http://localhost:8000 pytest -m integration"

# Chạy 1 file
docker exec phulocdoan-api-1 sh -c "cd /app && API_URL=http://localhost:8000 pytest tests/test_auth_api.py -v"

# Chạy 1 test
docker exec phulocdoan-api-1 sh -c "cd /app && API_URL=http://localhost:8000 pytest tests/test_auth_api.py::TestRegister::test_duplicate_email_rejected -v"
```

### 1.2. Chạy local (nếu đã có venv)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Đảm bảo API đang chạy ở localhost:8000 (qua docker compose)
pytest                       # tất cả
pytest -m 'not integration'  # chỉ unit
pytest tests/test_security.py -v
```

> Có thể override URL: `API_URL=http://10.0.0.5:8000 pytest`.

### 1.3. Concurrency / Flash-sale stress test

File [test_concurrency.py](test_concurrency.py) là kịch bản tải nặng (100 request đồng thời) — không chạy trong suite chuẩn. Chạy thủ công:

```bash
# Reset tồn vé về 5 cho test thấy hiệu ứng overselling guard
docker exec phulocdoan-db-1 psql -U admin -d concert_booking \
  -c "UPDATE ticket_categories SET remaining_quantity = 5 WHERE id = 1;"

docker exec phulocdoan-api-1 sh -c "cd /app && python tests/test_concurrency.py"
```

Mong đợi: đúng 5 request HTTP 201, phần còn lại bị `Hết vé (400)` hoặc `Server bận (503)` — không bao giờ overselling.

---

## 2. Cấu trúc

```
tests/
├── conftest.py                       # Fixtures dùng chung (client, auth_headers, ...)
├── test_security.py                  # Unit: password hashing + JWT
├── test_auth_api.py                  # Integration: /auth/register|login|me
├── test_ticket_categories_api.py     # Integration: /ticket-categories
├── test_bookings_me_api.py           # Integration: /bookings/me
└── test_concurrency.py               # Stress test (chạy thủ công)
```

### Fixtures sẵn có trong [conftest.py](conftest.py)

| Fixture | Phạm vi | Trả về |
|---|---|---|
| `api_url` | session | `http://127.0.0.1:8000/api/v1` (override `API_URL`) |
| `client` | function | `httpx.AsyncClient` đã set base_url |
| `unique_email` | function | email random `pytest-<uuid>@example.com` |
| `auth_headers` | function | `{"Authorization": "Bearer ..."}` của user vừa register |

---

## 3. Convention thêm test mới

### 3.1. Đặt tên

| Loại | Pattern | Ví dụ |
|---|---|---|
| Unit | `test_<module>.py` | `test_security.py` |
| Integration | `test_<feature>_api.py` | `test_voucher_api.py` |

Class group theo verb / endpoint group: `TestRegister`, `TestUpdate`, ... Hàm test: `test_<scenario>` (`test_duplicate_email_rejected`, `test_zero_quantity_rejected`).

### 3.2. Template Integration test

```python
"""Integration tests for /api/v1/<feature> — requires running API."""
import pytest

pytestmark = pytest.mark.integration


class TestSomething:
    async def test_happy_path(self, client, auth_headers):
        res = await client.post(
            "/your-endpoint",
            headers=auth_headers,
            json={"foo": "bar"},
        )
        assert res.status_code == 201
        assert res.json()["foo"] == "bar"

    async def test_unauthorized(self, client):
        res = await client.post("/your-endpoint", json={"foo": "bar"})
        assert res.status_code == 401
```

Dùng `pytestmark = pytest.mark.integration` ở đầu module — toàn bộ test trong file sẽ tự inherit marker.

### 3.3. Template Unit test

```python
"""Unit tests for app.<module> — no DB/network."""
from app.your.module import some_function


class TestSomeFunction:
    def test_returns_expected_value(self):
        assert some_function(1) == 2

    def test_raises_on_invalid_input(self):
        import pytest
        with pytest.raises(ValueError):
            some_function(-1)
```

### 3.4. Quy tắc

- **Không hardcode user_id** — luôn dùng `auth_headers` fixture (tự register user mới mỗi test).
- **Không phụ thuộc thứ tự** — mỗi test phải tự setup state cần thiết.
- **Cleanup khi tạo resource bền** — vd tạo `ticket_category` xong nhớ `DELETE` ở cuối; nếu skip cleanup thì dữ liệu rác sẽ tích trong DB seed.
- **Email phải hợp lệ với `email-validator`** — tránh TLD giả như `.test`/`.invalid`. Dùng `@example.com`.
- **Idempotency key** — mỗi POST /bookings/ phải dùng UUID khác nhau (`uuid.uuid4()`), kể cả trong cùng test.
- **Skip nếu seed dependency thiếu** — vd booking test cần `event_id=1` còn vé; nếu hết, dùng `pytest.skip(...)` thay vì fail.

### 3.5. Cấu hình

`pytest.ini` ở [backend/pytest.ini](../pytest.ini):

```ini
[pytest]
asyncio_mode = auto         # async test/fixture không cần decorator
testpaths = tests
pythonpath = .              # cho phép `from app.xxx import ...`
markers =
    integration: requires running API at API_URL
```

Đổi base URL bằng env var `API_URL` (mặc định `http://127.0.0.1:8000`).

---

## 4. Troubleshooting

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `ConnectionRefused` | API chưa chạy | `docker compose up -d` |
| `ModuleNotFoundError: app` | PYTHONPATH chưa set | Đảm bảo `pythonpath = .` trong `pytest.ini`, hoặc chạy từ thư mục `backend/` |
| `422` thay vì `401` ở login | Pydantic reject email format trước khi vào handler | Dùng email hợp lệ kiểu `@example.com` |
| Booking test bị skip | Hết vé seed | Reset DB: xoá volume `phulocdoan_postgres_data` rồi `docker compose up -d` |
| Tests pass local nhưng fail trong container | Code thay đổi chưa được build vào image | `docker compose build api && docker compose up -d api` |
