# 🧪 Testing & Load Simulation

Thư mục này chứa các kịch bản kiểm thử cho **Concert Ticket Booking Platform**. Đặc biệt là giả lập tình huống Flash Sale với High Concurrency.

## 1. Concurrency / Race Condition Test

File: `test_concurrency.py`

### Mục đích
Giả lập kịch bản khó nhất của bài toán bán vé: **Cạnh tranh đồng thời**.
Kịch bản: Trong kho chỉ còn đúng **5 vé**, nhưng có **100 người dùng** cùng bấm nút "Đặt vé" tại chính xác cùng một phần nghìn giây.

### Kết quả mong đợi (Anti-Overselling)
Nhờ vào 3 lớp phòng thủ (`Redis Distributed Lock` -> `DB Pessimistic Lock` -> `DB Constraint`), hệ thống phải đảm bảo:
- Đúng 5 request đầu tiên lọt qua và lấy được 5 vé.
- Các request đến sau (ngay cả khi gửi cùng lúc) sẽ bị từ chối với lỗi "Hết vé" (HTTP 400) hoặc "Hệ thống bận" do timeout khi đợi lock (HTTP 500/503).
- **Tuyệt đối không có chuyện bán âm vé (Overselling).**

### Cách chạy test

> 💡 **Lưu ý**: Cần đảm bảo hệ thống `docker-compose` (Postgres + Redis) và FastAPI server đang chạy.

1. Bật virtual environment:
   ```bash
   cd backend
   source venv/bin/activate
   ```

2. Đặt lại số vé còn lại trong DB thành 5 (để test cho nhanh):
   ```bash
   docker exec booking_postgres psql -U admin -d concert_booking -c "UPDATE ticket_categories SET remaining_quantity = 5 WHERE id = 1;"
   ```

3. Chạy script giả lập 100 requests đồng thời:
   ```bash
   python tests/test_concurrency.py
   ```

### Output Mẫu

```text
🚀 Bắt đầu giả lập Flash Sale: Bắn 100 request cùng lúc!

⏱ Thời gian xử lý 100 requests: 3.11 giây

📊 THỐNG KÊ MÃ LỖI:
✅ Thành công (HTTP 201): 5 requests đã giành được vé
❌ Hết vé (HTTP 400): 36 requests bị từ chối do hết vé
⚠️ Khác (HTTP 500): 59 requests (Timeout do bị block ở cửa Redis Lock)
```
*(Ghi chú: Mã HTTP 500 ở đây đến từ việc Redis từ chối cấp Lock do hết thời gian chờ `blocking_timeout=3` giây, ngăn chặn DB bị quá tải - đây là tính năng bảo vệ hệ thống hợp lệ)*.
