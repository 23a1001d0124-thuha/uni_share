import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase, JWT_SECRET } from "../../../../lib/server-config";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Vui lòng nhập Email và Mật khẩu!" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, message: "Database not configured" }, { status: 500 });
    }

    const { data, error } = await supabase.from("users").select("*").eq("email", email).single();

    if (error || !data) {
      return NextResponse.json({ success: false, message: "Email hoặc mật khẩu không chính xác!" }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, data.password);
    if (!validPassword) {
      return NextResponse.json({ success: false, message: "Email hoặc mật khẩu không chính xác!" }, { status: 401 });
    }

    const token = jwt.sign(
      { id: data.id, email: data.email, displayName: data.display_name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      success: true,
      message: "Đăng nhập thành công!",
      token,
      user: {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        universityName: data.university_name,
        universityShortName: data.university_short_name,
        universityCity: data.university_city,
        studentEmail: data.student_email,
        isStudentVerified: data.is_student_verified,
        isTrustedVerified: data.is_trusted_verified || false,
        rating: data.rating ? Number(data.rating) : 5.0,
        reviewCount: data.review_count || 0
      }
    });

  } catch (err: any) {
    console.error("Login Error:", err.message);
    return NextResponse.json({ success: false, message: "Lỗi hệ thống khi đăng nhập!" }, { status: 500 });
  }
}
