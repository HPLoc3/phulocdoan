# 🚀 Hướng dẫn Cài đặt & Khởi chạy (Setup Guide)

Hệ thống Ticket Booking được chia làm 3 phần độc lập nhưng tương tác liền mạch với nhau:
1. **Backend** (FastAPI + PostgreSQL + Redis)
2. **Admin Dashboard** (React Refine - Quản trị hệ thống)
3. **User Web** (Vite + Tailwind v4 - Dành cho khách hàng đặt vé)

---

## 🛠️ Yêu cầu môi trường (Prerequisites)
- **Docker & Docker Compose** (Để chạy Database & Redis)
- **Python 3.10+** (Để chạy Backend)
- **Node.js 18+** (Để chạy Frontend)

---

## 1. Khởi chạy Database & Redis (Hạ tầng)
Tại thư mục gốc của dự án, chạy lệnh:
```bash
docker-compose up -d
```
Lệnh này sẽ khởi tạo:
- **PostgreSQL** ở cổng `5432`
- **Redis** ở cổng `6379`
- Tự động chạy script `database/schema.sql` và `database/seed.sql` để tạo bảng và nạp sẵn dữ liệu mẫu (Sự kiện, Hạng vé, Venue).

---

## 2. Khởi chạy Backend (FastAPI)
Mở một Terminal mới, đi vào thư mục `backend/`:

**Bước 2.1: Tạo môi trường ảo (Khuyên dùng)**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Trên Mac/Linux
# .\venv\Scripts\activate # Trên Windows
```

**Bước 2.2: Cài đặt thư viện**
```bash
pip install -r requirements.txt
```

**Bước 2.3: Khởi chạy API Server**
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- **Swagger API Docs:** Truy cập [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- API chạy thành công khi thấy dòng `Application startup complete`.

---

## 3. Khởi chạy Admin Dashboard (React Refine)
Mở một Terminal mới, đi vào thư mục `admin/`:
```bash
cd admin
npm install
npm run dev
```
- **Admin UI:** Truy cập [http://localhost:5173](http://localhost:5173)
- Giao diện quản trị sẽ giúp bạn xem danh sách Sự kiện, tạo Sự kiện mới và theo dõi số lượng vé bán ra, lọc các đơn đặt vé (Bookings).

---

## 4. Khởi chạy User Web (Customer Frontend)
Mở một Terminal mới, đi vào thư mục `user-web/`:
```bash
cd user-web
npm install
npm run dev
```
- **User Web:** Truy cập [http://localhost:3000](http://localhost:3000)
- Tại đây, bạn có thể trải nghiệm luồng mua vé. Hãy thử mở song song 2 tab: Web User và Swagger (hoặc Admin), khi bạn đặt vé thành công, số lượng `remaining_quantity` sẽ bị trừ theo thời gian thực nhờ cơ chế Polling bằng SWR.

---

## 🧪 Chạy Test Concurrency (Giả lập Flash Sale)
Để chứng minh hệ thống không bị **Overselling** dưới tải cao, có một script test đã được chuẩn bị sẵn:
1. Đảm bảo Backend và Redis/Postgres đang chạy.
2. Mở terminal, ở thư mục `backend/`, chạy:
```bash
python test_concurrency.py
```
Script sẽ bắn 100 Request mua vé đồng thời (như 1 vụ nổ Flash Sale). Hãy quan sát log, Redis Lock và Database Row-level lock sẽ hoạt động cùng nhau để đảm bảo không một chiếc vé nào bị bán âm!

---

## 🎨 Thông tin công nghệ sử dụng
- **Backend Lock Layers:** Redis Distributed Lock (lớp ngoài chắn bão) + PostgreSQL `SELECT FOR UPDATE` (lớp trong đảm bảo tính toàn vẹn).
- **Web Frontend:** Tailwind CSS v4, Framer Motion (Animation), SWR (Polling vé real-time).
- **Admin Frontend:** Ant Design, Vite dedupe strategy.
