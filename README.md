# 🎓 UNI-SHARE — Sàn Đồ Cũ Sinh Viên

> Nền tảng mua bán & trao đổi đồ cũ dành riêng cho sinh viên các trường đại học Việt Nam.  
> Tích hợp AI định giá, chat realtime, xác thực sinh viên và nhiều tính năng cộng đồng.

---

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Tech Stack](#-tech-stack)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
- [Cấu hình biến môi trường](#-cấu-hình-biến-môi-trường)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Scripts](#-scripts)

---

## ✨ Tính năng

| Tính năng                 | Mô tả                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| 🛒 **Marketplace**        | Đăng bán, tìm kiếm, lọc đồ cũ theo danh mục và trường học             |
| 🤖 **AI Định giá**        | Gợi ý giá bán tối ưu bằng Gemini AI dựa trên tình trạng và thị trường |
| 🔍 **Smart Lens**         | Nhận diện sản phẩm qua ảnh chụp (Gemini Vision)                       |
| 💬 **Chat realtime**      | Nhắn tin giữa người mua và người bán qua Socket.IO                    |
| 📢 **Forum cộng đồng**    | Gom mua chung, tìm phòng trọ, chia sẻ tài liệu                        |
| 🎯 **Tinder Matching**    | Ghép đôi nhu cầu mua với sản phẩm đang bán bằng AI                    |
| ✅ **Xác thực sinh viên** | Xác minh email trường đại học, badge sinh viên                        |
| 📊 **Analytics**          | Thống kê lượt xem, chat, checkout theo ngày cho người bán             |
| 🚨 **Báo cáo vi phạm**    | Hệ thống report tin đăng + admin dashboard                            |
| ☁️ **Upload ảnh**         | Lưu trữ ảnh sản phẩm trên Cloudinary                                  |

---

## 🛠 Tech Stack

**Frontend**

- [Next.js 15](https://nextjs.org/) — App Router
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/) — Animations
- [Lucide React](https://lucide.dev/) — Icons
- [Socket.IO Client](https://socket.io/) — Realtime chat

**Backend**

- [Express.js](https://expressjs.com/) — REST API server (`server.ts`)
- [Socket.IO](https://socket.io/) — WebSocket server
- [Supabase](https://supabase.com/) — PostgreSQL database + Auth
- [Cloudinary](https://cloudinary.com/) — Image storage
- [Multer](https://github.com/expressjs/multer) — File upload middleware
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) + [JWT](https://jwt.io/) — Authentication
- [Nodemailer](https://nodemailer.com/) — Email xác thực

**AI / External APIs**

- [Google Gemini API](https://ai.google.dev/) — Định giá, nhận diện ảnh, matchmaking

**DevTools**

- TypeScript, tsx, esbuild, ESLint

---

## 💻 Yêu cầu hệ thống

- **Node.js** v20+ (khuyến nghị v22+ để có native WebSocket; nếu dùng v20 cần cài `ws`)
- **npm** v9+
- Tài khoản **Supabase** (database)
- Tài khoản **Cloudinary** (image upload)
- **Gemini API Key** (AI features)

---

## 🚀 Cài đặt & Chạy

### 1. Clone project

```bash
git clone https://github.com/your-org/uni-share.git
cd uni-share
```

### 2. Cài dependencies

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` là bắt buộc vì project dùng React RC build.

### 3. Cấu hình biến môi trường

Tạo file `.env` tại thư mục gốc (xem phần [Cấu hình biến môi trường](#-cấu-hình-biến-môi-trường) bên dưới).

### 4. Tạo bảng database trên Supabase

Copy toàn bộ nội dung file `supabase_schema.sql` và chạy trong **Supabase SQL Editor**.

### 5. Khởi động development server

```bash
npm run dev
```

Truy cập: [http://localhost:3000](http://localhost:3000)

Server sẽ tự động seed dữ liệu mẫu vào Supabase nếu các bảng còn trống.

---

## ⚙️ Cấu hình biến môi trường

Tạo file `.env` tại thư mục gốc với nội dung sau:

```env
# ========== Supabase ==========
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# ========== Cloudinary ==========
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ========== Google Gemini AI ==========
GEMINI_API_KEY=your-gemini-api-key

# ========== JWT Auth ==========
JWT_SECRET=your-jwt-secret-key

# ========== Email (Nodemailer) ==========
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Hướng dẫn lấy keys

| Service                 | Địa chỉ                                                         |
| ----------------------- | --------------------------------------------------------------- |
| Supabase URL & Anon Key | [supabase.com](https://supabase.com) → Project Settings → API   |
| Cloudinary              | [cloudinary.com](https://cloudinary.com) → Dashboard → API Keys |
| Gemini API Key          | [ai.google.dev](https://ai.google.dev) → Get API Key            |

---

## 📁 Cấu trúc dự án

```
uni-share/
├── server.ts                  # Express server chính (API + Socket.IO)
├── next.config.mjs            # Next.js config
├── supabase_schema.sql        # SQL migration tạo toàn bộ bảng DB
├── supabase_auth_migration.sql
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Entry point
│   │   ├── globals.css
│   │   ├── admin/             # Admin dashboard pages
│   │   └── api/               # Next.js Route Handlers
│   │       ├── auth/
│   │       ├── products/
│   │       ├── wants/
│   │       ├── forum/
│   │       ├── chats/
│   │       └── universities/
│   │
│   ├── components/            # React components
│   │   ├── auth/
│   │   │   ├── AuthContext.tsx        # Global auth state
│   │   │   ├── LoginModal.tsx         # Đăng nhập / Đăng ký
│   │   │   ├── StudentBadge.tsx
│   │   │   └── VerifyStudentModal.tsx
│   │   ├── MarketplaceSpace.tsx       # Trang chợ chính
│   │   ├── PostItemModal.tsx          # Modal đăng bán
│   │   ├── ChatWorkspace.tsx          # Giao diện chat
│   │   ├── ForumBoard.tsx             # Forum cộng đồng
│   │   ├── TinderMatchmaking.tsx      # AI matching
│   │   ├── MyListings.tsx             # Quản lý tin đăng
│   │   ├── CheckoutWizard.tsx         # Thanh toán
│   │   ├── SellerProfileModal.tsx
│   │   ├── RatingModal.tsx
│   │   ├── SearchOverlay.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── HelpCenter.tsx
│   │   └── MobileBottomNav.tsx
│   │
│   ├── routes/
│   │   └── auth.ts            # Express auth routes (register/login/verify)
│   ├── middleware/
│   │   └── authMiddleware.ts  # JWT middleware
│   ├── data/
│   │   └── universities.ts    # Danh sách trường ĐH + email domain
│   ├── types.ts
│   └── utils.ts
│
└── public/                    # Static assets
```

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint                   | Mô tả                    |
| ------ | -------------------------- | ------------------------ |
| POST   | `/api/auth/register`       | Đăng ký tài khoản        |
| POST   | `/api/auth/login`          | Đăng nhập                |
| POST   | `/api/auth/verify-student` | Xác thực email sinh viên |

### Products

| Method | Endpoint                   | Mô tả                  |
| ------ | -------------------------- | ---------------------- |
| GET    | `/api/products`            | Lấy danh sách sản phẩm |
| POST   | `/api/products`            | Đăng sản phẩm mới      |
| PUT    | `/api/products/:id`        | Chỉnh sửa sản phẩm     |
| PATCH  | `/api/products/:id/status` | Cập nhật trạng thái    |
| DELETE | `/api/products/:id`        | Xóa sản phẩm           |

### Wants (Cần mua)

| Method | Endpoint     | Mô tả                 |
| ------ | ------------ | --------------------- |
| GET    | `/api/wants` | Lấy danh sách nhu cầu |
| POST   | `/api/wants` | Đăng nhu cầu mua      |

### Forum

| Method | Endpoint                  | Mô tả                  |
| ------ | ------------------------- | ---------------------- |
| GET    | `/api/forum`              | Lấy danh sách bài viết |
| POST   | `/api/forum`              | Đăng bài viết mới      |
| POST   | `/api/forum/:id/upvote`   | Upvote bài viết        |
| POST   | `/api/forum/:id/join`     | Tham gia / rời nhóm    |
| POST   | `/api/forum/:id/comments` | Bình luận              |

### Chat

| Method | Endpoint                      | Mô tả                    |
| ------ | ----------------------------- | ------------------------ |
| GET    | `/api/chats`                  | Lấy danh sách phòng chat |
| POST   | `/api/chats/find-or-create`   | Tạo hoặc lấy phòng chat  |
| POST   | `/api/chats/:roomId/messages` | Gửi tin nhắn             |

### Upload

| Method | Endpoint      | Mô tả                     |
| ------ | ------------- | ------------------------- |
| POST   | `/api/upload` | Upload ảnh lên Cloudinary |

### AI (Gemini)

| Method | Endpoint                      | Mô tả                                |
| ------ | ----------------------------- | ------------------------------------ |
| POST   | `/api/gemini/analyze-pricing` | Gợi ý định giá sản phẩm              |
| POST   | `/api/gemini/match-reasoning` | Phân tích mức độ khớp want ↔ product |
| POST   | `/api/gemini/smart-lens`      | Nhận diện sản phẩm qua ảnh           |

### Admin

| Method | Endpoint                 | Mô tả                         |
| ------ | ------------------------ | ----------------------------- |
| GET    | `/api/admin/reports`     | Xem danh sách báo cáo vi phạm |
| PATCH  | `/api/admin/reports/:id` | Duyệt / xử lý báo cáo         |

---

## 🗄 Database Schema

Project sử dụng PostgreSQL qua Supabase. Chạy `supabase_schema.sql` để tạo toàn bộ bảng.

| Bảng                | Mô tả                              |
| ------------------- | ---------------------------------- |
| `products`          | Tin đăng bán sản phẩm              |
| `wants`             | Nhu cầu tìm mua                    |
| `forum_posts`       | Bài viết diễn đàn                  |
| `forum_comments`    | Bình luận bài viết                 |
| `chat_rooms`        | Phòng chat giữa buyer & seller     |
| `messages`          | Tin nhắn trong phòng chat          |
| `seller_reviews`    | Đánh giá người bán                 |
| `listing_reports`   | Báo cáo vi phạm tin đăng           |
| `notifications`     | Thông báo người dùng               |
| `transactions`      | Lịch sử giao dịch / escrow         |
| `listing_analytics` | Thống kê lượt xem / chat theo ngày |

---

## 📜 Scripts

```bash
npm run dev          # Khởi động server Express + Next.js (development)
npm run build        # Build Next.js + bundle server.ts → dist/server.cjs
npm run start        # Chạy production server từ dist/
npm run clean        # Xóa build artifacts (.next, dist)
npm run lint         # TypeScript type check
```

---

## 📝 Lưu ý

- Project dùng **React RC**, nên `npm install` cần flag `--legacy-peer-deps`.
- Node.js v20 cần cài thêm package `ws` và cấu hình `realtime: { transport: ws }` khi khởi tạo Supabase client (đã được xử lý trong `server.ts`).
- Khi chạy lần đầu, server tự động seed dữ liệu mẫu vào Supabase nếu bảng `products` còn trống.
- Nếu chưa cấu hình Gemini API Key, các tính năng AI sẽ trả về dữ liệu giả lập (simulated) thay vì báo lỗi.
