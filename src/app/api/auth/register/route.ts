import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabase } from "../../../../lib/server-config";

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json();
    
    if (!email || !password || !displayName) {
      return NextResponse.json({ success: false, message: "Vui lòng nhập đầy đủ thông tin đăng ký!" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, message: "Database not configured" }, { status: 500 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const { data: existing } = await supabase.from("users").select("email").eq("email", email).single();
    if (existing) {
      return NextResponse.json({ success: false, message: "Email này đã được sử dụng!" }, { status: 400 });
    }

    const { data, error } = await supabase.from("users").insert({
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      display_name: displayName,
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
      rating: 5.0,
      review_count: 0
    }).select("*").single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ 
      success: true, 
      message: "Đăng ký thành công!", 
      user: { id: data.id, email: data.email, displayName: data.display_name } 
    }, { status: 201 });

  } catch (err: any) {
    console.error("Register Error:", err.message);
    return NextResponse.json({ success: false, message: "Lỗi hệ thống khi đăng ký!" }, { status: 500 });
  }
}
