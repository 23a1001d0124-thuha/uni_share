import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { detectUniversityFromEmail } from "../data/universities.js";
import { sendVerificationEmail } from "../lib/mailer.js";
import { generateOTPEmailHTML } from "../templates/otpEmail.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/authMiddleware.js";

// JWT Secret from env fallback to secure test key
const JWT_SECRET = process.env.JWT_SECRET || "unishare_secret_key_development_2026";

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Initialize global in-memory datasets if not done already
if (!(global as any).inMemoryUsers) {
  (global as any).inMemoryUsers = [];
}
if (!(global as any).inMemoryVerifications) {
  (global as any).inMemoryVerifications = [];
}
if (!(global as any).otpRequestMetrics) {
  // Structure: { [email: string]: number[] } - stores timestamps of request
  (global as any).otpRequestMetrics = {};
}

const router = Router();

/**
 * -------------------------------------------------------------
 * helper: rateLimitChecker
 * -------------------------------------------------------------
 * Enforce rate limit: maximum 3 requests per email per hour
 */
function isOtpRateLimited(email: string): boolean {
  const metrics = (global as any).otpRequestMetrics;
  const now = Date.now();
  const oneHourAgo = now - 3600 * 1000;

  if (!metrics[email]) {
    metrics[email] = [];
  }

  // Filter timestamps within the last hour
  metrics[email] = metrics[email].filter((timestamp: number) => timestamp > oneHourAgo);

  if (metrics[email].length >= 3) {
    return true;
  }

  // Register request timestamp
  metrics[email].push(now);
  return false;
}

/**
 * -------------------------------------------------------------
 * ENDPOINT FRONTEND: GET /api/universities/detect
 * -------------------------------------------------------------
 */
router.get("/detect-university", (req: Request, res: Response) => {
  const email = req.query.email as string;
  if (!email) {
    res.status(400).json({ success: false, message: "Email query parameter is required" });
    return;
  }

  const detected = detectUniversityFromEmail(email);
  if (detected) {
    res.json({
      success: true,
      found: true,
      university: {
        name: detected.name,
        shortName: detected.shortName,
        city: detected.city
      }
    });
  } else {
    res.json({
      success: true,
      found: false,
      suggestion: "Nếu trường bạn chưa có trong danh sách, hãy phản hồi về admin@uni-share.app để chúng mình cập nhật kịp thời nhé!"
    });
  }
});

/**
 * -------------------------------------------------------------
 * 1. POST /api/auth/register
 * -------------------------------------------------------------
 */
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;

  // Basic validation
  if (!email || !password || !displayName) {
    res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ thông tin đăng ký!" });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ success: false, message: "Định dạng email đăng ký không hợp lệ!" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ success: false, message: "Mật khẩu bảo mật phải dài từ 6 ký tự trở lên!" });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = "usr_" + crypto.randomBytes(8).toString("hex");

    let createdUser: any = null;

    if (supabase) {
      // Check if user already exists
      const { data: existing } = await supabase.from("users").select("email").eq("email", email).single();
      if (existing) {
        res.status(400).json({ success: false, message: "Email này đã được sử dụng trên Uni-Share!" });
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .insert({
          id: crypto.randomUUID(), // supabase UUID conversion
          email,
          password: hashedPassword,
          display_name: displayName,
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
          rating: 5.0,
          review_count: 0
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }
      if (data) {
        createdUser = {
          id: data.id,
          email: data.email,
          displayName: data.display_name
        };
      }
    }

    if (!createdUser) {
      // In-Memory Fallback
      const inMemoryUsers = (global as any).inMemoryUsers;
      const alreadyExists = inMemoryUsers.some((u: any) => u.email === email);
      if (alreadyExists) {
        res.status(400).json({ success: false, message: "Email này đã được sử dụng trên Uni-Share!" });
        return;
      }

      const freshUser = {
        id: userId,
        email,
        password: hashedPassword,
        displayName,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
        rating: 5.0,
        reviewCount: 0,
        isStudentVerified: false
      };

      inMemoryUsers.push(freshUser);
      createdUser = {
        id: freshUser.id,
        email: freshUser.email,
        displayName: freshUser.displayName
      };
    }

    res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản Uni-Share thành công!",
      user: createdUser
    });
  } catch (err: any) {
    console.error("Register Error:", err.message);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi đăng ký tài khoản!" });
  }
});

/**
 * -------------------------------------------------------------
 * 2. POST /api/auth/login
 * -------------------------------------------------------------
 */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: "Vui lòng nhập Email và Mật khẩu!" });
    return;
  }

  try {
    let dbUser: any = null;

    if (supabase) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (!error && data) {
        dbUser = {
          id: data.id,
          email: data.email,
          password: data.password,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          universityName: data.university_name,
          universityShortName: data.university_short_name,
          universityCity: data.university_city,
          studentEmail: data.student_email,
          isStudentVerified: data.is_student_verified,
          rating: data.rating ? Number(data.rating) : 5.0,
          reviewCount: data.review_count || 0
        };
      }
    }

    // In-memory fallback authentication
    if (!dbUser) {
      const inMemoryUsers = (global as any).inMemoryUsers;
      const found = inMemoryUsers.find((u: any) => u.email === email);
      if (found) {
        dbUser = found;
      }
    }

    // If still not found and they entered our demo user credentials, seed/use a demo account
    if (!dbUser && email === "hangangbuong0912@gmail.com") {
      const defaultPassHash = await bcrypt.hash("unishare123", 12);
      const isVerifiedDefault = false; // So the user can experience the verification process! This is great!
      const inMemoryUsers = (global as any).inMemoryUsers;
      
      const seedUser = {
        id: "usr_client_default",
        email: "hangangbuong0912@gmail.com",
        password: defaultPassHash,
        displayName: "Sinh viên Nguyễn Thu Hạ",
        avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=HaNguyen",
        rating: 4.9,
        reviewCount: 12,
        isStudentVerified: isVerifiedDefault,
        universityName: "Đại học Mở Hà Nội",
        universityShortName: "HOU",
        universityCity: "Hà Nội",
        studentEmail: ""
      };
      
      inMemoryUsers.push(seedUser);
      dbUser = seedUser;
    }

    if (!dbUser) {
      res.status(401).json({ success: false, message: "Email hoặc mật khẩu không chính xác!" });
      return;
    }

    const match = await bcrypt.compare(password, dbUser.password);
    if (!match) {
      res.status(401).json({ success: false, message: "Email hoặc mật khẩu không chính xác!" });
      return;
    }

    // Generate JWT token (expires in 7 days)
    const token = jwt.sign(
      { id: dbUser.id, email: dbUser.email, displayName: dbUser.displayName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Filter output profile
    const userProfile = {
      id: dbUser.id,
      email: dbUser.email,
      displayName: dbUser.displayName,
      avatarUrl: dbUser.avatarUrl,
      universityName: dbUser.universityName,
      universityShortName: dbUser.universityShortName,
      universityCity: dbUser.universityCity,
      studentEmail: dbUser.studentEmail,
      isStudentVerified: dbUser.isStudentVerified,
      rating: dbUser.rating,
      reviewCount: dbUser.reviewCount
    };

    res.json({
      success: true,
      message: "Đăng nhập thành công!",
      token,
      user: userProfile
    });
  } catch (err: any) {
    console.error("Login Error:", err.message);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi đăng nhập!" });
  }
});

/**
 * -------------------------------------------------------------
 * 3. POST /api/auth/verify-student/send-otp (Protected)
 * -------------------------------------------------------------
 */
router.post(
  "/verify-student/send-otp",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { studentEmail } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" });
      return;
    }

    if (!studentEmail) {
      res.status(400).json({ success: false, message: "Vui lòng nhập Email sinh viên của trường bạn!" });
      return;
    }

    // Detect school
    const detected = detectUniversityFromEmail(studentEmail);
    if (!detected) {
      res.status(400).json({
        success: false,
        message: "Uni-Share không phát hiện thấy định dạng email hợp lệ của trường đại học nào trong hệ thống liên kết của Việt Nam. Vui lòng kiểm tra lại!"
      });
      return;
    }

    if (user.isStudentVerified) {
      res.status(400).json({ success: false, message: "Tài khoản của bạn đã được xác thực sinh viên thành công từ trước!" });
      return;
    }

    // Check rate limit (3 times / email / hr)
    if (isOtpRateLimited(studentEmail)) {
      res.status(429).json({
        success: false,
        message: "Bạn đã yêu cầu gửi mã xác minh quá nhiều lần (tối đa 3 lần/tiếng). Vui lòng thử lại sau ít phút!"
      });
      return;
    }

    try {
      // Create random 6 digits OTP between 100000 and 999999
      const otpCodeInt = crypto.randomInt(100000, 999999);
      const otpCode = String(otpCodeInt);
      const otpHash = await bcrypt.hash(otpCode, 10);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

      if (supabase) {
        // Deactivate previous unused/used OTP entries for transparency
        await supabase
          .from("email_verifications")
          .update({ is_used: true })
          .eq("student_email", studentEmail);

        // Save entry
        const { error } = await supabase.from("email_verifications").insert({
          user_id: user.id,
          student_email: studentEmail,
          otp_code: otpCode, // Plain text saved as verification tag (or bcrypt comparison helper)
          otp_hash: otpHash,
          university_domain: detected.domain,
          expires_at: expiresAt.toISOString(),
          is_used: false,
          attempts: 0
        });

        if (error) {
          throw new Error(error.message);
        }
      }

      // Save in-memory model regardless (supports standalone development perfectly!)
      const verifications = (global as any).inMemoryVerifications;
      // Mark others as expired/used
      verifications.forEach((v: any) => {
        if (v.studentEmail === studentEmail) {
          v.isUsed = true;
        }
      });

      verifications.push({
        id: "otp_" + Date.now(),
        userId: user.id,
        studentEmail,
        otpCode,
        otpHash,
        universityDomain: detected.domain,
        expiresAt,
        isUsed: false,
        attempts: 0
      });

      // Send actual email template
      const emailHTML = generateOTPEmailHTML({
        otp: otpCode,
        studentEmail,
        universityName: detected.name,
        expiresMinutes: 15
      });

      const mailSubject = `[UNI-SHARE] Mã xác thực sinh viên của bạn: ${otpCode}`;
      await sendVerificationEmail(studentEmail, emailHTML, mailSubject, otpCode);

      res.json({
        success: true,
        message: `Mã xác thực 6 chữ số đã được gửi tới email sinh viên ${studentEmail}!`,
        university: {
          name: detected.name,
          shortName: detected.shortName,
          city: detected.city
        },
        expiresIn: 900 // 15 mins in seconds
      });
    } catch (err: any) {
      console.error("Send OTP error:", err);
      res.status(500).json({ success: false, message: "Gặp sự cố lỗi khi gửi OTP xác minh sinh viên!" });
    }
  }
);

/**
 * -------------------------------------------------------------
 * 4. POST /api/auth/verify-student/confirm-otp (Protected)
 * -------------------------------------------------------------
 */
router.post(
  "/verify-student/confirm-otp",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { studentEmail, otp } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" });
      return;
    }

    if (!studentEmail || !otp) {
      res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ Email sinh viên và mã xác nhận OTP!" });
      return;
    }

    const cleanOtp = String(otp).trim();

    try {
      let matchedRecord: any = null;
      let isSupabaseMatched = false;

      // 1. Fetch matching active record from Supabase if active
      if (supabase) {
        const { data: record, error } = await supabase
          .from("email_verifications")
          .select("*")
          .eq("student_email", studentEmail)
          .eq("is_used", false)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1);

        if (!error && record && record.length > 0) {
          matchedRecord = record[0];
          isSupabaseMatched = true;
        }
      }

      // Fallback: check in-memory list
      if (!matchedRecord) {
        const verifications = (global as any).inMemoryVerifications;
        const now = new Date();
        const found = verifications
          .filter(
            (v: any) =>
              v.studentEmail === studentEmail &&
              v.isUsed === false &&
              new Date(v.expiresAt) > now
          )
          .sort((a: any, b: any) => b.createdAt - a.createdAt);

        if (found.length > 0) {
          matchedRecord = found[0];
          isSupabaseMatched = false;
        }
      }

      if (!matchedRecord) {
        res.status(400).json({
          success: false,
          message: "Mã OTP không tồn tại, đã được sử dụng hoặc đã hết hạn 15 phút. Bạn hãy nhấn 'Gửi lại mã' để nhận mã mới!"
        });
        return;
      }

      // Check OTP match
      const isMatch = await bcrypt.compare(cleanOtp, matchedRecord.otp_hash || matchedRecord.otpHash);
      if (!isMatch) {
        // Increment attempts
        const currentAttempts = (matchedRecord.attempts !== undefined ? matchedRecord.attempts : 0) + 1;

        if (currentAttempts >= 3) {
          // Exceeded limit -> delete or invalidate OTP record completely
          if (supabase && isSupabaseMatched) {
            await supabase
              .from("email_verifications")
              .update({ is_used: true })
              .eq("id", matchedRecord.id);
          } else {
            matchedRecord.isUsed = true;
          }

          res.status(400).json({
            success: false,
            code: "OTP_MAX_ATTEMPTS",
            message: "Bạn đã nhập sai OTP quá 3 lần. Vì mục đích bảo mật, mã này đã bị vô hiệu hóa. Vui lòng nhắn 'Gửi lại mã' để nhận OTP mới!"
          });
          return;
        }

        // Save updated attempts
        if (supabase && isSupabaseMatched) {
          await supabase
            .from("email_verifications")
            .update({ attempts: currentAttempts })
            .eq("id", matchedRecord.id);
        } else {
          matchedRecord.attempts = currentAttempts;
        }

        res.status(400).json({
          success: false,
          attemptsLeft: 3 - currentAttempts,
          message: `Mã OTP nhập vào không chính xác! Bạn còn ${3 - currentAttempts} lần nhập lỗi.`
        });
        return;
      }

      // Correct OTP flow!
      const detectedSchool = detectUniversityFromEmail(studentEmail);
      if (!detectedSchool) {
        res.status(400).json({ success: false, message: "Tên miền email sinh viên không hợp lệ!" });
        return;
      }

      // 2. Mark OTP as used
      if (supabase && isSupabaseMatched) {
        await supabase
          .from("email_verifications")
          .update({ is_used: true })
          .eq("id", matchedRecord.id);
      } else {
        matchedRecord.isUsed = true;
      }

      // 3. Update parent User status as student-verified!
      let updatedUserObj: any = null;

      if (supabase) {
        const { data, error } = await supabase
          .from("users")
          .update({
            is_student_verified: true,
            student_email: studentEmail,
            university_name: detectedSchool.name,
            university_short_name: detectedSchool.shortName,
            university_city: detectedSchool.city,
            verified_at: new Date().toISOString()
          })
          .eq("id", user.id)
          .select("*")
          .single();

        if (!error && data) {
          updatedUserObj = {
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
            reviewCount: data.review_count || 0
          };
        }
      }

      // Always update our current in-memory cache/users as well
      const inMemoryUsersList = (global as any).inMemoryUsers;
      const cachedIdx = inMemoryUsersList.findIndex((u: any) => u.id === user.id);
      
      const cachedUpdate = {
        isStudentVerified: true,
        studentEmail: studentEmail,
        universityName: detectedSchool.name,
        universityShortName: detectedSchool.shortName,
        universityCity: detectedSchool.city,
        verifiedAt: new Date().toISOString()
      };

      if (cachedIdx !== -1) {
        inMemoryUsersList[cachedIdx] = {
          ...inMemoryUsersList[cachedIdx],
          ...cachedUpdate
        };
        if (!updatedUserObj) {
          const u = inMemoryUsersList[cachedIdx];
          updatedUserObj = {
            id: u.id,
            email: u.email,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
            universityName: u.universityName,
            universityShortName: u.universityShortName,
            universityCity: u.universityCity,
            studentEmail: u.studentEmail,
            isStudentVerified: u.isStudentVerified,
            rating: u.rating,
            reviewCount: u.reviewCount
          };
        }
      } else {
        // User not in memory (maybe just reloaded), push them
        const defaultUpdateUser = {
          ...user,
          ...cachedUpdate
        };
        inMemoryUsersList.push(defaultUpdateUser);
        if (!updatedUserObj) {
          updatedUserObj = defaultUpdateUser;
        }
      }

      res.json({
        success: true,
        message: "Chúc mừng! Bạn đã xác minh tư cách sinh viên và kích hoạt huy hiệu thành công!",
        user: updatedUserObj
      });
    } catch (err: any) {
      console.error("Confirm OTP error:", err);
      res.status(500).json({ success: false, message: "Sự cố khi xác thực OTP!" });
    }
  }
);

/**
 * -------------------------------------------------------------
 * 5. GET /api/auth/me (Protected)
 * -------------------------------------------------------------
 */
router.get("/me", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    res.json({
      success: true,
      user: req.user
    });
  } else {
    res.status(401).json({ success: false, message: "Bạn chưa đăng nhập!" });
  }
});

/**
 * -------------------------------------------------------------
 * 6. POST /api/auth/logout (Convention helper)
 * -------------------------------------------------------------
 */
router.post("/logout", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Đã xóa phiên làm việc thành công!"
  });
});

export default router;
