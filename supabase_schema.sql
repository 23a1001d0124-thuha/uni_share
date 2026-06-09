-- ==========================================
-- UNI-SHARE DATABASES MIGRATION DIRECTIVES
-- ==========================================

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price BIGINT NOT NULL,
  original_price BIGINT NOT NULL,
  condition TEXT,
  description TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  school TEXT,
  author TEXT,
  author_id TEXT,
  is_student_verified BOOLEAN DEFAULT TRUE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Đang bán',
  suitability_score INTEGER DEFAULT 90,
  seller_rating NUMERIC DEFAULT 4.8,
  seller_review_count INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Wants Table
CREATE TABLE IF NOT EXISTS wants (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  budget TEXT,
  school_filter TEXT,
  description TEXT,
  buyer TEXT,
  buyer_school TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Forum Posts Table
CREATE TABLE IF NOT EXISTS forum_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tag TEXT DEFAULT 'Thảo luận',
  author TEXT,
  school TEXT,
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 1,
  comments_count INTEGER DEFAULT 0,
  joined_users JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Forum Comments Table
CREATE TABLE IF NOT EXISTS forum_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES forum_posts(id) ON DELETE CASCADE,
  author TEXT,
  school TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Chat Rooms Table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  buyer_id TEXT,
  seller_id TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id TEXT,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_school ON products(school);
CREATE INDEX IF NOT EXISTS idx_wants_category ON wants(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_tag ON forum_posts(tag);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_product_id ON chat_rooms(product_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);

CREATE TABLE IF NOT EXISTS listing_reports (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT,
  reporter_id TEXT,
  reporter_name TEXT,
  seller_id TEXT,
  seller_name TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS seller_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  seller_id TEXT,
  seller_name TEXT,
  reviewer_id TEXT,
  reviewer_name TEXT,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  buyer_id TEXT,
  seller_id TEXT,
  amount BIGINT NOT NULL DEFAULT 0,
  deposit_amount BIGINT NOT NULL DEFAULT 0,
  provider TEXT DEFAULT 'escrow-lite',
  status TEXT DEFAULT 'pending',
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listing_analytics (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  seller_id TEXT,
  day DATE NOT NULL,
  views INTEGER DEFAULT 0,
  chats INTEGER DEFAULT 0,
  checkouts INTEGER DEFAULT 0,
  sold INTEGER DEFAULT 0,
  UNIQUE(product_id, day)
);

CREATE INDEX IF NOT EXISTS idx_listing_reports_status ON listing_reports(status);
CREATE INDEX IF NOT EXISTS idx_listing_reports_product_id ON listing_reports(product_id);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller_id ON seller_reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_listing_analytics_seller_day ON listing_analytics(seller_id, day);