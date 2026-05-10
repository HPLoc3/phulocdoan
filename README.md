# 🎫 Concert Ticket Booking Platform

> **GEEK Up — Product Backend Engineer Test**
>
> Bài test thiết kế và triển khai hệ thống backend cho nền tảng đặt vé concert trực tuyến.

---

## 📋 Mục lục

- [Bối cảnh nghiệp vụ](#-bối-cảnh-nghiệp-vụ)
- [Kỳ vọng kinh doanh](#-kỳ-vọng-kinh-doanh)
- [Yêu cầu bài test](#-yêu-cầu-bài-test)
- [Deliverables](#-deliverables)
- [Lưu ý quan trọng](#-lưu-ý-quan-trọng)

---

## 🎯 Bối cảnh nghiệp vụ

Một startup đang chuẩn bị ra mắt **nền tảng đặt vé concert trực tuyến** (Event Ticket Booking).

### Tính năng phía khách hàng (Customer-facing)

Nền tảng cho phép người dùng:

| # | Tính năng | Mô tả |
|---|-----------|-------|
| 1 | Duyệt concert | Xem danh sách các sự kiện concert |
| 2 | Xem loại vé & giá | Nhiều hạng vé (VIP, Standard, v.v.) |
| 3 | Đặt vé | Reserve tickets cho sự kiện |
| 4 | Áp dụng voucher | Sử dụng mã khuyến mãi khi đặt vé |
| 5 | Theo dõi trạng thái | Tracking booking status |

### Tính năng phía vận hành (Operation Dashboard)

Hệ thống cần một **Operation Dashboard** nội bộ cho đội vận hành:

| # | Tính năng | Mô tả |
|---|-----------|-------|
| 1 | Giám sát booking | Monitor tất cả đơn đặt vé |
| 2 | Quản lý concert/vé | Publish và quản lý vé mới |
| 3 | Kiểm tra tồn kho vé | Validate ticket availability |
| 4 | Quản lý voucher | Quản lý các chiến dịch khuyến mãi |
| 5 | Xử lý lỗi | Handle failed hoặc suspicious bookings |
| 6 | Cập nhật thủ công | Update booking status khi cần thiết |

---

## 📊 Kỳ vọng kinh doanh

### Flash Sale Campaign — Tuần ra mắt

Startup sẽ chạy **Flash Sale Campaign** cho một concert hot trong tuần launch:

- **~50,000 users** truy cập đồng thời
- **Peak traffic: 300–500 booking requests/phút**

### Đặc điểm mỗi sự kiện concert

- ⚡ Số lượng vé **có giới hạn**
- 🎟️ Nhiều **hạng vé** (VIP, Standard, v.v.)
- 🏷️ Số lượng **voucher khuyến mãi có hạn**

### Các rủi ro cần xử lý

| Rủi ro | Mô tả |
|--------|-------|
| 🔴 Overselling | Bán vượt quá số lượng vé có sẵn |
| 🔴 Duplicate bookings | Booking trùng lặp do retries |
| 🔴 Voucher abuse | Người dùng lạm dụng mã khuyến mãi |
| 🔴 System instability | Hệ thống không ổn định khi flash sale traffic spike |

---

## 🛠️ Yêu cầu bài test

### Nhiệm vụ chính

Bạn được thuê làm **Software Engineer** để thiết kế và triển khai hệ thống backend đơn giản cho cả hai luồng:

1. **Customer-facing booking flows** — Luồng đặt vé cho khách hàng
2. **Internal operation workflows** — Luồng vận hành nội bộ

### Công việc cụ thể

- [ ] **Thiết kế kiến trúc** cho Concert Ticket Booking Platform
- [ ] **Setup & triển khai codebase** phản ánh kiến trúc đã thiết kế
- [ ] **Xây dựng Backend APIs** cho cả hai luồng:
  - Customer-facing booking flows
  - Internal operation workflows

---

## 📦 Deliverables

### 1. Tài liệu System / Database Design

- Phân tích và giải thích thiết kế hệ thống
- Database schema design
- Kiến trúc tổng thể

### 2. Codebase

| Hạng mục | Chi tiết |
|----------|----------|
| Source code | Mã nguồn hoàn chỉnh |
| Coding guideline | Convention, cách tạo API mới, cách chạy unit test |
| Setup guide | Hướng dẫn cài đặt & chạy local |
| API docs | Tài liệu API (có thể dùng Swagger) |
| API testing | Swagger UI tại `/docs` — "Try it out" chạy được mọi endpoint với local setup |

### 3. Tài liệu Assumptions & Scope

Mô tả rõ:

- ✅ **Assumptions** — Các giả định đã đặt ra
- ✅ **What you have done** — Những gì đã làm
- ❌ **What you have NOT done** — Những gì chưa làm (limitations)

#### Ví dụ về assumptions & scope:

> *"Booking ticket sẽ có 4 trạng thái (received, waiting for payment, complete payment, ...) nên sẽ implement API để thay đổi order status trong 4 trạng thái này."*

> *"Hệ thống hỗ trợ operation team tạo voucher, nhưng không hỗ trợ update/delete voucher."*

> *"Có thể không serve API cho CRUD voucher, chỉ seeding data và đảm bảo customer có thể apply voucher khi tạo order."*

---

## ⚠️ Lưu ý quan trọng

### ❌ KHÔNG yêu cầu production-ready

Bài test **KHÔNG** yêu cầu xây dựng hệ thống production-ready.

### ✅ Đánh giá dựa trên

| Tiêu chí | Trọng tâm |
|----------|-----------|
| 🧠 Backend design thinking | Cách bạn tư duy về thiết kế backend |
| 📁 Code structure | Cách bạn tổ chức mã nguồn |
| 🔍 Problem reasoning | Cách bạn suy luận về các vấn đề và workflows trong hệ thống |

### 📌 Lời khuyên

> Hãy dành thời gian **suy nghĩ kỹ về scope** và **ưu tiên những gì cần xây dựng trước** để mang lại giá trị lớn nhất cho business.

### 🔧 Công cụ & Thời gian

- **Thời gian nộp**: 48 giờ kể từ khi nhận đề
- Được sử dụng Google, AI tools, và mọi tài nguyên online
- **Phải hiểu rõ và giải thích được mọi quyết định kỹ thuật**
- Tự do sử dụng bất kỳ technology stack nào phù hợp

### 📤 Nộp bài

> Upload toàn bộ kết quả vào **1 folder** và gửi link qua **Email**.

---

## 📞 Liên hệ

- 📧 Email: adventure@geekup.vn
- 📱 Hotline: 028 6262 4400
- 🌐 Website: [https://geekup.vn](https://geekup.vn)
- 📘 Facebook: [GEEK Up Adventure](https://www.facebook.com/GEEKUpAdventure)
