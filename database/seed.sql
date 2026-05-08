-- ============================================================
-- Concert Ticket Booking Platform — Seed Data
-- ============================================================

-- Mật khẩu mặc định cho tất cả user là: password123
-- Hash bcrypt tương ứng: $2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQqiRQYm

-- 1. Seed Users
INSERT INTO users (email, password_hash, full_name, phone, role) VALUES
('admin@geekup.vn', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQqiRQYm', 'Admin System', '0123456789', 'admin'),
('operator@geekup.vn', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQqiRQYm', 'Operation Team', '0123456780', 'operator'),
('customer1@gmail.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQqiRQYm', 'Nguyen Van A', '0987654321', 'customer'),
('customer2@gmail.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQqiRQYm', 'Tran Thi B', '0987654322', 'customer');

-- 2. Seed Venues
INSERT INTO venues (name, address, city, capacity) VALUES
('Sân vận động Mỹ Đình', 'Đường Lê Đức Thọ, Nam Từ Liêm', 'Hà Nội', 40000),
('Sân vận động Quân khu 7', '202 Hoàng Văn Thụ, Phường 9, Phú Nhuận', 'Hồ Chí Minh', 25000),
('Nhà hát Hoà Bình', '240 Đường 3 Tháng 2, Phường 12, Quận 10', 'Hồ Chí Minh', 2500);

-- 3. Seed Events (Concerts)
INSERT INTO events (venue_id, title, description, event_date, status, is_flash_sale, sale_start_at, sale_end_at) VALUES
(2, 'The Eras Tour Vietnam - Flash Sale', 'Sự kiện âm nhạc lớn nhất năm 2026', NOW() + INTERVAL '30 days', 'published', TRUE, NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days'),
(1, 'Gala Nhạc Trẻ 2026', 'Quy tụ dàn sao hạng A', NOW() + INTERVAL '60 days', 'published', FALSE, NOW() - INTERVAL '5 days', NOW() + INTERVAL '50 days'),
(3, 'Đêm nhạc Trịnh Công Sơn - Mùa Thu', 'Những tình khúc bất hủ', NOW() + INTERVAL '15 days', 'published', FALSE, NOW() - INTERVAL '10 days', NOW() + INTERVAL '10 days'),
(2, 'K-Pop Super Concert (Draft)', 'Đang lên kế hoạch', NOW() + INTERVAL '90 days', 'draft', FALSE, NULL, NULL);

-- 4. Seed Ticket Categories
-- Cho The Eras Tour
INSERT INTO ticket_categories (event_id, name, description, price, total_quantity, remaining_quantity, max_per_booking) VALUES
(1, 'VIP', 'Gần sân khấu nhất, có quà tặng', 5000000, 100, 100, 2),
(1, 'Standard', 'Khu vực giữa', 2000000, 500, 500, 4),
(1, 'Economy', 'Khu vực khán đài', 1000000, 1000, 1000, 4);

-- Cho Gala Nhạc Trẻ
INSERT INTO ticket_categories (event_id, name, description, price, total_quantity, remaining_quantity, max_per_booking) VALUES
(2, 'VVIP', 'Ghế sofa, đồ uống miễn phí', 10000000, 50, 50, 2),
(2, 'GA', 'Đứng tự do', 500000, 5000, 5000, 10);

-- 5. Seed Vouchers
INSERT INTO vouchers (code, discount_type, discount_value, min_order_amount, max_discount_amount, total_quantity, remaining_quantity, max_usage_per_user, valid_from, valid_until) VALUES
('WELCOME2026', 'percentage', 10, 1000000, 500000, 1000, 1000, 1, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days'),
('ERASTOUR500K', 'fixed_amount', 500000, 2000000, NULL, 100, 100, 1, NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days');

-- Gắn voucher ERASTOUR500K chỉ cho event 1 (The Eras Tour)
INSERT INTO event_vouchers (event_id, voucher_id) VALUES (1, 2);
-- Voucher WELCOME2026 không gắn vào event_vouchers => áp dụng cho mọi sự kiện.
