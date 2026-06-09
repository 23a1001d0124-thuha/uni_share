export interface OTPEmailParams {
  otp: string;
  studentEmail: string;
  universityName: string;
  expiresMinutes: number;
}

/**
 * Generates an high-quality, responsive HTML template for OTP verification email
 */
export function generateOTPEmailHTML(params: OTPEmailParams): string {
  const { otp, studentEmail, universityName, expiresMinutes } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác minh sinh viên UNI-SHARE</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .wrapper {
      width: 100%;
      background-color: #f9fafb;
      padding: 40px 10px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #f3f4f6;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #2563eb;
      text-decoration: none;
      letter-spacing: -0.025em;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-top: 0;
      margin-bottom: 12px;
      text-align: center;
    }
    .school-info {
      background-color: #eff6ff;
      border-left: 4px solid #2563eb;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }
    .school-title {
      font-size: 14px;
      font-weight: 500;
      color: #1e40af;
      margin: 0;
    }
    .school-name {
      font-size: 16px;
      font-weight: 700;
      color: #1e3a8a;
      margin: 4px 0 0 0;
    }
    .content {
      font-size: 15px;
      line-height: 1.6;
      color: #374151;
      margin-bottom: 24px;
    }
    .otp-wrapper {
      text-align: center;
      margin: 32px 0;
    }
    .otp-box {
      display: inline-block;
      font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 0.15em;
      color: #2563eb;
      background-color: #f3f4f6;
      padding: 14px 28px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      text-shadow: 1px 1px 0px rgba(255,255,255,0.9);
    }
    .expires-notice {
      font-size: 13px;
      color: #ef4444;
      font-weight: 600;
      text-align: center;
      margin-top: 8px;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
      padding-top: 20px;
      margin-top: 32px;
      line-height: 1.5;
    }
    .footer a {
      color: #4b5563;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo">UNI-SHARE</span>
      </div>
      
      <h2 class="title">Xác thực tài khoản sinh viên</h2>
      
      <div class="content">
        Chào bạn, <br><br>
        Hệ thống ghi nhận bạn đang yêu cầu xác minh sinh viên cho tài khoản email cá nhân tại chợ trực tuyến <strong>UNI-SHARE</strong> thông qua hòm thư sinh viên của trường:
      </div>

      <div class="school-info">
        <p class="school-title">Trường học liên kết phát hiện:</p>
        <p class="school-name">${universityName}</p>
      </div>

      <div class="content">
        Dưới đây là mã xác thực (OTP) của bạn. Hãy nhập mã này vào trang xác thực trên ứng dụng để tiếp nhận huy hiệu sinh viên xác thực:
      </div>

      <div class="otp-wrapper">
        <div class="otp-box">${otp}</div>
        <div class="expires-notice">Mã OTP sẽ hết hạn sau ${expiresMinutes} phút!</div>
      </div>

      <div class="content" style="font-size: 14px; color: #6b7280; font-style: italic; text-align: center;">
        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn sẽ được bảo mật.
      </div>

      <div class="footer">
        © ${new Date().getFullYear()} UNI-SHARE - Chợ mua bán sinh viên nội khu.<br>
        Đây là email tự động, vui lòng không phản hồi hòm thư này.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
