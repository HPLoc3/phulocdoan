# 🚀 Hướng dẫn Cài đặt & Khởi chạy (Setup Guide)

Hệ thống Ticket Booking được đóng gói hoàn toàn bằng Docker, giúp bạn khởi chạy nhanh chóng chỉ với 1 lệnh duy nhất!

Hệ thống bao gồm 5 container độc lập:
1. **db** (PostgreSQL 15)
2. **redis** (Redis 7)
3. **api** (FastAPI Backend)
4. **admin** (React Refine Dashboard)
5. **user-web** (React Vite Web App)

---

## 🛠️ Yêu cầu môi trường (Prerequisites)
- **Docker & Docker Compose** đã được cài đặt và đang chạy.
- (Không bắt buộc) Python 3.10+ nếu muốn chạy script test.

---

## 1. Khởi chạy toàn bộ hệ thống (All-in-one)
Tại thư mục gốc của dự án, chạy lệnh:
```bash
docker-compose up -d --build
```
*(Lần chạy đầu tiên sẽ tốn chút thời gian để build Docker images)*

Sau khi chạy xong, hãy truy cập các đường link sau:
- 🌐 **User Web (Mua vé):** [http://localhost:3000](http://localhost:3000)
- 📊 **Admin Dashboard (Quản trị):** [http://localhost:5173](http://localhost:5173)
- ⚙️ **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

**Ghi chú:** Khi hệ thống khởi chạy, file `database/schema.sql` và `database/seed.sql` sẽ tự động tạo bảng và nạp sẵn dữ liệu mẫu (Sự kiện, Hạng vé, Venue).

---

## 🧪 2. Chạy Test Concurrency (Giả lập Flash Sale)
Để chứng minh hệ thống không bị **Overselling** dưới tải cao, có một script test đã được chuẩn bị sẵn:
1. Mở terminal, đi vào thư mục `backend/`
2. Đảm bảo bạn đã cài thư viện: `pip install requests`
3. Chạy lệnh:
```bash
python test_concurrency.py
```
Script sẽ bắn 100 Request mua vé đồng thời (như 1 vụ nổ Flash Sale). Bạn sẽ thấy Redis Lock và Database Row-level lock hoạt động cùng nhau để đảm bảo không một chiếc vé nào bị bán âm!

---

## 🎨 Thông tin công nghệ cốt lõi
- **Backend Lock Layers:** Redis Distributed Lock (lớp ngoài chắn bão) + PostgreSQL `SELECT FOR UPDATE` (lớp trong đảm bảo tính toàn vẹn). Cực kỳ an toàn cho hệ thống High Concurrency.
- **Web Frontend:** Tailwind CSS v4, Framer Motion (Animation), SWR (Polling vé real-time).
- **Admin Frontend:** Ant Design, Vite dedupe strategy.

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
