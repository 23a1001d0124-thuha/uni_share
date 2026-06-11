import { NextRequest, NextResponse } from "next/server";
import { supabase, JWT_SECRET } from "../../../../../lib/server-config";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Database not configured" }, { status: 500 });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ success: false, message: "Chưa đăng nhập" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const { studentEmail } = await request.json();

    if (!studentEmail) {
      return NextResponse.json({ success: false, message: "Thiếu email sinh viên" }, { status: 400 });
    }

    const domain = studentEmail.split("@")[1];
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Xóa OTP cũ nếu có, insert mới
    await supabase.from("email_verifications").delete().eq("user_id", decoded.userId);
    await supabase.from("email_verifications").insert({
      user_id: decoded.userId,
      student_email: studentEmail,
      otp_code: otp,
      otp_hash: otpHash,
      university_domain: domain,
      expires_at: expiresAt,
      is_used: false,
      attempts: 0,
    });

    // Gửi email OTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"UNI-SHARE" <${process.env.SMTP_USER}>`,
      to: studentEmail,
      subject: "Mã xác thực sinh viên UNI-SHARE",
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px">
          <h2 style="color:#2563eb">Xác thực sinh viên UNI-SHARE</h2>
          <p>Mã OTP của bạn:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e293b;padding:16px;background:#f1f5f9;border-radius:8px;text-align:center">
            ${otp}
          </div>
          <p style="color:#64748b;font-size:13px;margin-top:16px">
            Mã có hiệu lực trong <strong>15 phút</strong>.<br/>
            Không chia sẻ mã này cho bất kỳ ai.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, expiresIn: 900 });
  } catch (err: any) {
    console.error("[send-otp]", err);
    return NextResponse.json({ success: false, message: err.message || "Lỗi gửi OTP" }, { status: 500 });
  }
}