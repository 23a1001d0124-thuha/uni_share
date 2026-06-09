# PROJECT SPECIFICATION (SPEC.md)

Chào mừng bạn đến với tài liệu đặc tả dự án **Chợ Đồ Cũ Sinh Viên (UNI-SHARE) - Nền tảng trao đổi và gom mua đồ nội bộ trường học**.

---

## 1. Tầm nhìn dự án (Project Vision)
Dự án nhằm giải quyết nhu cầu thanh lý và tìm kiếm đồ cũ, sách giáo trình, thiết bị công nghệ và đồ dùng phòng trọ giữa các sinh viên trong cùng một trường Đại học hoặc khu vực lân cận. Dự án mang tính kinh tế, trực tiếp, bảo mật và thân thiện với đời sống sinh viên.

---

## 2. Các tính năng cốt lõi (Core Features)

### A. Chợ đồ cũ sinh viên (Product Marketplace)
- **Danh mục sản phẩm:** Phân loại rõ ràng thành *Sách & Giáo trình*, *Thiết bị công nghệ*, *Đồ dùng phòng trọ*, *Đồ dùng cá nhân khác*.
- **Hệ thống lọc thông minh:** 
  - Lọc theo danh mục.
  - Lọc độ mới (Mới 100%, Lướt 99%, Còn tốt 85-95%, Đã qua sử dụng).
  - Lọc đồ giảm giá sâu (>20%).
  - Lọc sản phẩm từ người bán đã xác thực là Sinh viên (Đạt điểm tin cậy cao).
- **Bộ máy tìm kiếm thông minh:** Tìm kiếm không dấu tiếng Việt linh hoạt (Fuzzy search), khớp chính xác tiêu đề, nội dung mô tả hoặc nhãn AI gán cho sản phẩm.

### B. Robot phân tích giá và độ phù hợp (AI Assistant Evaluation)
- Mỗi sản phẩm khi cấu hình hoặc đăng bán sẽ được phân tích tự động:
  - So sánh giá bán với giá thị trường gốc để đưa ra tư vấn.
  - Chấm điểm độ phù hợp học đường (School Suitability Score).
  - Tự động gợi ý thẻ học tập (AI tags) giúp tăng khả năng tìm thấy.

### C. Bản tin Gom mua & Ở ghép (Wanted / Group-Buy Board)
- Nơi sinh viên đăng tin tìm bạn ở ghép phòng trọ, đặt chung đồ dùng giá rẻ học tập hoặc tìm mua gấp giáo trình cụ thể để kịp ôn thi.

### D. Xác thực thẻ sinh viên (Student ID Verification)
- Cho phép sinh viên tải ảnh thẻ sinh viên hoặc nhập mã số sinh viên kèm tên trường để nhận dấu tích xanh lá "Người bán uy tín", xây dựng cộng đồng mua bán an toàn không lừa đảo.

### E. Trực tiếp trò chuyện đàm phán (Chat Live Workspace)
- Trò chuyện trực tuyến tức thời để thỏa thuận giá cả, trao đổi địa điểm giao dịch ngay trong khuôn viên trường học mà không cần lộ thông tin cá nhân hay số điện thoại.

### F. Tìm kiếm bằng hình ảnh (AI Smart Lens Visual Search)
- **Nhận diện ảnh chụp đỉnh cao:** Cho phép sinh viên tải trực tiếp hình ảnh đồ vật hoặc sử dụng các ảnh mẫu tượng trưng.
- **Tự động phân tích sản phẩm:** Hệ thống sử dụng mô hình Gemini để bóc tách từ khóa tìm kiếm (Ví dụ: bàn phím Dareu, chuột Logitech, tủ lạnh Aqua), thẩm định sắc bén danh mục phù hợp.
- **Lấp đầy bộ tìm kiếm (Autofill):** Kết quả nhận diện tự động được điền trực diện vào thanh tìm kiếm và hiển thị các sản phẩm tương quan một cách thuận tiện.

### G. Trạm Gom Mua Thông Minh (Smart Co-Buy Hub)
- **Gom sỉ sinh viên đoàn kết:** Hỗ trợ kêu gọi gom mua chung giáo trình, tủ lạnh, quạt điện từ các nguồn đại lý giá gốc với mức chiết khấu cực sâu (lên đến 43%).
- **Tiến độ cập nhật trực quan:** Thể hiện tiến trình tham gia của sinh viên theo thanh phần trăm động.
- **Chuông reo hoàn thành chiến dịch:** Kích hoạt thông báo tự động bắn Coupon giảm sỉ và mã quà tặng đặc quyền khi gom đủ số người.

### H. AI Ghép nối nhu cầu (AI Tinder Matchmaking / AI Co-Matching System)
- **Thuật toán quét hai chiều:** Tự động lọc bóc tương thích giữa tin đăng tìm đồ (Wanted) của người mua với bài đăng sản phẩm thanh lý (Product) của người bán.
- **Hệ thống quẹt thẻ (Tinder Swipe):** Thiết kế thẻ ghép cặp trực quan với điểm số trùng khớp % do AI đánh giá kèm theo lý giải thẩm thấu sắc bén để sinh viên quyết định "Ghé xem ngay" hoặc "Bỏ qua".
- **Kích hoạt kết nối tức thời:** Khi quẹt phải, hệ thống tự động gán mở cửa sổ chat thương lượng tiện lợi cùng mức hỗ trợ voucher 20k lý tưởng.

---

## 3. Câu chuyện người dùng (User Stories) & Tiêu chí nghiệm thu (Acceptance Criteria)

### **User Story 1: Tìm kiếm tài liệu học tập dễ dàng**
*Là một sinh viên năm nhất vừa nhập học,*  
*Tôi muốn tìm mua sách giáo trình Triết học cũ với giá rẻ nhất và gần trường,*  
*Để tôi có thể học tập và kịp tiến độ thi cử mà không tốn kém quá nhiều chi phí mua sách mới.*

* **Tiêu chí nghiệm thu (AC):**
  - Tìm kiếm cụm từ `"triet hoc"` hoặc `"triết học"` đều ra chung một kết quả chuẩn xác nhờ bộ lọc tách dấu tiếng Việt.
  - Sách giáo trình hiển thị rõ giá gốc kèm giá thanh lý và có gắn nhãn đánh giá độ uy tín từ AI.
  - Có nút liên hệ trò chuyện trực tiếp để hẹn gặp lấy sách ngay tại giảng đường.

### **User Story 2: Đăng bán đồ nội thất phòng trọ khi chuyển đi**
*Là một sinh viên sắp ra trường dọn phòng,*  
*Tôi muốn đăng thanh lý nhanh tủ lạnh mini và quạt máy,*  
*Để thu hồi một chút vốn và gọn nhẹ hành lý chuyển đồ.*

* **Tiêu chí nghiệm thu (AC):**
  - Form đăng tin nhận ảnh, mô tả, độ mới, và gợi ý giá thanh lý.
  - Sản phẩm ngay lập tức xuất hiện trên giao diện Marketplace mà không bị lag.

### **User Story 3: Tìm bạn ở ghép giảm bớt gánh nặng tiền trọ**
*Là một sinh viên trọ xa nhà ở khu vực Bách Khoa,*  
*Tôi muốn đăng tin gom phòng ở ghép trong kỳ học mới,*  
*Để san sẻ chi phí tiền phòng và tìm được người bạn cùng chí hướng học tập.*

* **Tiêu chí nghiệm thu (AC):**
  - Người dùng có thể nhấn vào "Bản Tin Gom" để xem các tin đăng gom.
  - Có đầy đủ thông tin mô tả nhu cầu và nút "Nhắn tin thương lượng" trực tiếp.

### **User Story 4: Tìm kiếm đồ vật bằng ảnh chụp trực quan (AI Smart Lens)**
*Là một sinh viên bận rộn trên giảng đường,*  
*Tôi muốn tải một tấm ảnh chụp lên ứng dụng hoặc nhấn chọn nhanh các mẫu có sẵn,*  
*Để hệ thống tự động bóc tách từ khóa, danh mục sản phẩm và tự gõ chữ lọc tìm món đồ thanh lý tương quan một cách tức thì.*

* **Tiêu chí nghiệm thu (AC):**
  - Giao diện có phím Camera/AI Lens trực thăng nổi bật trên thanh tiêu đề đầu trang.
  - Hỗ trợ kéo thả kéo ảnh và hiện biểu đồ hiển thị phần trăm độ tin cậy của AI khi quét ảnh.
  - Điền tự động từ khóa nhận diện như `"Logitech Pebble"`, `"Dareu EK87"`, `"Wave Alpha"`... vào thanh tìm kiếm và hiển thị các sản phẩm trùng mục tiêu.

### **User Story 5: Tiết kiệm chi phí nhờ gom mua chung sỉ (Co-Buy Group)**
*Là một sinh viên nghèo muốn sắm sửa giáo trình hoặc đồ gia dụng phòng trọ,*  
*Tôi muốn tham gia hoặc bắt đầu một chiến dịch gom nhóm mua chung sỉ,*  
*Để được hưởng giá chiết khấu đại lý cực rẻ khi tích lũy đủ số lượng sinh viên tham gia đoàn kết.*

* **Tiêu chí nghiệm thu (AC):**
  - Giao diện Gom Mua hiển thị các chiến dịch Gom sỉ với ảnh sản phẩm, người đứng đầu, giá lẻ ban đầu, giá gom sỉ ưu đãi và phần trăm tiết kiệm rõ ràng.
  - Nút "Tham gia gom nhóm" tăng thành viên tức thì bằng cách lưu trữ IP/User ID người tham gia.
  - Đạt số lượng người sỉ mục tiêu hiển thị trạng thái "GOM THÀNH CÔNG 🎉" và bắn thông báo trao voucher ưu tiên mua sắm đặc biệt.

### **User Story 6: Khớp nhu cầu mua-bán tức thời bằng AI Matchmaker (AI Tinder)**
*Là một sinh viên có nhu cầu cần tìm mua đồ dùng hoặc tài liệu cũ gấp,*  
*Tôi muốn hệ thống AI tự phân tích nhu cầu của tôi và kết đôi trực tiếp bằng giao diện quẹt thẻ tiện lợi với các bài đăng của sinh viên khác bán đồ tương hợp,*  
*Để tôi nhanh chóng tìm được người đối ứng và thực hiện giao dịch thuận tiện.*

* **Tiêu chí nghiệm thu (AC):**
  - Hệ thống bóc tách nhu cầu tin tìm mua (Wanted) và bài đăng chào hàng (Products bán) tương đồng thông minh.
  - Thể hiện thẻ quẹt Tinder hiển thị mượt mà: hai bên Avatar bán/mua, điểm số % khớp nối, và lý giải thuyết phục từ AI.
  - Click "Khớp nhu cầu ngay" (Quẹt phải) kích hoạt liên thông chat và cấp hỗ trợ voucher 20k ăn ý.
