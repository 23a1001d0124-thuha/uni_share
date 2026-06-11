import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const JWT_SECRET = process.env.JWT_SECRET || "unishare_secret_key_development_2026";

// Lazy init — đọc env SAU khi dotenv.config() đã chạy ở server.ts
function getSupabase() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
}

if (!(global as any).inMemoryUsers) {
  (global as any).inMemoryUsers = [];
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    universityName?: string;
    universityShortName?: string;
    universityCity?: string;
    studentEmail?: string;
    isStudentVerified: boolean;
    rating: number;
    reviewCount: number;
  };
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ success: false, message: "Yêu cầu mã xác thực Token!" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || !decoded.id) {
      res.status(403).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn!" });
      return;
    }

    let userProfile: any = null;

    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", decoded.id)
        .single();

      if (!error && data) {
        userProfile = {
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
          reviewCount: data.review_count ? Number(data.review_count) : 0,
        };
      }
    }

    if (!userProfile) {
      const found = ((global as any).inMemoryUsers || []).find((u: any) => u.id === decoded.id);
      if (found) userProfile = found;
    }

    if (!userProfile) {
      res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
      return;
    }

    (req as any).user = userProfile;
    next();
  } catch (err: any) {
    console.error("JWT authentication error:", err.message);
    res.status(403).json({ success: false, message: "Session xác thực đã hết hạn!" });
  }
}