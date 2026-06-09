# Nhật Ký Thay Đổi

## 2026-06-09

### Đã thêm

- Thêm các bảng schema Supabase cho báo cáo tin vi phạm, đánh giá người bán, thông báo, giao dịch escrow-lite và thống kê tin đăng của người bán.
- Thêm các API backend để gửi báo cáo vi phạm, xử lý báo cáo trong admin, tạo đánh giá người bán, đọc thông báo, tạo giao dịch và đọc thống kê người bán.
- Thêm trang quản trị `/admin` để xem báo cáo vi phạm, lọc theo trạng thái và đánh dấu báo cáo là đã duyệt hoặc đã gỡ tin.
- Thêm các file nền tảng PWA/SEO gồm `manifest.json`, service worker, icon ứng dụng, `robots.txt` và `sitemap.xml`.
- Đăng ký service worker khi chạy bản production.

### Đã thay đổi

- Cập nhật luồng báo cáo tin trong marketplace: báo cáo hiện được gửi lên backend thay vì chỉ hiện thông báo cục bộ.
- Cập nhật modal đăng nhập/đăng ký: khi thao tác thất bại, modal vẫn mở và hiển thị lỗi trả về.
- Cập nhật luồng đăng ký để tự động đăng nhập sau khi tạo tài khoản thành công.

### Đã kiểm tra

- `npx tsc --noEmit` chạy thành công.
- `npm run build` chạy thành công, bao gồm route `/admin` mới và bản build server.
