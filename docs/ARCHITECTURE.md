# SYSTEM ARCHITECTURE (ARCHITECTURE.md)

Tài liệu này mô tả sơ đồ cấu trúc hệ thống, các quyết định thiết kế cốt lõi (ADR) và luồng xử lý thông tin của ứng dụng **UNI-SHARE**.

---

## 1. Sơ đồ kiến trúc tổng quan (High-Level Architecture)

Ứng dụng được thiết kế theo mô hình **Full-stack lai (Client-Server Hybrid)** nhằm tối ưu hóa trải nghiệm tải trang nhanh và giữ an toàn dữ liệu nhạy cảm:

```
┌────────────────────────────────────────────────────────┐
│                   GIAO DIỆN CLIENT                     │
│  (React 18 + Vite SPA, Tailwind CSS, Motion/React)    │
└───────────────────────────┬────────────────────────────┘
                            │ (RESTful API / JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   SERVER BACKEND                       │
│  (Node.js + Express.js, Bundled via Esbuild as CJS)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   HỆ THỐNG PHỤ TRỢ                     │
│  - Gemini API (AI Evaluation, Tagging, Price Assistant)│
│  - In-Memory Memory Store (Persistent-ready)           │
└────────────────────────────────────────────────────────┘
```

---

## 2. Thiết kế chi tiết phía Client (Frontend Components)

Giao diện người dùng được phân chia thành các cấu phần Module độc lập, dễ bảo trì, tránh dồn hết mã nguồn vào duy nhất một tệp tin:

- **`src/main.tsx` & `src/index.css`**: Điểm khởi đầu chính của React, cấu hình Tailwind CSS 4 và nạp font chữ không gian hiển thị "Inter".
- **`src/App.tsx`**: Trực tiếp điều phối trạng thái hiển thị (Global state coordinator):
  - Lựa chọn tab hiển thị hiện tại (`activeTab`): Chợ đồ cũ (`products`) hoặc Bản tin gom (`wanted`).
  - Lưu giữ danh mục đăng tin, lọc tìm kiếm từ khóa, kích hoạt Modal xác thực sinh viên hoặc xem chi tiết.
  - Tích hợp **AI Visual Search Modal**: Cho phép sinh viên chụp hoặc tải tệp tin ảnh lên để thực hiện tìm kiếm bằng giọng/hình ảnh sinh động, tích lũy độ khớp confidence cực kỳ mượt mà.
- **`src/components/Header.tsx`**:
  - Gồm thanh tìm kiếm cải tiến với khả năng tìm nhanh không dấu chuẩn hóa tự động.
  - Tích hợp phím dọn sạch tìm kiếm tức thì, phím **AI Smart Lens (Camera)** để kích hoạt nhanh hành động tìm hàng bằng cách chụp ảnh, và phím hành động Đăng gom mua / Đăng đồ thanh lý nhanh.
- **`src/components/Hero.tsx`**: Khu vực tiếp thị đầu trang, kích thích hành động lọc sản phẩm: click phím xem giỏ hàng xịn, xem tin gom nhanh, giáo trình bán chạy hoặc tự động lọc các tài khoản sinh viên đã xác thực.
- **`src/components/ProductSection.tsx`**:
  - Thể hiện vùng lọc nâng cao trực diện, hiển thị rõ ràng những chỉ mục đang lọc (Danh mục, Độ mới, Giảm giá sâu, Đối tượng người bán).
  - Kết xuất danh sách thẻ sản phẩm (`ProductCard`) kèm hiệu ứng mượt mà.
- **`src/components/WantedItemsFeed.tsx`**: 
  - Đóng vai trò là trung tâm năng lực mới cho ba nhánh: 1) Góc tìm đồ (Cần mua) dạng bảng tin thông thường, 2) **AI Ghép Nối Nhu Cầu** thiết kế theo kiểu quẹt Tinder tinh tế đầy đủ độ tương hợp, và 3) **Smart Gom Mua** theo đổi tác nhóm giá sỉ hiệu quả.
- **`src/components/ChatWorkspace.tsx`**:
  - Module chat chuyên nghiệp đóng vai trò kết nối giữa người có nhu cầu mua và người bán hàng thông thường.
- **`src/components/PostItemModal.tsx` & `src/components/StudentVerifyModal.tsx`**: Nhập liệu thông tin đăng tin và xử lý quy trình chụp chứng minh mã số sinh viên.

---

## 3. Thiết kế chi tiết phía Backend (Backend Server)

Tệp tin `/server.ts` đóng vai trò là xương sống cho máy chủ phát triển và vận hành sản xuất:

- **Bộ điều phối tài nguyên tĩnh (Static Assets Server):**
  - Trong môi trường phát triển (`development`), kích hoạt Middleware nâng cao của Vite để biên dịch nóng tức thời.
  - Trong môi trường phân phối (`production`), phục vụ thư mục tĩnh `dist/` và điều hướng SPA bằng cơ chế Wildcard route fallback (`index.html`).
- **An toàn khóa bảo mật bí mật (API Key Security):**
  - Khóa `GEMINI_API_KEY` được bảo lưu và gán trực tiếp ở server, hoàn toàn ẩn dụ không hiển thị với ứng dụng chạy ở trình duyệt của người dùng.
- **Tính toán tìm kiếm chuẩn chữ Việt:**
  - Định dạng chuyển đổi chuỗi chuẩn Unicode (`NFD`), loại trừ toàn bộ nguyên âm có dấu đặc biệt giúp việc tra cứu từ khóa sinh viên cực kỳ ăn ý và chính xác.
- **Các API chức năng thông minh mới:**
  - **`/api/visual-search` (POST):** Tiếp nhận dữ liệu hình ảnh mã hóa chuỗi (base64) từ Frontend, chuyển giao cho Gemini Vision API để bóc tách từ khóa sản phẩm tương ứng và trả về kết quả gợi ý chuẩn xác kèm tỷ lệ phần trăm tin tưởng.
  - **`/api/matchmaking` (GET):** Quét toàn bộ kho dữ liệu bài đăng rao bán đồ thanh lý phối kết trực diện với các bản tin cần mua của sinh viên để tạo ra Matchmaker Tinder Cards đầy đủ điểm trùng khớp và động lực AI thuyết minh.
  - **`/api/cobuy` & `/api/cobuy/:id/join` (GET, POST):** Cung cấp các tuyến gom nhóm mua sắm sỉ, quản lý trạng thái, lượng thành viên tham gia thực tế và kích hoạt Voucher đại lý khi hoàn chỉnh.

---

## 4. Quyết định kiến trúc chính (Architectural Decision Records - ADR)

### ADR 01: Chuẩn hóa tìm tiếng Việt không dấu (Vietnamese Search)
- **Bối cảnh:** Sinh viên thường gõ tắt nhanh hoặc không thuận gõ dấu đầy đủ khi đang tìm nhanh trên điện thoại trên giảng đường (Ví dụ: `giao trinh`, `quat mini`).
- **Giải pháp:** Cả Frontend và Backend đều áp dụng phương pháp chuẩn hóa dùng Regular expression loại bỏ dấu để so sánh tương đồng tương đối.

### ADR 02: Ưu tiên thiết kế tối giản, trực quan (Typography & Minimalism)
- **Bối cảnh:** Ứng dụng chợ có quá nhiều luồng thông tin dễ gây rối mắt.
- **Giải pháp:** Sử dụng màu ghi nhẹ của Tailwind, bo tròn cực lớn (`rounded-2xl`) cùng phong cách chữ gọn gàng nhằm tăng cường thẩm mỹ.

### ADR 03: Hệ thống gom mua sỉ đồng lòng (Co-Buying Smart Pool)
- **Bối cảnh:** Sinh viên có ngân sách hạn chế nhưng thường có nhu cầu tương đối giống nhau trên các giáo trình hoặc linh kiện đồ dùng cơ bản trong ký túc xá.
- **Giải pháp:** Thiết kế kho lưu trữ đồng bộ cho mỗi Campaign, kiểm toán theo địa chỉ IP hoặc UserID để ngăn chặn việc spam bấm gom nhóm giả mạo, và thực hiện chuyển nhượng trạng thái tự động sang hoàn tất khi đủ mục tiêu.

### ADR 04: Giải thuật Image Lens không làm nghẽn luồng (Asynchronous Visual AI Lens)
- **Bối cảnh:** Xử lý chụp phân tích ảnh trực tiếp trên server qua mô hình Gemini Vision có thể tốn từ 1 - 3 giây.
- **Giải pháp:** Thiết kế luồng Frontend bất đồng bộ, sử dụng hiệu ứng xoay tròn và vạch quét Laser màu kết hợp với mô phỏng tỷ lệ tự tin tăng tiến tăng độ kích thích thị giác trước khi trả về kết quả bóc tách cuối cùng.
