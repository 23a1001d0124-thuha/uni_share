import { NextRequest, NextResponse } from "next/server";
import { supabase, JWT_SECRET } from "../../../../lib/server-config";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

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
    const { studentEmail, otp } = await request.json();

    // Lấy record OTP theo user_id
    const { data: record, error } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("user_id", decoded.userId)
      .eq("is_used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !record) {
      return NextResponse.json({ success: false, message: "Không tìm thấy yêu cầu xác thực. Vui lòng gửi lại mã." }, { status: 400 });
    }

    if (record.attempts >= 5) {
      return NextResponse.json({ success: false, code: "OTP_MAX_ATTEMPTS", message: "Nhập sai quá 5 lần. Vui lòng gửi lại mã mới." }, { status: 400 });
    }

    if (new Date() > new Date(record.expires_at)) {
      return NextResponse.json({ success: false, message: "Mã OTP đã hết hạn. Vui lòng gửi lại." }, { status: 400 });
    }

    // Kiểm tra OTP bằng bcrypt hash
    const isMatch = await bcrypt.compare(otp, record.otp_hash);
    if (!isMatch || record.student_email !== studentEmail) {
      await supabase
        .from("email_verifications")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);
      return NextResponse.json({
        success: false,
        message: `Mã OTP không đúng. Còn ${4 - record.attempts} lần thử.`,
      }, { status: 400 });
    }

    // OTP đúng → đánh dấu đã dùng, cập nhật user
    await supabase.from("email_verifications").update({ is_used: true }).eq("id", record.id);

    const { data: updatedUser } = await supabase
      .from("users")
      .update({
        is_student_verified: true,
        student_email: studentEmail,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", decoded.userId)
      .select()
      .single();

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: any) {
    console.error("[confirm-otp]", err);
    return NextResponse.json({ success: false, message: err.message || "Lỗi xác thực OTP" }, { status: 500 });
  }
}