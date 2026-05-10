# 🚀 Hướng dẫn Cài đặt & Khởi chạy (Setup Guide)

Hệ thống Ticket Booking được đóng gói hoàn toàn bằng Docker, chỉ cần **1 lệnh duy nhất** để khởi chạy toàn bộ stack:

| Service | Image / Stack | Port |
|---|---|---|
| `db` | PostgreSQL 15 | 5432 |
| `redis` | Redis 7-alpine | 6379 |
| `api` | FastAPI Backend | 8000 |
| `admin` | React Refine Dashboard | 5173 |
| `user-web` | React Vite Web App | 3000 |

---

## 🛠️ Yêu cầu môi trường

- **Docker & Docker Compose** đã được cài đặt và đang chạy.
- (Tuỳ chọn) Python 3.10+ nếu muốn chạy script test concurrency.

---

## 1. Khởi chạy toàn bộ hệ thống

Tại thư mục gốc của dự án:

```bash
docker-compose up -d --build
```

*(Lần đầu sẽ tốn vài phút để build images)*

Sau khi container ready, truy cập:

- 🌐 **User Web (Mua vé):** [http://localhost:3000](http://localhost:3000)
- 📊 **Admin Dashboard (Vận hành):** [http://localhost:5173](http://localhost:5173)
- ⚙️ **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

> Khi container `db` khởi chạy lần đầu, file `database/schema.sql` và `database/seed.sql` sẽ tự động được nạp qua `docker-entrypoint-initdb.d` (tạo bảng + dữ liệu mẫu Sự kiện, Hạng vé, Venue, User).

### Tài khoản mẫu (đã được seed sẵn)

| Email | Role | Password |
|---|---|---|
| `admin@geekup.vn` | admin | `password123` |
| `operator@geekup.vn` | operator | `password123` |
| `customer1@gmail.com` | customer | `password123` |
| `customer2@gmail.com` | customer | `password123` |

> ⚠️ Lưu ý: backend hiện hardcode `user_id = 3` (= `customer1@gmail.com`) cho mọi booking request vì chưa có Auth middleware thật. Xem chi tiết trong [SOLUTION.md](SOLUTION.md).

### Dừng hệ thống

```bash
docker-compose down            # Dừng nhưng giữ data
docker-compose down -v         # Dừng và xoá volume (reset DB về schema/seed gốc)
```

---

## 2. Test API

Toàn bộ API có thể test trực tiếp trên **Swagger UI** ([http://localhost:8000/docs](http://localhost:8000/docs)):

- Click **"Try it out"** ở mỗi endpoint → điền payload → **Execute**.
- Swagger được FastAPI auto-generate từ Pydantic schema, luôn đồng bộ với code thực tế nên không cần Postman collection riêng.
- Các endpoint chính cần thử:
  - `GET /api/v1/events` – Danh sách concerts
  - `GET /api/v1/events/{id}` – Chi tiết + ticket categories
  - `POST /api/v1/bookings` – Đặt vé (cần `idempotency_key` UUID)
  - `GET /api/v1/bookings` – Danh sách booking cho operator

---

## 3. Test Concurrency (Giả lập Flash Sale)

Để chứng minh hệ thống không bị **Overselling** dưới tải cao:

```bash
# 1. Cài thư viện
cd backend
pip install httpx

# 2. (Tuỳ chọn) Reset số vé còn lại = 5 để dễ quan sát
docker exec -i $(docker-compose ps -q db) psql -U admin -d concert_booking \
  -c "UPDATE ticket_categories SET remaining_quantity = 5 WHERE id = 1;"

# 3. Chạy script bắn 100 request đồng thời
python tests/test_concurrency.py
```

Kết quả mong đợi: **đúng 5 request thành công** (HTTP 201), số còn lại bị Redis lock chặn (HTTP 503) hoặc DB báo hết vé (HTTP 400). Tuyệt đối không có Oversell. Xem thêm [backend/tests/README.md](backend/tests/README.md).

---

## 🎨 Công nghệ cốt lõi

- **Backend Lock 3 lớp:** Idempotency Key → Redis Distributed Lock → PostgreSQL `SELECT FOR UPDATE` (chi tiết tại [SOLUTION.md](SOLUTION.md) và [TECH.md](TECH.md)).
- **Admin Frontend:** Refine + Ant Design.
- **Web Frontend:** Tailwind CSS v4, Framer Motion, SWR (polling vé real-time).
- **DB schema:** chạy thẳng `schema.sql` qua docker-entrypoint, **không dùng Alembic migration** trong bài này.
