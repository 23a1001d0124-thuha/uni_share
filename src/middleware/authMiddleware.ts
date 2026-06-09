import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

// JWT Secret from env fallback to a secure test string
const JWT_SECRET = process.env.JWT_SECRET || "unishare_secret_key_development_2026";

// Re-import or create lightweight client if configured
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

// In-Memory store import or sharing (can be accessed globally in node process)
// We will assign a global map on `global` to share users between server and middleware
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

/**
 * Authentication check middleware
 */
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
          rating: data.rating ? Number(data.rating) : 5.0,
          reviewCount: data.review_count ? Number(data.review_count) : 0,
        };
      }
    }

    // Fallback to in-memory users if not found in Supabase or Supabase is not configured
    if (!userProfile) {
      const usersList = (global as any).inMemoryUsers || [];
      const foundUser = usersList.find((u: any) => u.id === decoded.id);
      if (foundUser) {
        userProfile = foundUser;
      }
    }

    if (!userProfile) {
      res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
      return;
    }

    // Attach to request
    (req as any).user = userProfile;
    next();
  } catch (err: any) {
    console.error("JWT authentication error:", err.message);
    res.status(403).json({ success: false, message: "Session xác thực đã hết hạn!" });
    return;
  }
}
