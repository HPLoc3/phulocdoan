# 🎯 Giải pháp & Phân tích Yêu cầu Bài test (Ticket Booking Platform)

Tài liệu này mô tả chi tiết cách hệ thống được thiết kế và triển khai để đáp ứng các yêu cầu từ bài test của GEEK Up, đặc biệt tập trung vào việc giải quyết bài toán **Flash Sale (High Concurrency)**.

---

## 1. Kiến trúc Hệ thống (System Architecture)
Hệ thống được chia làm 3 cấu phần độc lập (Microservices-oriented architecture):
1. **Backend API (FastAPI + Python 3.10):** Chịu trách nhiệm xử lý logic nghiệp vụ, giao tiếp cơ sở dữ liệu và quản lý concurrency lock. Sử dụng kiến trúc Asynchronous (Bất đồng bộ) để tối đa hoá I/O bound.
2. **Admin Dashboard (React Refine):** Phục vụ đội ngũ vận hành nội bộ. Cung cấp tính năng CRUD mạnh mẽ cho Event, Booking, Ticket.
3. **User Web (React Vite + SWR):** Frontend tối ưu hoá cho tốc độ, liên tục polling dữ liệu (refresh) không cần reload trang để đảm bảo trải nghiệm Mua vé Real-time trong lúc Flash Sale.

**Hạ tầng:** 
- **PostgreSQL 15:** Lưu trữ dữ liệu với tính toàn vẹn (ACID), sử dụng Row-level Lock.
- **Redis:** Hoạt động như Distributed Lock Manager chặn bão request.

---

## 2. Giải quyết Bài toán Cốt lõi: Flash Sale & Overselling
Hệ thống được kỳ vọng chịu tải **300-500 requests/phút** trong tuần ra mắt (Flash Sale) với rủi ro Overselling (Bán âm vé). Giải pháp áp dụng **Locking 3 Lớp (3-Layer Defense)**:

1. **Lớp 0: Idempotency Key (Chống Duplicate Bookings)**
   - Ngay khi người dùng nhấn "Thanh toán", frontend sẽ sinh ra một `uuid-v4`. Backend dùng Redis để lưu lại Key này. Nếu mạng lag khiến user click 2 lần, request thứ 2 sẽ bị từ chối ngay ở lớp mạng với HTTP 409 (Conflict).
   
2. **Lớp 1: Distributed Lock qua Redis (Chắn bão Request)**
   - Khi có 500 requests cùng tranh nhau 1 hạng vé, Backend dùng `redis.lock(lock_name)` để gom các luồng truy cập thành hàng đợi (Queue ảo). Tránh việc 500 requests đồng loạt đánh thẳng vào Database gây nghẽn rớt mạng (Database Connection Pool Exhaustion).
   
3. **Lớp 2: Pessimistic Row-level Lock (Đảm bảo toàn vẹn Dữ liệu)**
   - Sau khi qua được Redis, Backend sử dụng `SELECT ... FOR UPDATE` trong Transaction của PostgreSQL. Lệnh này khoá đúng dòng dữ liệu hạng vé (TicketCategory) đang được mua, kiểm tra `remaining_quantity >= request_quantity` rồi mới trừ vé. Tuyệt đối không thể xảy ra hiện tượng **Bán âm vé (Overselling)** kể cả khi Redis gặp sự cố.

---

## 3. Scope & Assumptions (Phạm vi & Giả định)

Dựa trên nguyên tắc MVP (Minimum Viable Product), dưới đây là các quyết định phân bổ nguồn lực:

### ✅ What I have done (Những gì đã hoàn thiện)
- **Luồng Khách hàng (Customer Flow):** Giao diện UI Web hoàn chỉnh, xem danh sách sự kiện, chi tiết sự kiện (polling data real-time), chọn vé và gọi API tạo Booking.
- **Luồng Vận hành (Operation Flow):** Bảng điều khiển Admin với đầy đủ tính năng tạo, sửa, tìm kiếm Sự kiện và lọc đơn Bookings (dựa trên các tham số truy vấn động).
- **Voucher System & Anti-Abuse:** Hỗ trợ áp dụng mã giảm giá (Voucher) khi đặt vé. Hệ thống sử dụng Row-level Lock (`SELECT FOR UPDATE`) trực tiếp trên row của Voucher để ngăn chặn việc người dùng bào mã (Voucher Abuse) khi mã chỉ còn 1 lượt dùng nhưng có 100 requests đánh vào cùng lúc.
- **Concurrency Control:** Setup hoàn thiện bài toán chống Overselling bằng Redis + Postgres, có kèm theo file script chạy giả lập (`backend/test_concurrency.py`).
- **Containerization:** Toàn bộ hệ thống chạy với 1 lệnh duy nhất `docker-compose up --build`, sẵn sàng cho đánh giá.

### ⚠️ Assumptions (Các giả định)
- **Mock Authentication:** Để đơn giản hoá quy trình test, hệ thống hiện tại giả định user luôn là ID `1` (`customer1@gmail.com`). Trong thực tế, hệ thống sẽ được gắn JWT Middleware.
- **Payment Gateway:** Quá trình thanh toán được giả định là thành công ngay khi trừ vé (Trạng thái chuyển sang `confirmed` / `paid`). Trong thực tế, luồng này sẽ bao gồm trạng thái `payment_pending`, giữ vé (reserve) trong 15 phút, nếu Cổng thanh toán (Momo/VNPay) trả về lỗi thì nhả vé lại kho.

### ❌ What I have NOT done (Những gì chưa làm)
- **Role-Based Access Control (RBAC):** Admin dashboard mở hoàn toàn, chưa tích hợp chặn quyền phân mảnh User/Admin.
- **Unit Tests coverage:** Mới chỉ cung cấp Integration Script để test Concurrency, chưa phủ Unit tests (PyTest) cho mọi hàm nhỏ trong hệ thống do giới hạn thời gian (48h).

---

## 4. Thiết kế Database (Lược đồ)
- **`events`**: Chứa thông tin sự kiện, kết nối `venue_id`.
- **`ticket_categories`**: Chứa loại vé (VIP, Standard). Cột `remaining_quantity` có check constraint `>= 0` (lớp phòng thủ cuối cùng chống Oversell ở tầng DB).
- **`bookings`**: Chứa thông tin đơn hàng, khoá ngoại tới `user_id` và `event_id`, có lưu trữ `idempotency_key` (Unique constraint).
- **`booking_items`**: Chi tiết số lượng, hạng vé mua trong mỗi đơn.
- **`vouchers` & `payments`**: Đã chuẩn bị sẵn schema mở rộng cho tương lai.

*(Bản SQL cụ thể nằm tại `database/schema.sql`)*
