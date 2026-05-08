-- ============================================================
-- Concert Ticket Booking Platform — Database Schema
-- PostgreSQL 15+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM TYPES
CREATE TYPE user_role AS ENUM ('customer', 'operator', 'admin');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'payment_pending', 'paid', 'cancelled', 'failed'
);
CREATE TYPE payment_method AS ENUM ('credit_card', 'bank_transfer', 'ewallet');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE users (
    id              BIGSERIAL       PRIMARY KEY,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(255)    NOT NULL,
    phone           VARCHAR(20),
    role            user_role       NOT NULL DEFAULT 'customer',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE venues (
    id              BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    address         TEXT            NOT NULL,
    city            VARCHAR(100)    NOT NULL,
    capacity        INTEGER         NOT NULL CHECK (capacity > 0),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
    id              BIGSERIAL       PRIMARY KEY,
    venue_id        BIGINT          NOT NULL REFERENCES venues(id),
    title           VARCHAR(500)    NOT NULL,
    description     TEXT,
    event_date      TIMESTAMPTZ     NOT NULL,
    status          event_status    NOT NULL DEFAULT 'draft',
    is_flash_sale   BOOLEAN         NOT NULL DEFAULT FALSE,
    sale_start_at   TIMESTAMPTZ,
    sale_end_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sale_window CHECK (
        sale_start_at IS NULL OR sale_end_at IS NULL OR sale_start_at < sale_end_at
    ),
    CONSTRAINT chk_sale_before_event CHECK (
        sale_end_at IS NULL OR sale_end_at <= event_date
    )
);

CREATE TABLE ticket_categories (
    id                  BIGSERIAL       PRIMARY KEY,
    event_id            BIGINT          NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name                VARCHAR(100)    NOT NULL,
    description         TEXT,
    price               DECIMAL(12,2)   NOT NULL CHECK (price >= 0),
    total_quantity      INTEGER         NOT NULL CHECK (total_quantity > 0),
    remaining_quantity  INTEGER         NOT NULL,
    max_per_booking     INTEGER         NOT NULL DEFAULT 5 CHECK (max_per_booking > 0),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- CRITICAL: Chống overselling
    CONSTRAINT chk_remaining_quantity CHECK (remaining_quantity >= 0),
    CONSTRAINT chk_remaining_lte_total CHECK (remaining_quantity <= total_quantity),
    CONSTRAINT uq_event_category_name UNIQUE (event_id, name)
);

CREATE TABLE bookings (
    id                  BIGSERIAL       PRIMARY KEY,
    user_id             BIGINT          NOT NULL REFERENCES users(id),
    event_id            BIGINT          NOT NULL REFERENCES events(id),
    idempotency_key     UUID            NOT NULL,
    status              booking_status  NOT NULL DEFAULT 'pending',
    subtotal            DECIMAL(12,2)   NOT NULL DEFAULT 0,
    discount_amount     DECIMAL(12,2)   NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount        DECIMAL(12,2)   NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    failure_reason      TEXT,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- CRITICAL: Chống duplicate booking
    CONSTRAINT uq_bookings_idempotency UNIQUE (idempotency_key)
);

CREATE TABLE booking_items (
    id                  BIGSERIAL       PRIMARY KEY,
    booking_id          BIGINT          NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    ticket_category_id  BIGINT          NOT NULL REFERENCES ticket_categories(id),
    quantity            INTEGER         NOT NULL CHECK (quantity > 0),
    unit_price          DECIMAL(12,2)   NOT NULL,
    line_total          DECIMAL(12,2)   NOT NULL,
    CONSTRAINT uq_booking_category UNIQUE (booking_id, ticket_category_id)
);

CREATE TABLE payments (
    id                  BIGSERIAL       PRIMARY KEY,
    booking_id          BIGINT          NOT NULL REFERENCES bookings(id),
    transaction_id      UUID            NOT NULL DEFAULT uuid_generate_v4(),
    method              payment_method  NOT NULL,
    status              payment_status  NOT NULL DEFAULT 'pending',
    amount              DECIMAL(12,2)   NOT NULL CHECK (amount > 0),
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_booking UNIQUE (booking_id),
    CONSTRAINT uq_payment_transaction UNIQUE (transaction_id)
);

CREATE TABLE vouchers (
    id                  BIGSERIAL       PRIMARY KEY,
    code                VARCHAR(50)     NOT NULL,
    discount_type       discount_type   NOT NULL,
    discount_value      DECIMAL(12,2)   NOT NULL CHECK (discount_value > 0),
    min_order_amount    DECIMAL(12,2)   NOT NULL DEFAULT 0,
    max_discount_amount DECIMAL(12,2),
    total_quantity      INTEGER         NOT NULL CHECK (total_quantity > 0),
    remaining_quantity  INTEGER         NOT NULL,
    max_usage_per_user  INTEGER         NOT NULL DEFAULT 1,
    valid_from          TIMESTAMPTZ     NOT NULL,
    valid_until         TIMESTAMPTZ     NOT NULL,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_voucher_code UNIQUE (code),
    CONSTRAINT chk_voucher_remaining CHECK (remaining_quantity >= 0),
    CONSTRAINT chk_voucher_remaining_lte_total CHECK (remaining_quantity <= total_quantity),
    CONSTRAINT chk_voucher_validity CHECK (valid_from < valid_until)
);

CREATE TABLE event_vouchers (
    id              BIGSERIAL       PRIMARY KEY,
    event_id        BIGINT          NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    voucher_id      BIGINT          NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    CONSTRAINT uq_event_voucher UNIQUE (event_id, voucher_id)
);

CREATE TABLE voucher_redemptions (
    id                  BIGSERIAL       PRIMARY KEY,
    voucher_id          BIGINT          NOT NULL REFERENCES vouchers(id),
    user_id             BIGINT          NOT NULL REFERENCES users(id),
    booking_id          BIGINT          NOT NULL REFERENCES bookings(id),
    discount_applied    DECIMAL(12,2)   NOT NULL CHECK (discount_applied > 0),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_voucher_booking UNIQUE (booking_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_events_status_sale ON events(status, sale_start_at, sale_end_at)
    WHERE status = 'published';
CREATE INDEX idx_events_venue ON events(venue_id);
CREATE INDEX idx_ticket_categories_event ON ticket_categories(event_id);
CREATE INDEX idx_bookings_user ON bookings(user_id, created_at DESC);
CREATE INDEX idx_bookings_event_status ON bookings(event_id, status);
CREATE INDEX idx_bookings_expired ON bookings(status, expires_at)
    WHERE status IN ('pending', 'confirmed', 'payment_pending');
CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_vouchers_active_code ON vouchers(code) WHERE is_active = TRUE;
CREATE INDEX idx_voucher_redemptions_user ON voucher_redemptions(voucher_id, user_id);

-- ============================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
