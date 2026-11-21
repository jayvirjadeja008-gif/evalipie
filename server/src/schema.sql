-- StockSync schema. PostgreSQL is the single source of truth.

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id   BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id          BIGSERIAL PRIMARY KEY,
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  brand       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category_id BIGINT NOT NULL REFERENCES categories(id),
  price_paise BIGINT NOT NULL CHECK (price_paise >= 0),
  mrp_paise   BIGINT CHECK (mrp_paise >= 0),
  rating      NUMERIC(2, 1) NOT NULL DEFAULT 4.5,
  review_count INTEGER NOT NULL DEFAULT 12,
  image_url   TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);

ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp_paise BIGINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(2, 1) DEFAULT 4.5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 12;
ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(40) DEFAULT 'black';
UPDATE products SET mrp_paise = ROUND(price_paise * 1.35) WHERE mrp_paise IS NULL;

-- Stock per product per city. The CHECK constraint is the last line of defence:
-- even a buggy query cannot drive stock below zero.
CREATE TABLE IF NOT EXISTS inventory (
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  city       TEXT   NOT NULL,
  quantity   INTEGER NOT NULL CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, city)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  city       TEXT   NOT NULL,
  delta      INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason     TEXT NOT NULL,          -- order | admin_adjustment | restock | seed
  order_id   BIGINT,
  actor_id   BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inv_mov_created_idx ON inventory_movements(created_at DESC);

CREATE TABLE IF NOT EXISTS carts (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  city       TEXT NOT NULL DEFAULT 'Bengaluru',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  cart_id    BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  city        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'placed'
              CHECK (status IN ('placed','confirmed','shipped','delivered','cancelled')),
  total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
  payment_method TEXT NOT NULL DEFAULT 'COD',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_ref TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at DESC);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'COD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_ref TEXT;

CREATE TABLE IF NOT EXISTS wishlists (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS wishlists_user_idx ON wishlists(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user_name  TEXT NOT NULL,
  city       TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews(product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_tickets (
  id         BIGSERIAL PRIMARY KEY,
  ticket_ref TEXT NOT NULL UNIQUE,
  user_id    BIGINT REFERENCES users(id),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  order_id   BIGINT,
  issue_type TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_ref_idx ON support_tickets(ticket_ref);

CREATE TABLE IF NOT EXISTS order_items (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES products(id),
  name        TEXT NOT NULL,
  unit_paise  BIGINT NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

-- Transactional outbox: written in the SAME transaction as the business change.
CREATE TABLE IF NOT EXISTS outbox (
  id           BIGSERIAL PRIMARY KEY,
  topic        TEXT  NOT NULL,
  event_key    TEXT  NOT NULL,
  event_type   TEXT  NOT NULL,
  payload      JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(id) WHERE published_at IS NULL;

-- Consumer idempotency + admin-visible processing log.
CREATE TABLE IF NOT EXISTS processed_events (
  consumer     TEXT NOT NULL,
  event_id     BIGINT NOT NULL,
  topic        TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer, event_id)
);
CREATE INDEX IF NOT EXISTS processed_events_time_idx ON processed_events(processed_at DESC);

-- Written by consumers
CREATE TABLE IF NOT EXISTS notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id   BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE TABLE IF NOT EXISTS stock_alerts (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  city       TEXT NOT NULL,
  quantity   INTEGER NOT NULL,
  level      TEXT NOT NULL CHECK (level IN ('low','out')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_stats (
  day           DATE NOT NULL,
  city          TEXT NOT NULL,
  orders        INTEGER NOT NULL DEFAULT 0,
  units         INTEGER NOT NULL DEFAULT 0,
  revenue_paise BIGINT  NOT NULL DEFAULT 0,
  PRIMARY KEY (day, city)
);
