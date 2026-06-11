import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromReq, errorResponse } from "../../api-utils";
import { supabase } from "../../../lib/server-config";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromReq(req);
  if (!userId) return errorResponse("Bạn chưa đăng nhập!", 401);

  if (!supabase) return errorResponse("Database not configured", 500);

  const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
  if (error || !data) return errorResponse("Không tìm thấy người dùng", 404);

  return NextResponse.json({
    success: true,
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
}
