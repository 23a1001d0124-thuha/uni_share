# PROJECT CHANGELOG (CHANGELOG.md)

## [Hotfix] - 2026-06-11 — Phòng Thương Lượng Chat: Fix Toàn Diện Database & Real-time

### Sửa lỗi (Fixed)

- **[CRITICAL] Hardcode `buyer_id = "user_client_default"` trong toàn bộ luồng chat (`server.ts`):** Mọi phòng chat được tạo ra đều gán cứng `buyer_id` là một chuỗi giả, khiến tất cả người dùng chia sẻ cùng một dữ liệu chat, không phân biệt tài khoản. Đã xóa hoàn toàn hardcode, thay bằng `getUserIdFromReq(req)` đọc `userId` thật từ JWT Bearer token ở tất cả các endpoint: `GET /api/chats`, `POST /api/chats/find-or-create`, `POST /api/chats/:roomId/messages`.
- **[CRITICAL] `assembleChatRoom` hardcode tên buyer là "Sinh viên Nguyễn Thu Hạ (Bạn)" (`server.ts`):** Header phòng chat và danh sách room luôn hiện tên cố định thay vì tên thật. Đã sửa `assembleChatRoom` để lookup `buyer_id` và `seller_id` từ bảng `users` (Supabase), resolve `display_name`, `university_short_name` cho cả hai phía.
- **[CRITICAL] `POST /api/products` hardcode `authorId: "user_client_default"` (`server.ts`):** Sản phẩm được đăng không ghi nhận chủ sở hữu thật, khiến `assembleChatRoom` không thể tìm đúng seller khi tạo phòng chat. Đã fix: lấy `authorId` từ JWT token, đồng thời lookup `display_name` từ bảng `users` để làm `author` name thật.
- **[CRITICAL] `handleAddNewProductListing` hardcode `authorId: "user_client_default"` (`App.tsx`):** Client gửi `authorId` sai lên server dù đã đăng nhập. Đã đổi thành `user?.id`, thêm `Authorization: Bearer <token>` header vào request POST sản phẩm.
- **Seller không thấy phòng chat (`server.ts`):** `GET /api/chats` chỉ filter `buyer_id = userId`, khiến người bán không bao giờ thấy phòng chat của sản phẩm mình đăng. Đã sửa: fetch cả `buyer_id = userId` lẫn `seller_id = userId`, gộp và dedup trước khi trả về.
- **Header chat luôn hiện tên seller dù ai đang xem (`server.ts` + `ChatWorkspace.tsx`):** Giao diện không phân biệt perspective người xem — buyer thấy seller nhưng seller cũng thấy... seller. Đã thêm tham số `viewerUserId` vào `assembleChatRoom`, server tính `viewerRole` (`"buyer"` hoặc `"seller"`) và trả field `seller` = đối phương của người đang xem. `ChatWorkspace` dùng `chatPartner` (derived từ `viewerRole`) để render header và avatar tin nhắn đúng.
- **Người đăng sản phẩm tự mở chat mua chính sản phẩm của mình (`server.ts`):** `find-or-create` không kiểm tra `buyerId !== prod.authorId`. Đã thêm guard, trả `400` với message `"Bạn không thể nhắn tin hỏi mua sản phẩm của chính mình!"`.
- **Seller không nhận được tin nhắn real-time (`App.tsx`):** Seller không có rooms trong state khi load app nên không bao giờ `join_room` qua socket. Đã thêm `useEffect` reload chat rooms ngay sau khi user đăng nhập, tự `join_room` tất cả rooms qua socket. Sau khi `find-or-create` thành công, client cũng `join_room` ngay lập tức.
- **`new_message` socket handler mutate state trực tiếp (`App.tsx`):** Handler cũ `push()` trực tiếp vào array message, vi phạm immutability của React state. Đã tái cấu trúc: tạo `updatedRoom` object mới (`{...room, messages: [...room.messages, newMsg]}`), thay thế đúng index trong array.
- **Data cũ `buyer_id = "user_client_default"` tồn đọng trong Supabase (`server.ts`):** Các lần seed trước đã nhét chat rooms giả vào DB. Đã thêm hàm `cleanupLegacyHardcodedChats()` tự động chạy khi server khởi động, xóa toàn bộ `chat_rooms` và `messages` liên quan có `buyer_id = "user_client_default"`.
- **Seed chat rooms giả vào Supabase (`server.ts`):** Bước seed ban đầu nhét 2 phòng chat hardcode vào DB với `buyer_id = "user_client_default"`. Đã xóa bước seed này — phòng chat chỉ được tạo khi user thật bấm "Nhắn tin hỏi giá".
- **`GET /api/chats` fallback về in-memory data chứa hardcode (`server.ts`):** Khi Supabase không trả kết quả, server fallback về biến `let chatRooms = [...]` in-memory chứa tên "Nguyễn Thu Hạ (Bạn)". Đã đổi fallback thành `chatRooms: []` — không bao giờ trả data giả.
- **Next.js API route `GET /api/chats` không lọc theo user (`src/app/api/chats/route.ts`):** Route trả tất cả rooms cho mọi người. Đã thêm JWT decode để lấy `userId`, truyền vào `getChatsData(userId)`.
- **`assembleChatRoom` trong `readOnlyApiData.ts` hardcode buyer name (`src/lib/readOnlyApiData.ts`):** Mirror của lỗi trên ở tầng Next.js routes. Đã thêm param `allUsers[]`, lookup tên buyer/seller từ bảng `users`.
- **Thiếu Next.js API routes cho `find-or-create` và `[roomId]/messages`:** Các routes này chỉ tồn tại trong Express `server.ts`, không có file tương ứng trong `src/app/api/`. Đã tạo mới `src/app/api/chats/find-or-create/route.ts` và `src/app/api/chats/[roomId]/messages/route.ts` với đầy đủ JWT auth, Supabase lookup, kiểm tra quyền gửi tin.
- **`isMe` trong ChatWorkspace so sánh với chuỗi `"user_client_default"` (`ChatWorkspace.tsx`):** Tin nhắn không phân biệt đúng/sai bên. Đã đổi thành so sánh với prop `currentUserId` (UUID thật từ `user.id`).
- **Syntax error trong destructuring props `ChatWorkspace.tsx`:** Thiếu dấu phẩy sau `onLockInTransaction` khi thêm prop `currentUserId`. Đã fix.

### Thêm mới (Added)

- **`getUserIdFromReq(req)` helper (`server.ts`):** Hàm tiện ích đọc và verify JWT Bearer token từ `Authorization` header, trả về `userId` hoặc `null`. Được dùng tập trung ở tất cả chat endpoints thay vì lặp lại logic verify.
- **`viewerRole` field trong ChatRoom response:** Server trả thêm `viewerRole: "buyer" | "seller"` trong mỗi room object để FE biết perspective người đang xem mà render đúng giao diện.
- **`cleanupLegacyHardcodedChats()` (`server.ts`):** Hàm tự động dọn dẹp data cũ chạy một lần khi server khởi động, đảm bảo DB sạch trước khi người dùng bắt đầu tương tác.
- **Reload chat rooms theo auth state (`App.tsx`):** `useEffect` lắng nghe thay đổi `user` — khi login sẽ fetch lại `/api/chats` với token và join tất cả rooms; khi logout sẽ clear `chatRooms` state.

---

## [Hotfix] - 2026-06-11 — Làm lại Xác Nhận Địa Chỉ & Thanh Toán COD / VNPay

### Thêm mới (Added)

- **Form xác nhận địa chỉ đầy đủ (S-ADDR-01):** Xây dựng lại toàn bộ Step B "Địa chỉ giao nhận" trong `CheckoutWizard.tsx`. Thêm chế độ chọn địa chỉ hai nhánh:
  - **Preset ký túc xá / trường học:** Giữ lại 4 địa chỉ KTX mặc định với UI card chọn có highlight rõ ràng.
  - **Địa chỉ tùy chỉnh:** Form đầy đủ gồm Họ tên người nhận, Số điện thoại, Tỉnh/Thành phố → Quận/Huyện → Phường/Xã (cascade dropdown tự động reset cấp dưới khi đổi cấp trên), Số nhà/tên đường, và Ghi chú tùy chọn.
- **Validation địa chỉ thời gian thực (S-ADDR-02):** Tích hợp hàm `validateAddress()` kiểm tra từng trường khi `onBlur`, hiển thị lỗi inline với icon `AlertCircle`. Các rule: tên ≥ 3 ký tự, SĐT khớp regex `^(0|\+84)[0-9]{8,10}$`, tỉnh/quận/phường/đường đều bắt buộc. Nút "Chọn thanh toán" chặn nếu form còn lỗi.
- **Preview địa chỉ tổng hợp (S-ADDR-03):** Hiện block xem trước địa chỉ đầy đủ (đường + phường + quận + tỉnh) ngay bên dưới form khi đã điền đủ, kèm tên và SĐT người nhận.
- **Địa chỉ tóm tắt trên bước thanh toán (S-ADDR-04):** Bước C (Payment) hiển thị card tóm tắt địa chỉ giao nhận và thông tin người nhận để người dùng xác nhận trước khi hoàn tất.
- **Thanh toán COD – Tiền mặt khi nhận hàng (S-PAY-COD):** Thay thế và nâng cấp tùy chọn COD cũ. Khi chọn COD hiện block hướng dẫn 4 bước rõ ràng (liên hệ xác nhận → kiểm tra hàng → trả tiền mặt → xác nhận hai chiều) kèm cảnh báo không trả tiền trước khi hài lòng với hàng. Nút xác nhận đổi nhãn thành "Đặt Hàng COD". Màn hình hoàn tất hiển thị "💵 Tiền mặt (COD)".
- **Thanh toán VNPay – Cổng thanh toán trực tuyến (S-PAY-VNPAY):** Thay thế hoàn toàn tùy chọn MoMo bằng VNPay. Card thanh toán màu blue, hỗ trợ ATM nội địa / Visa / Mastercard / JCB / QR Code ngân hàng. Nút "Thanh toán qua VNPay ngay" mở cổng sandbox VNPay trong tab mới. Nút xác nhận đơn hàng bị **disabled** cho đến khi người dùng đã nhấn mở cổng VNPay, sau đó hiện trạng thái xanh xác nhận và unlock nút confirm.
- **API Route VNPay server-side (`src/app/api/payment/vnpay/route.ts`):** Tạo mới endpoint xử lý thanh toán VNPay chuẩn v2.1.0:
  - `POST /api/payment/vnpay`: Nhận `{ amount, orderId, orderInfo }`, tạo URL thanh toán ký **HMAC-SHA512** đúng chuẩn VNPay, trả về `{ paymentUrl, orderId }`.
  - `GET /api/payment/vnpay`: Xử lý IPN / Return URL từ VNPay, xác minh chữ ký HMAC-SHA512, parse `vnp_ResponseCode` và trả kết quả. Đọc config từ env vars `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL`.

### Cải tiến (Improved)

- **Chỉ báo bước (Step Indicator) nâng cấp:** Các bước đã hoàn thành hiện icon `CheckCircle2` màu emerald thay vì chỉ đổi màu text, giúp phân biệt rõ bước hiện tại / đã xong / chưa đến.
- **Order Summary sidebar phản ánh phương thức thanh toán:** Dòng "Phương thức" ở cột phải cập nhật theo thời gian thực khi người dùng chuyển đổi giữa StudentPay / VNPay / COD. Giảm giá StudentPay 15% chỉ áp dụng và hiển thị khi đang chọn StudentPay.
- **Reset trạng thái đầy đủ khi kết thúc wizard:** `handleFinishWizard` reset toàn bộ form địa chỉ, addrMode, preset, vnpayRedirected, orderId (regenerate timestamp mới) để đảm bảo wizard luôn sạch khi bắt đầu lại.
- **Màn hình hoàn tất bổ sung thông tin người nhận:** Block xác nhận đơn hàng trên Step D hiển thị thêm tên và SĐT người nhận (khi dùng địa chỉ tùy chỉnh) bên cạnh địa chỉ giao và phương thức thanh toán.

### Thay đổi phá vỡ tương thích (Breaking Changes)

- Tùy chọn thanh toán `"momo"` đã bị xóa khỏi union type `PaymentMethod`. Type mới: `"studentpay" | "vnpay" | "cod"`. Mọi nơi lưu trữ hoặc so sánh giá trị `"momo"` cần được cập nhật.

---

## [Hotfix] - 2026-06-11 — Real-time Socket.io cho tính năng Bản Tin SV

### Thêm mới (Added)

- **Real-time bình luận tức thì (`forum_new_comment`):** Server emit `io.emit("forum_new_comment", { postId, post })` ngay sau khi insert `forum_comments` thành công (cả nhánh Supabase lẫn in-memory fallback). Client lắng nghe event này và gọi `setForumPosts()` cập nhật đúng post tương ứng — bình luận mới hiện ngay trên màn hình mọi người đang xem mà không cần reload.
- **Real-time bài đăng mới tức thì (`forum_new_post`):** Server emit `io.emit("forum_new_post", newPost)` sau khi insert bài thành công. Client prepend bài mới lên đầu feed, bỏ qua duplicate nếu chính người dùng đó vừa đăng. Nếu đang ở tab khác sẽ nhận push notification "Bản tin mới 📣".
- **Badge "● Trực tiếp" trên header Bản Tin:** Indicator màu emerald nhấp nháy `animate-pulse` hiển thị cạnh tiêu đề để báo hiệu feed đang hoạt động real-time.
- **Auto-scroll đến bình luận mới nhất:** `commentsEndRef` + `useEffect` theo dõi `commentCount` trong `ForumBoard` — mỗi khi comment mới đến qua socket, danh sách tự cuộn mượt xuống cuối.

### Cải tiến (Improved)

- **Cleanup socket đầy đủ trong `App.tsx`:** Bổ sung `newSocket.off("forum_new_comment")` và `newSocket.off("forum_new_post")` vào cleanup function của `useEffect` socket, tránh memory leak và duplicate listener khi component re-mount.

---

## [Hotfix] - 2026-06-11 — Hoàn thiện tính năng Bản Tin SV: database thực, xóa localStorage, fix hardcode

### Sửa lỗi (Fixed)

- **[BUG] `handleUpvotePost` — fallback ghi localStorage:** Khi API upvote lỗi, handler cũ ghi kết quả vào `localStorage("uni_local_forum_posts")` thay vì giữ nguyên React state. Fix: áp dụng optimistic update trực tiếp lên state trước khi gọi API, sync lại với `data.upvotes` từ server nếu thành công. Xóa toàn bộ nhánh `localStorage.setItem`.
- **[BUG] `handleJoinGroupPost` — fallback ghi localStorage + hardcode userId:** Handler cũ dùng hardcode `"user_client_default"` khi gọi API và ghi joined list vào `localStorage` khi lỗi. Fix: lấy `user.id` thật từ auth context, optimistic update state ngay lập tức, sync authoritative `joinedUsers` từ server response. Xóa toàn bộ nhánh localStorage.
- **[BUG] `handlePublishForumPost` — fallback ghi localStorage + không truyền author thật:** Form đăng bài gửi `author` từ object newPost (do `ForumBoard` hardcode `"Nguyễn Thu Hạ (Bạn)"`), fallback khi lỗi ghi vào localStorage. Fix: truyền `user.displayName` và `user.universityName` từ auth context trực tiếp vào body POST. Fallback chỉ dùng optimistic local state (không localStorage).
- **[BUG] `handleAddForumComment` — fallback ghi localStorage + dùng `profile.name` không đồng nhất:** Cũ dùng `profile?.name` (UserProfile từ settings) thay vì `user.displayName` (auth context). Fix: dùng `user.displayName` và `user.universityName` nhất quán. Optimistic append comment vào state ngay, sync authoritative `data.post` từ server sau. Xóa nhánh localStorage.
- **[BUG] `fetchAllData` fallback đọc/ghi localStorage cho forum:** Khi Express unreachable, code cũ đọc `localStorage("uni_local_forum_posts")` trước, nếu không có mới dùng `INITIAL_FORUM_POSTS` rồi ghi vào localStorage. Fix: fallback thẳng về `INITIAL_FORUM_POSTS` static, không đọc/ghi localStorage.
- **[BUG] `ForumBoard` hardcode `author: "Nguyễn Thu Hạ (Bạn)"` trong form submit:** `handlePublishSubmit` trong `ForumBoard.tsx` hardcode tên và trường. Fix: nhận prop `currentUser` từ App, dùng `currentUser.displayName` và `currentUser.universityName`.
- **[BUG] `hasJoined` check dùng hardcode `"user_client_default"`:** Button "Đã đăng ký / Tham gia ngay" kiểm tra bằng string hardcode thay vì id user thật. Fix: dùng `currentUser?.id`.
- **[BUG] Next.js App Router thiếu toàn bộ API routes cho forum write operations:** Chỉ có `GET /api/forum` tồn tại trong App Router. Các route `POST /api/forum`, `POST /api/forum/[id]/upvote`, `POST /api/forum/[id]/join`, `POST /api/forum/[id]/comments` hoàn toàn không có → mọi thao tác write khi deploy Next.js standalone (Vercel) đều 404. Fix: tạo mới 4 route handlers đầy đủ với Supabase integration.

### Thêm mới (Added)

- **`src/app/api/forum/route.ts` — thêm `POST` handler:** Nhận `{ title, tag, content, author, school }`, insert vào `forum_posts` Supabase. Trả `{ success, post }`.
- **`src/app/api/forum/[id]/upvote/route.ts` _(mới)_:** `POST /api/forum/[id]/upvote` — đọc `upvotes` hiện tại từ Supabase, tăng 1, update, trả `{ success, upvotes }`.
- **`src/app/api/forum/[id]/join/route.ts` _(mới)_:** `POST /api/forum/[id]/join` — nhận `userId`, toggle (thêm/xóa) trong mảng `joined_users` của Supabase, trả `{ success, joinedUsers }`.
- **`src/app/api/forum/[id]/comments/route.ts` _(mới)_:** `POST /api/forum/[id]/comments` — insert vào `forum_comments`, tăng `comments_count` trên `forum_posts`, re-fetch và trả authoritative `{ success, comment, commentsCount, post }`.
- **`supabase_forum_groupbuy_migration.sql` _(mới)_:** Migration `ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS` cho 5 cột còn thiếu phục vụ tính năng Gom Mua Chung: `target_members INTEGER`, `current_price BIGINT`, `original_price BIGINT`, `product_image TEXT`, `is_group_buy_completed BOOLEAN DEFAULT FALSE`. Kèm index `idx_forum_posts_created` và `idx_forum_comments_post_id`.

### Cải tiến (Improved)

- **Prop `currentUser` cho `ForumBoard`:** Interface `ForumBoardProps` nhận thêm `currentUser?: { id, displayName, universityName }`. `App.tsx` truyền trực tiếp object `user` từ `useAuth()`.
- **Optimistic UI nhất quán cho toàn bộ forum actions:** Upvote, join, comment đều cập nhật UI ngay lập tức không chờ network, sau đó sync với response server. Trải nghiệm người dùng không bị giật/chờ đợi.
- **Kiến trúc dữ liệu thuần React state:** Mọi mutation forum chỉ tồn tại trong React state (server-first) hoặc in-memory fallback. Không còn bất kỳ `localStorage.setItem` nào trong luồng Bản Tin SV.

---

## [Hotfix] - 2026-06-10 — Sửa lỗi đăng bán & dọn dẹp Product Card

### Sửa lỗi (Fixed)

- **[BUG] Ảnh upload lên Cloudinary nhưng sản phẩm không vào database:** Root cause là schema Supabase thiếu column `tags` trong bảng `products`. `mapProductToDB()` luôn gửi trường `tags: []` khi insert, Supabase trả lỗi `column "tags" does not exist` → server bắt exception, fall through xuống in-memory store và vẫn trả `success: true` → client không biết có lỗi, ảnh đã upload Cloudinary xong nhưng record không được lưu. Fix: thêm migration `ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB`.
- **[BUG] Row Level Security (RLS) chặn mọi INSERT/UPDATE:** Supabase mặc định bật RLS trên tất cả bảng. Project dùng `SUPABASE_ANON_KEY` kết nối từ Express server (không phải Supabase Auth), nên không có policy nào match → mọi write bị chặn với lỗi `new row violates row-level security policy`. Fix: `DISABLE ROW LEVEL SECURITY` trên tất cả bảng — auth/authorization đã được xử lý ở tầng Express middleware.
- **[BUG] Supabase insert fail silent — client không biết lỗi:** Khi Supabase trả lỗi, `server.ts` chỉ `console.error` rồi fall through xuống in-memory store, vẫn trả `success: true`. `App.tsx` không phân biệt được dữ liệu vào DB hay chỉ vào RAM. Fix: trả `status 500` với error message thật khi Supabase fail; `App.tsx` hiện `alert()` với nội dung lỗi cụ thể.
- **[BUG] Gemini Smart Lens luôn trả hardcode fallback "Món đồ sinh viên đa năng (AI Lỗi)":** Route `/api/gemini/smart-lens` trong `server.ts` dùng `config: { responseMimeType: "application/json" }` — field này không hợp lệ trong block `config` của `@google/genai` v2 SDK khi gọi multimodal → SDK throw exception → catch block trả hardcode fallback. Fix: bỏ `responseMimeType` khỏi `config`, chỉ giữ `temperature: 0.2`. Tương tự fix `/api/gemini/analyze-pricing` bỏ `responseMimeType` và `systemInstruction` không hợp lệ.
- **[BUG] Catch block Gemini nuốt lỗi thật:** Cả 2 route Gemini trong `server.ts` trả `success: true` kèm data giả dù xảy ra exception thật, gây khó debug. Fix: catch block trả `status 500` với `error.message` thật; `PostItemModal.tsx` hiển thị error message cụ thể thay vì alert chung chung.

### Thêm mới (Added)

- **`add_tags_migration.sql`:** Migration thêm column `tags JSONB NOT NULL DEFAULT '[]'` vào bảng `products` kèm GIN index `idx_products_tags` phục vụ tìm kiếm theo tag.
- **`fix_rls_migration.sql`:** Migration tắt RLS trên 12 bảng: `products`, `wants`, `forum_posts`, `forum_comments`, `chat_rooms`, `messages`, `listing_reports`, `seller_reviews`, `notifications`, `transactions`, `listing_analytics`, `users`.

### Cải tiến (Improved)

- **Logging chi tiết POST /api/products:** Thêm `console.log` in payload trước khi insert và xác nhận khi insert thành công, dễ trace lỗi DB trong môi trường production.
- **Error message SmartLens rõ ràng hơn:** `PostItemModal.tsx` hiện alert với nội dung `data.error` từ server thay vì thông điệp cứng "Lỗi phân tích hình ảnh từ AI!".

```
server.ts                           ~ Modified (Gemini config fix, Supabase error handling)
src/App.tsx                         ~ Modified (error handling khi POST product thất bại)
src/components/PostItemModal.tsx    ~ Modified (hiển thị error message thật)
add_tags_migration.sql              + Added
fix_rls_migration.sql               + Added
```

---

## [Hotfix] - 2026-06-10 — Sửa lỗi PostItemModal nhập thủ công & AI Assessor

### Sửa lỗi (Fixed)

- **[BUG] Dropdown Danh mục & Tình trạng có giá trị mặc định khi nhập thủ công:** Nút "Tự nhập thủ công →" set `newProdCategory = CATEGORIES[0]` và `newProdCondition = CONDITIONS[2]` thay vì để trống, khiến form trông như đã điền sẵn. Fix: set cả 2 về `""` khi vào manual mode; thêm option placeholder `— Chọn danh mục —` / `— Chọn tình trạng —` vào `<select>` chỉ hiện ở manual mode.
- **[BUG] Nút AI Assessor bị mờ không rõ lý do:** Nút "Phân Tích Giá & Khả năng Bán Bằng AI" `disabled` khi `newProdName` rỗng nhưng không có hint giải thích, user tưởng tính năng không tồn tại ở manual mode. Fix: thêm hint text động "Nhập tên sản phẩm trước để kích hoạt phân tích AI." khi chưa có tên.
- **[BUG] Submit không validate Danh mục & Tình trạng:** `handlePostSubmit` chỉ check `newProdName`, `newProdPrice`, `newProdDescription` — có thể submit với category/condition rỗng. Fix: thêm `!newProdCategory || !newProdCondition` vào điều kiện guard.
- **[BUG] `setPricingAnalysis(null)` không được gọi khi vào manual mode:** Nếu user đã dùng AI Assessor rồi quay lại step 1 → nhập thủ công, kết quả pricing cũ vẫn còn. Fix: thêm `setPricingAnalysis(null)` trong handler nút thủ công.

```
src/components/PostItemModal.tsx    ~ Modified
```

---

## [Hotfix] - 2026-06-10 — Tái thiết kế Product Card Marketplace

### Thay đổi (Changed)

- **Dọn dẹp badge overlay chồng chéo trên ảnh sản phẩm:** Card cũ có 5 lớp badge đồng thời trên ảnh (discount, category, SV Verified, condition, suitabilityScore Match) dùng hack `mt-7` để tránh chồng nhau — không ổn định và rối mắt. Thiết kế lại:
  - `top-left`: Discount badge **hoặc** category badge (không cả 2), SV Verified bên dưới — không bao giờ chồng.
  - `top-right`: Nút save + condition label gọn.
  - Bỏ hoàn toàn badge "X% Match" và progress bar "AI khớp" khỏi card — thông tin này vẫn còn trong detail modal.
- **Bỏ "Sản phẩm của bạn" hardcode theo tên:** Nút này check `product.author === "Nguyễn Thu Hạ (Bạn)"` — sai hoàn toàn với user thật. Đã xóa logic này, tất cả sản phẩm đều hiện nút "Mua ngay" + giỏ hàng bình thường.
- **Bỏ hiển thị tên tác giả dạng `author.split(" ").pop()`:** Cách lấy chữ cuối tên gây hiện tên đơn lẻ ("Hai", "Hà"...) không có ngữ nghĩa. Thay bằng chỉ hiện `school` + icon SV Verified.
- **Giảm tags hiển thị từ 3 xuống 2**, dùng màu neutral (`bg-stone-100 text-stone-500`) thay vì rose để bớt rối.
- **Badge "Rất rẻ (Hạt dẻ 🌟)"** (`getPriceEvaluationBadge`) bị xóa khỏi card — thay bằng discount % badge đơn giản đã có.

```
src/components/MarketplaceSpace.tsx ~ Modified (product card rewrite)
```

---

Nhật ký ghi nhận lịch sử thay đổi dự án và hoàn thiện năng lực ứng dụng qua các Sprint.

---

## [Enhancement] - 2026-06-10 — Hoàn thiện tính năng Đăng bán bằng AI (AI Product Listing)

### Thêm mới & Cải tiến (Added & Improved)

- **Nâng cấp Gemini 2.0-flash (Latest AI Model):** Toàn bộ hệ thống AI (Smart Lens, Định giá, Matchmaking, OCR thẻ sinh viên) đã được nâng cấp lên phiên bản **Gemini 2.0-flash** mới nhất. Mang lại tốc độ phản hồi siêu nhanh và khả năng nhận diện hình ảnh vượt trội.
- **Quy trình Phân tích AI Thủ công (Manual AI Analysis Flow):** Chuyển từ cơ chế tự động sang nút "Phân Tích Bằng AI" thủ công. Người dùng tải ảnh lên, xem preview và chủ động kích hoạt AI để nhận diện, giúp tăng tính kiểm soát và tin cậy.
- **Bảng Kết quả AI Chi tiết (Rich AI Metadata Display):** Hiển thị bảng kết quả phân tích đầy đủ ngay tại Step 1 gồm: Tên gợi ý, Danh mục, Giá đề xuất, Mô tả chi tiết & Tình trạng, và các Thẻ từ khóa (Tags) do Gemini AI bóc tách.
- **Đồng bộ Dữ liệu Toàn diện (Full Data Pre-filling):** Nút "Dùng thông tin này" hiện đã tự động điền toàn bộ các trường dữ liệu ở Step 2, bao gồm cả trường **Mô tả chi tiết** (trước đây chỉ điền Tên và Giá), giúp người dùng tiết kiệm tối đa thời gian nhập liệu.
- **Hợp nhất Component Đăng tin (Consolidated Post Modal):** Gỡ bỏ logic đăng tin dư thừa bên trong `MarketplaceSpace.tsx` và chuyển sang sử dụng component toàn cục `PostItemModal.tsx`.
- **Sửa lỗi Gemini AI Integration (Fixed AI Integration Bugs):**
  - Sửa lỗi cấu trúc `contents` và cập nhật model chuẩn để đảm bảo hệ thống gọi AI thật thay vì dùng dữ liệu giả.
  - Mở rộng Prompt để AI trả về trường `description` chuyên sâu cho sản phẩm.
- **Cải thiện UI/UX Quét AI (Enhanced AI Scanning Experience):** Thêm hiệu ứng thanh quét laser trực quan và tích hợp nén ảnh tự động (Auto-compression) để tối ưu hiệu năng.

```
src/components/PostItemModal.tsx    ~ Modified (Manual AI Trigger & Rich Prefill)
server.ts                           ~ Modified (Gemini 2.0-flash upgrade)
src/routes/auth.ts                  ~ Modified (OCR upgrade to 2.0-flash)
src/components/MarketplaceSpace.tsx ~ Modified (Consolidation)
docs/CHANGELOG.md                   ~ Updated
```

---

## [Hotfix] - 2026-06-10

### Sửa lỗi (Fixed)

- **[BUG] Gemini Smart Lens không chạy thật:** Route `POST /api/gemini/smart-lens` gọi model `"gemini-3.5-flash"` không tồn tại, SDK ném exception và route luôn trả dữ liệu giả cứng (`simulated: true`) dù đã có `GEMINI_API_KEY`. Sửa thành `"gemini-1.5-flash"` và thêm `temperature: 0.2`.
- **[BUG] Nhập thủ công Step 2 hiện dữ liệu sẵn:** Nút "Tự nhập thủ công →" chỉ gọi `setPostStep(2)` mà không reset form, khiến dropdown Danh mục và Tình trạng đã có giá trị mặc định trông như đã điền. Sửa bằng cách reset toàn bộ fields về rỗng và set flag `isManualMode = true` trước khi chuyển Step 2.
- **[BUG] Banner "Đồng bộ bởi AI" hiện sai ngữ cảnh:** Banner xanh lá luôn hiện ở đầu Step 2 kể cả khi người dùng vào bằng đường thủ công. Sửa bằng cách phân nhánh theo `isManualMode` — thủ công hiện banner xám trung tính, AI path hiện banner xanh.
- **[BUG] Reset modal không đầy đủ:** `useEffect([isOpen])` chỉ reset UI states (`postStep`, `uploadedImage`, `lensResult`) mà không reset form fields, khiến dữ liệu cũ còn sót khi mở lại modal. Đã bổ sung reset toàn bộ fields trong `useEffect`.

### Thay đổi (Changed)

- **Xóa trường "Link ảnh vật lý (URL)":** Trường input URL ảnh bị xóa khỏi Step 2 — ảnh bắt buộc phải upload từ thiết bị để lưu trên Cloudinary, không cho phép dán link ngoài. Thay bằng upload zone có preview và nút đổi ảnh (chỉ hiện ở `isManualMode`). Luồng AI path hiển thị lại ảnh đã chọn ở Step 1 kèm badge xác nhận.
- **`handlePostSubmit` upload đúng luồng:** Logic upload trước đây luôn dùng `selectedFile` (file AI path), bỏ sót ảnh khi nhập thủ công. Sửa thành `isManualMode ? manualSelectedFile : selectedFile`.

```
src/components/PostItemModal.tsx    ~ Modified
server.ts                           ~ Modified (smart-lens model fix)
```

---

## [Hotfix / Enhancement] - 2026-06-10 — Gemini OCR nâng cao & lưu dữ liệu thẻ SV

### Thêm mới (Added)

- **Lưu dữ liệu OCR thẻ sinh viên vào Supabase:** Trước đây `_approveCard()` chỉ ghi `is_trusted_verified = true`, toàn bộ thông tin đọc được từ thẻ bị bỏ qua. Nay lưu đầy đủ 10 trường vào DB: `card_student_name`, `card_student_id`, `card_university_name`, `card_university_short`, `card_major`, `card_class_name`, `card_date_of_birth`, `card_enrollment_year`, `card_expiry_date`, `card_issue_date`, cùng `card_ocr_confidence` và `card_ocr_raw` (JSONB toàn bộ response Gemini).
- **`supabase_card_ocr_migration.sql` (file mới):** Migration thêm 12 cột OCR vào bảng `users` + 2 index (`idx_users_card_student_id`, `idx_users_card_student_name`) phục vụ tra cứu admin và anti-fraud.

### Cải tiến (Improved)

- **Gemini prompt mở rộng từ 4 lên 12 trường:** Bổ sung `universityShortName`, `major`, `className`, `dateOfBirth`, `enrollmentYear`, `expiryDate`, `cardIssueDate`, `rejectReason`. Thêm `temperature: 0.1`.
- **Xử lý lỗi Gemini HTTP:** Kiểm tra `geminiRes.ok` trước khi parse — nếu Gemini trả 4xx/5xx thì fallback auto-approve thay vì crash server.
- **Lý do từ chối ảnh động:** Response 400 giờ trả `rejectReason` từ AI thay vì thông điệp cứng.
- **Response API bổ sung `ocrData`:** Trả thông tin OCR về client để Step 5 hiển thị tên, MSSV, trường đã được AI đọc.

```
src/routes/auth.ts                  ~ Modified (upload-card + _approveCard rewrite)
supabase_card_ocr_migration.sql     + Added
```

---

---

## [Sprint 11] - 2026-06-10

### Thêm mới (Added)

- **Hệ thống xác minh sinh viên 2 tầng (Two-Tier Student Verification):**
  - **Tầng 1 — Badge "SV Xác Thực" (đã có):** Xác thực qua email `@*.edu.vn` + OTP 6 số, set `isStudentVerified = true`.
  - **Tầng 2 — Badge "SV Uy Tín ✦" (mới):** Sau khi hoàn thành Tầng 1, user upload ảnh thẻ sinh viên → Gemini Vision API (`gemini-1.5-flash`) OCR đọc tên, mã SV, tên trường → nếu `confidence >= 60` và `isStudentCard = true` thì set `isTrustedVerified = true`. Có fallback auto-approve khi dev mode (không có `GEMINI_API_KEY`).
  - **API mới:** `POST /api/auth/verify-student/upload-card` (protected) — nhận `imageBase64`, gọi Gemini, trả về `user` đã cập nhật.
  - **`VerifyStudentModal.tsx`:** Thêm Step 4 (upload zone + preview ảnh + hướng dẫn chụp) và Step 5 (màn hình thành công SV Uy Tín) vào modal xác thực hiện có. Step 3 (thành công Tầng 1) thêm nút "Nâng lên SV Uy Tín" dẫn sang Step 4.
  - **`AuthContext.tsx`:** Thêm field `isTrustedVerified: boolean` vào interface `UserProfile`.
  - **`App.tsx`:** Header badge phân 3 trạng thái (khách / SV Xác Thực / SV Uy Tín), sidebar card hiển thị icon `✦` khi `isTrustedVerified`.
  - **`supabase_trusted_verify_migration.sql`:** Migration thêm cột `is_trusted_verified` và `trusted_verified_at` vào bảng `users`.

---

## [Hotfix] - 2026-06-10

### Sửa lỗi (Fixed)

- **[BUG] Sidebar hiển thị thông tin người dùng khi chưa đăng nhập:** `profile` state trước đây được khởi tạo với dữ liệu cứng (hardcode tên "Sinh viên Nguyễn Thu Hạ", trường "Đại học Mở Hà Nội"), khiến góc dưới bên trái sidebar luôn hiện avatar card như đã đăng nhập dù chưa có phiên đăng nhập. Sửa bằng cách đổi giá trị khởi tạo thành `null` và chỉ `setProfile(...)` trong `useEffect` khi `user` từ `AuthContext` khác `null`.
- **[BUG] Badge thông báo hiển thị số "3" khi chưa đăng nhập:** `notifications` state được khởi tạo với 3 thông báo hardcode, làm chuông thông báo trên header luôn hiện badge đỏ "3" kể cả khi chưa đăng nhập. Sửa bằng cách đổi khởi tạo thành `[]` rỗng; 3 thông báo mặc định được chuyển vào hằng `DEFAULT_NOTIFICATIONS` và chỉ được load vào state khi user đăng nhập thành công (trong cùng `useEffect` xử lý auth).
- **[PATCH] TypeError: Cannot read properties of null ('isVerified'):** Sau hotfix trước, còn 8 chỗ dùng `profile.isVerified`, `profile.name`, `profile.school` trực tiếp bên ngoài guard block, gây crash khi `profile === null` (trước khi `useEffect` auth chạy xong). Sửa toàn bộ thành optional chaining `profile?.isVerified`, `profile?.name`, `profile?.school`.
- **[BUG] Logout không reset trạng thái:** Bổ sung nhánh `else` trong `useEffect` theo dõi `user` để khi đăng xuất (`user === null`), `profile` được reset về `null` và `notifications` được xóa về `[]`, đảm bảo giao diện trở về trạng thái khách hoàn toàn.

---

## [Sprint 10] - 2026-06-09 (Tái thiết kế UI/UX toàn diện - Premium Gen-Z)

### Thêm mới & Cải tiến (Added & Improved)

- **Giao diện "Premium Gen-Z" (S10-01):** Tái thiết kế toàn bộ hệ thống màu sắc chủ đạo sử dụng dải màu gradient thiên hướng đỏ thẫm `Rose-600` đến `Pink-500`. Cập nhật phông chữ hệ thống sang `Plus Jakarta Sans` trẻ trung, tạo độ bo góc dày `rounded-3xl` và áp dụng đổ bóng `shadow-md` mềm mại, mang đến trải nghiệm UI mang tính chất Premium hơn cho sinh viên.
- **Thẻ Sản Phẩm Tinh Tế (Marketplace Cards) (S10-02):** Nâng cấp thẻ sản phẩm ở trang chính: Tích hợp hình ảnh tràn viền thu hút có hiệu ứng `group-hover:scale-105`, huy hiệu điểm tương thích AI Match nổi bật ở góc hình ảnh.
- **Checkout Wizard Hiện Đại (S10-03):** Làm mới tiến trình thanh toán Checkout. Giả lập hiển thị mã QR Code đối với phương thức thanh toán ví điện tử Momo, tạo ra flow thanh toán mượt mà, chân thực. Bổ sung hiệu ứng pháo hoa vui nhộn rơi xuống khi người dùng hoàn thành bước giao dịch.
- **Nhật Ký Đăng Bán MyListings Masonry/Grid (S10-04):** Chuyển đổi hiển thị danh sách bài đăng từ khối dài thành dạng lưới 2 cột (Grid layout). Tái thiết kế bảng trạng thái (Banner) với gradient sang trọng, thống kê lượt đọc và nút tương tác thông minh tạo cảm hứng cho Sellers.
- **Đồng bộ Tinder Matchmaking & Di Động (S10-05):** Nâng cấp giao diện Tinder Swipe Match bằng việc thiết kế thẻ Match Premium, hiệu ứng ấn chạm chân thật. Tái sắp xếp thanh Mobile Bottom Nav tích hợp tab "Gom Mua" như là một diễn đàn tập trung thay thế nút Search.
- Thêm các bảng schema Supabase cho báo cáo tin vi phạm, đánh giá người bán, thông báo, giao dịch escrow-lite và thống kê tin đăng của người bán.
- Thêm các API backend để gửi báo cáo vi phạm, xử lý báo cáo trong admin, tạo đánh giá người bán, đọc thông báo, tạo giao dịch và đọc thống kê người bán.
- Thêm trang quản trị /admin để xem báo cáo vi phạm, lọc theo trạng thái và đánh dấu báo cáo là đã duyệt hoặc đã gỡ tin.
- Thêm các file nền tảng PWA/SEO gồm manifest.json, service worker, icon ứng dụng, robots.txt và sitemap.xml.
- Đăng ký service worker khi chạy bản production.
- Cập nhật luồng báo cáo tin trong marketplace: báo cáo hiện được gửi lên backend thay vì chỉ hiện thông báo cục bộ.
- Cập nhật modal đăng nhập/đăng ký: khi thao tác thất bại, modal vẫn mở và hiển thị lỗi trả về.
- Cập nhật luồng đăng ký để tự động đăng nhập sau khi tạo tài khoản thành công.

---

## [Sprint 9] - 2026-06-09 (Mở Rộng Tính Năng Và Trải Nghiệm Mua Chung)

### Thêm mới (Added)

- **Trạm Gom Mua Thông Minh (Smart Co-Buy Hub) (S9-01):** Bổ sung tính năng Gom chung linh kiện/giáo trình vào không gian Bản Tin (`ForumBoard.tsx`). Hỗ trợ cài đặt Mục tiêu Gom sỉ (`targetMembers`), Giá hiển thị chênh lệch để khoe mức giảm cực khủng từ đại lý.
- **Biểu đồ Cập nhật Động (Percent Bar) (S9-02):** Hiển thị thanh bar mô tả trạng thái `%` lấp đầy các slot mua chung, mang lại tính trực quan và kêu gọi tinh thần đoàn kết sinh viên.
- **Voucher Khuyến Khích Đội Nhóm (S9-03):** Tự động bắt sự kiện hoàn thành slot cuối cùng tại `App.tsx` (`handleJoinGroupPost`) và kích hoạt `SystemNotification` tặng thưởng mã Coupon giảm 20% đơn.
- **Bộ Lọc Siêu Động Khu Chợ (Advanced Filters) (S9-04):** Mở rộng tính năng tìm kiếm của `MarketplaceSpace.tsx`. Hỗ trợ thêm bộ lọc `Condition` (độ mới) và bộ khu biệt trực tiếp những phần có tỉ lệ giảm trên `20%` (Deep Discount) tạo lợi thế tối ưu cho người mua.
- **Nâng Cấp Khớp Thông Minh (Fuzzy Smart Tags) (S9-05):** Mở rộng cỗ máy lọc `filteredProducts` nhận diện luôn `AI tags` không dấu để sinh viên dễ dàng gõ các cụm từ gắn thẻ như "Gọn nhẹ", "Sách Toán" trên khung tìm kiếm chính.

---

## [Sprint 8] - 2026-06-09 (Tích hợp AI Tiên tiến)

### Thêm mới (Added)

- **Công cụ Đánh giá Giá bán & Phù hợp bằng AI (AI Assessor) (S8-01):** Tích hợp tính năng _Phân Tích Giá & Khả năng Bán Bằng AI_ nhờ Gemini AI bên trong module Đăng vật phẩm (`PostItemModal.tsx`). AI dựa trên Tình trạng, tên và Mô tả để tính toán khoảng giá hợp lý (Biên độ giá hợp lý), đề xuất giá bán tối ưu (Mức giá xuất sắc nhất), kèm theo các hệ số và độ tin cậy được tường minh hóa thành UI.
- **Chấm điểm Độ Phù hợp Học đường (School Suitability Score) (S8-02):** Cơ chế chấm điểm động sự liên quan của sản phẩm thanh lý với nhu cầu tại trường đại học (vật dụng, sách, giáo trình...), điểm số được sinh tự động bởi prompt phân tích sâu (Gemini `schoolSuitabilityScore`) qua endpoint `/api/gemini/analyze-pricing`, tích hợp hiển thị `% Match` và progress bar giao diện tại Marketspace.
- **Tự động hóa Gắn Thẻ Học Tập/Sản Phẩm (AI tags) (S8-03):** Phát sinh danh sách các từ khóa liên quan như `#ToánCaoCấp`, `#GọnNhẹ` từ AI phân tích. Cập nhật hệ thống dữ liệu Database, payload `products`, DB mapping fallback để hỗ trợ lưu mảng thẻ từ khóa `tags` hiển thị nổi bật dưới mô tả sản phẩm ở khu vực Chợ nhằm tăng cường mức độ tìm thấy (SEO cục bộ).
- **Cập nhật Dữ Liệu Fake Tương thích (S8-04):** Bổ sung dữ liệu AI Tags mẫu vào hệ thống sản phẩm Mặc định (`fallbackData.ts`) dành cho người dùng offline, giúp làm quen với giao diện phân tích AI tags và độ phù hợp giao dịch.

### Cải tiến (Improved)

- Chỉnh sửa Payload PUT và POST trong `server.ts` để lưu trữ hoàn thiện metadata từ quá trình xác thực Smart Assessor thông minh trước khi commit.

---

## [Sprint 7] - 2026-06-09 (Tính năng giao dịch & Tin cậy)

### Thêm mới (Added)

- **Hệ thống Quản lý Box Thông Báo Động (Dynamic Notifications) (S7-02.b):** Nâng cấp module Notification Box, chuyển đổi từ danh sách tĩnh sang luồng sự kiện thời gian thực (real-time stream) cho phép tiếp nhận thông điệp khi thanh toán thành công, hoàn thành đánh giá hoặc có tin nhắn đến mới.
- **Tính năng Báo cáo lừa đảo (Anti-fraud Reporting) (S7-03):** Mở rộng tính năng bằng việc tích hợp `FraudReportModal` hoàn chỉnh tại `MarketplaceSpace`. Hỗ trợ các lý do vi phạm như "Phá giá", "Yêu cầu chuyển khoản trước", tự động xử lý và lưu trạng thái cảnh báo trên nền tảng.
- **Danh sách Yêu thích/Đã lưu (Wishlist & Saved Items) (S7-07):** Bổ sung chức năng "Thả tim" trên thẻ mặt hàng ở chợ (`MarketplaceSpace`). Tự động cập nhật vào danh sách yêu thích và hỗ trợ lọc riêng bằng bộ lọc "♥ Đã Lưu".
- **Hệ thống Chat Môi trường Thời gian Thực (S7-01):** Tích hợp `socket.io` & `socket.io-client` thiết lập Server websocket (`new SocketIOServer`), lắng nghe channel `new_message` đảm bảo trải nghiệm nhắn tin thương lượng không độ trễ (<500ms) trên toàn app.
- **Hệ thống Notification Toàn cục (S7-02):** Nâng cấp icon Notification Bell (Mobile + Desktop) tự động hiển thị popup badge số lượng thông báo chưa đọc đối với tin nhắn mới, đồng bộ trạng thái khi xem trang bằng React states.
- **Hệ thống Rating Điểm uy tín Người Bán (S7-04):** Liên kết `uni_ratings` từ `CheckoutWizard` đến trang `SellerProfileModal`, tính toán Điểm trung bình tổng kết (1.0 đến 5.0 sao) và số lượt nhận xét. Hiển thị UI sang trọng cho thành quả người bán.
- **Dịch vụ Escrow-Lite (Giữ chỗ) (S7-06):** Mở rộng workflow trạng thái từ "Đang chờ" (Lock-in từ Chat phòng thương lượng) sang "Đã bán" khi Checkout thành công. Bổ sung Trigger động đẩy System Notification báo cáo hoàn tất thanh toán Escrow an toàn đến người mua.
- **Hệ thống lọc nâng cao (Search & Filtering) (S7-05):** Mở rộng bộ lọc Chợ qua Đa chiều: Chọn lọc cơ sở Đại học, khoảng giá linh hoạt `minPrice` - `maxPrice` cùng trải nghiệm cuộn thông minh `scrollIntoView`.

### Cải tiến (Improved)

- Tối giản hóa logic render bộ lọc giao diện đáp ứng đầy đủ kích thước Mobile (`flex-col lg:flex-row`).
- Quản lý trạng thái đánh dấu "Đã đọc" toàn cục cho Hộp thư thông báo bằng `markAllNotificationsRead` thông qua React Hook.

---

## [Sprint 6] - 2026-06-09 (Nền tảng dữ liệu thực & Auth hoàn chỉnh)

### Thêm mới (Added)

- **Kết nối Supabase Storage & Upload Ảnh Thực Tế (S6-02):** Khởi tạo endpoint `/api/upload` tại backend (sử dụng `multer` disk/memory buffer) tích hợp trực tiếp với bucket `images` của Supabase. Cho phép người dùng trực tiếp tải ảnh tĩnh hoặc tự động phân tích ảnh upload thay vì chèn ảnh demo URL.
- **Trang Profile Cá Nhân Sinh Viên & Người Bán (S6-05):** Rename Tab _Bài đăng của tôi_ thành _Trang Cá Nhân_. Xây dựng bổ sung module `<SellerProfileModal>` mở overlay khi bấm vào Tên tác giả ở Marketplace, hiển thị các trường avatar, tên sinh viên, trường, đánh giá, các mặt hàng Đã bán / Đang bán, tích hợp call-to-action Nhắn tin trao đổi ngay.
- **API Full CRUD Hệ Thống Sản Phẩm (S6-06):** Mở rộng backend tạo Endpoint `PUT /api/products/:id` nhận các tham số generic nhằm hỗ trợ tính năng sửa/cập nhật thông tin giao dịch linh động.
- **Modal Login/Register (Auth Gate) (S6-04):** Thêm `<LoginModal>` hoàn chỉnh với UX rõ ràng cho 2 tab Đăng nhập và Đăng ký. Tích hợp trực tiếp với API `login` và `register` từ `AuthContext`. Cung cấp validation, trạng thái loading với UI lucide icon chuyên nghiệp.
- **Bảo Vệ Tính Năng (Auth Gate Enforcement) (S6-03):** Đánh giá tình trạng người dùng (user context), chủ động bật Modal bảo vệ đăng nhập đối với mọi thao tác cốt lõi yêu cầu tài khoản: Đăng bán (`handleAddNewProductListing`), Thêm vào giỏ hàng (`handleAddToCart`), Bình chọn/Tham gia/Bình luận dạo Gom mua (`handleUpvotePost`, `handleJoinGroupPost`, `handlePublishForumPost`, `handleAddForumComment`), và Phản hồi/Tạo nhóm chat cá nhân (`handleProductChatTrigger`, `handlePostChatMessage`).
- **Chuyển Đổi Framework Hiện Đại (Tái cấu trúc kiến trúc sang Next.js 15):**
  - Khởi tạo `next.config.mjs` cài đặt cơ bản tối ưu buid.
  - Xây dựng App Router Layout (`src/app/layout.tsx`, `src/app/page.tsx`).
  - Gắn nhãn kiến trúc chuẩn `"use client"` trực tiếp trên toàn phần Entry point App (`src/App.tsx`), `AuthContext` do sử dụng Client-side React Hooks để phân định Client Boundaries.
  - Cấu trúc lại file đóng gói `package.json` với script `build`, `start` và dependency Next.js mới nhất, loại bỏ Vite.
  - Tích hợp chuẩn Tailwind v4 PostCSS plugin `postcss.config.mjs` đáp ứng tiến trình biên dịch Next.js.

### Cải tiến (Improved)

- Tối ưu hóa biểu thức xác định mã Coupon logic trong chức năng `CheckoutWizard.tsx` (gỡ bỏ lỗi phương thức node so sánh chuỗi sai cấu trúc).
- Nút "Đăng nhập" thay đổi linh động trạng thái UI dựa trên sự hiện diện dữ liệu sinh viên trong Header ứng dụng.

---

## [Sprint 5] - 2026-06-05 (Cải Tiến Chợ và Nâng Cao Trải Nghiệm Người Dùng)

### Thêm mới (Added)

- **Hệ thống tải giả lập (Skeleton Loading):** Khi lần đầu vào không gian hoặc đang trong trạng thái `isLoading`, hệ thống tự động hiển thị 8 Product Card dạng xương sườn (skeleton) với hiệu ứng sương mù lấp lánh `animate-pulse` để giữ nhịp trải nghiệm tốt nhất cho sinh viên.
- **AI Price Badge góc ảnh:** Tự động tính tỷ lệ giảm giá dựa trên giá bán và giá gốc (`originalPrice`); nếu mức ưu đãi giảm giá $\ge 10\%$, sẽ gắn đính huy hiệu overlay thông minh nổi bật tuyệt đối ở góc trên bên trái của ảnh bìa sản phẩm.
  - $\ge 40\%$: Huy hiệu rực lửa `"🔥 Siêu rẻ -X%"` (`bg-rose-600`)
  - $\ge 20\%$: Huy hiệu khẳng định chất lượng `"✓ Giá tốt -X%"` (`bg-emerald-600`)
  - $\ge 10\%$: Huy hiệu tiết kiệm `"-X%"` (`bg-amber-500`)
- **Compatibility Suitability Score bar:** Hiển thị thanh tiến độ lấp đầy `bg-rose-400` trên nền `bg-stone-100` mô tả trực quan phần trăm mức độ tương thích/phù hợp của sản phẩm ngay dưới tên đề bài đăng kề bên mô tả ngắn.
- **Trạng thái rỗng tùy biến (Empty State):** Khi thao tác tìm kiếm hoặc lọc không trả về của kết quả nào, hệ thống hiển thị biểu tượng `SearchX` nhẹ nhàng từ Lucide mang tông xám dịu mắt, dòng thông điệp thông báo rõ ràng kèm nút "Xóa bộ lọc" để đưa nhanh các tiêu chí lọc về trạng thái ban đầu.

### Cải tiến (Improved)

- **Cuộn mượt mà lên đầu trang (Smooth Scroll on Filter Change):** Tích hợp hook `useEffect` theo dõi các bộ lọc đầu vào, lập tức thực hiện cuộn mượt bằng `ref.current?.scrollIntoView({ behavior: 'smooth' })` để sản phẩm tìm được luôn đập ngay vào tầm mắt người xem.
- **Tối ưu hóa hình ảnh trì hoãn (Lazy Loading) & Fallback Placeholder:** Hỗ trợ thuộc tính trì hoãn `loading="lazy"` cho mọi ảnh card sản phẩm để tăng tốc tải trang, kèm hàm bắt lỗi `onError` thông minh tự lấp đầy sang ảnh thay thế placeholder an toàn thay vì lỗi hiển thị vỡ khung.
- **Chuẩn hóa Touch Target cho Thiết bị Di động:** Tái thiết kế toàn bộ hệ thống phím tương tác trong Card ("Giỏ hàng", "Mua ngay", "Chat đàm phán tức thì") đạt chiều cao tối thiểu an toàn $\ge 44px$ (`min-h-[44px]` và `py-2.5`) thân thiện với thói quen cầm nắm của ngón tay người dùng.

---

## [Sprint 4] - 2026-06-05 (Cập Nhật Di Động Toàn Diện)

### Thêm mới (Added)

- **Hệ điều hướng di động MobileBottomNav:** Thiết kế thanh điều hướng cố định dưới đáy màn hình (`fixed bottom-0`) gồm 5 tab đầy đủ tính năng: Chợ (MarketplaceSpace), Gom Mua (ForumBoard), Đăng bán, Chat (ChatWorkspace) và Tôi (MyListings). Hỗ trợ padding động tương thích Notch của các dòng iPhone (`env(safe-area-inset-bottom)`).
- **Hệ đăng bán toàn cục PostItemModal:** Tách biệt form đăng bán thanh lý sinh viên thành modal độc lập toàn cục, hỗ trợ kích hoạt trực tiếp từ vị trí nút trung tâm to tròn nổi bật của thanh điều hướng đáy di động.
- **Tương thích Viewport:** Bổ sung `viewport-fit=cover` vào tệp tiêu chuẩn `index.html` tối ưu hiển thị tràn viền an toàn trên các thiết bị di động.

### Cải tiến (Improved)

- **Tối ưu hóa Header di động:** Giới hạn chiều cao Header trên di động ≤ 56px cực kỳ gọn gàng. Ẩn thông tin sinh viên rườm rà thay vào đó chỉ giữ lại logo nhận diện góc trái kề bên biểu tượng thanh toán giỏ hàng và chuông báo thông báo góc phải.
- **Ẩn thanh Sidebar trên Di động:** Thêm cấu hình thích ứng `hidden md:flex` cho toàn bộ thanh danh mục trái, tránh việc chiếm dụng không gian và chống vỡ layout trên màn hình hẹp.
- **Bổ sung khoảng trống an toàn:** Kéo dãn không gian cuối trang với class `pb-20 md:pb-0` của khu vực hiển thị chính `<main>`, ngăn hoàn toàn việc các nút điều hành dưới đáy che phủ nội dung bài đăng.

---

## [Sprint 3] - 2026-06-03

### Thêm mới (Added)

- Bổ sung dữ liệu mô phỏng lớn gồm 14+ sản phẩm thanh lý quốc dân đa dạng (Sony headphones, tủ lạnh Aqua, máy sấy tóc Panasonic, giáo trình Triết học/Kinh tế chính trị, Pebble mouse, quạt tích điện, bàn gấp gỗ thông, sách cày đề thi Cambridge IELTS, đèn học chống cận Rạng Đông).
- Thiết kế thanh bộ lọc nâng cao **Active Search & Filter Banner** hiển thị chính xác mọi tiêu chí đang chọn cùng nút "Hủy lọc" (Clear filter) nhanh chóng cho người dùng.
- Thêm phím "Trở về Chợ" và cải tiến UI trên nút tắt giúp thanh điều hướng luôn mượt mà.
- **Tính năng tìm kiếm bằng hình ảnh (AI Smart Lens Visual Search):** Giới thiệu nút quét Camera ngay trên thanh công cụ Header, cho phép tải lên hoặc nhấp nhanh file ảnh giả lập. Tích hợp thanh quét laser và phần trăm tin cậy tăng dần, tự phân tích bóc tách từ khóa bằng Gemini để tự động điền vào thanh tìm kiếm.
- **Tính năng Smart Gom Mua (Co-Buy Groups):** Xây dựng trạm gom sỉ tiết kiệm tối đa cho sinh viên mua chung giáo trình hoặc đồ dùng phòng ở. Có thanh tiến độ đồng bộ, nút tham gia bảo mật và bắn coupon phần thưởng tự phát khi hoàn tất mục tiêu.
- **Tính năng AI Ghép Nối Nhu Cầu (AI Tinder Matching):** Thiết kế giao diện quẹt thẻ đối chiếu 2 chiều thời gian thực giữa người dùng cần mua (Wanted) và bài đăng chào bán (Products). Trình bày điểm số % trùng khớp và phân tích chuyên gia sắc sảo từ AI, hỗ trợ trực tiếp liên kết Live Chat và cấp mã giảm giá 20k.

### Cải tiến (Improved)

- Tối ưu hóa chức năng tìm kiếm nâng cao: Phát triển bộ lọc tách và khử toàn bộ dấu tiếng Việt (`normalize("NFD")`) ở cả đầu Frontend và Backend giúp sinh viên tìm kiếm không bị lỗi kể cả khi gõ không dấu (`triet hoc`, `ban hoc`, `dien thoai`, `quat`).
- Gắn hành động click từ các thẻ giới thiệu nổi bật (Hero Banner metrics) để chuyển đổi nhanh sang các danh mục mục tiêu (Sách giáo trình, Bản tin gom mua, Người bán uy tín,...).

---

## [Sprint 2] - 2026-05-20

### Thêm mới (Added)

- Tích hợp mô-đun Trò chuyện thương lượng mua bán thời gian thực trực tuyến giữa sinh viên mua và sinh viên bán hàng.
- Bổ sung form khai báo thông tin ảnh sinh viên chụp cùng mã thẻ sinh viên nhằm kích hoạt tính năng **Đã Xác Thực Thẻ Sinh Viên - Thẻ Uy Tín**.
- Tích hợp dịch vụ Gemini AI trợ lý đằng sau máy chủ hỗ trợ chấm điểm mức độ thân thiện và đề xuất tầm giá tương xứng thích hợp.

---

## [Sprint 1] - 2026-05-02

### Thêm mới (Added)

- Khởi tạo khung xương ứng dụng bằng React, Vite, TSX Express.
- Khóa toàn bộ định hướng cấu hình CSS Utility Tailwind 4 cùng bộ bảng màu hiện đại.
- Thực hiện thiết kế cấu trúc UI Chợ Đồ Cũ Sinh Viên cơ bản.
