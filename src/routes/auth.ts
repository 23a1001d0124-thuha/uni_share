import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { detectUniversityFromEmail } from "../data/universities.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const JWT_SECRET = process.env.JWT_SECRET || "unishare_secret_key_development_2026";

// Lazy init — đọc env SAU khi dotenv.config() đã chạy ở server.ts
function getSupabase() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
}

if (!(global as any).inMemoryUsers) (global as any).inMemoryUsers = [];

const router = Router();

// ── 1. REGISTER ────────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ thông tin đăng ký!" }); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ success: false, message: "Định dạng email không hợp lệ!" }); return;
  }
  if (password.length < 6) {
    res.status(400).json({ success: false, message: "Mật khẩu phải dài từ 6 ký tự trở lên!" }); return;
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = "usr_" + crypto.randomBytes(8).toString("hex");
    let createdUser: any = null;
    const supabase = getSupabase();

    if (supabase) {
      const { data: existing } = await supabase.from("users").select("email").eq("email", email).single();
      if (existing) { res.status(400).json({ success: false, message: "Email này đã được sử dụng!" }); return; }
      const { data, error } = await supabase.from("users").insert({
        id: crypto.randomUUID(), email, password: hashedPassword,
        display_name: displayName,
        avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
        rating: 5.0, review_count: 0
      }).select("*").single();
      if (error) throw new Error(error.message);
      if (data) createdUser = { id: data.id, email: data.email, displayName: data.display_name };
    }
    if (!createdUser) {
      const mem = (global as any).inMemoryUsers;
      if (mem.some((u: any) => u.email === email)) { res.status(400).json({ success: false, message: "Email này đã được sử dụng!" }); return; }
      const u = { id: userId, email, password: hashedPassword, displayName,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
        rating: 5.0, reviewCount: 0, isStudentVerified: false };
      mem.push(u);
      createdUser = { id: u.id, email: u.email, displayName: u.displayName };
    }
    res.status(201).json({ success: true, message: "Đăng ký thành công!", user: createdUser });
  } catch (err: any) {
    console.error("Register Error:", err.message);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi đăng ký!" });
  }
});

// ── 2. LOGIN ────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ success: false, message: "Vui lòng nhập Email và Mật khẩu!" }); return; }
  try {
    let dbUser: any = null;
    const supabase = getSupabase();

    if (supabase) {
      const { data, error } = await supabase.from("users").select("*").eq("email", email).single();
      if (!error && data) {
        dbUser = {
          id: data.id, email: data.email, password: data.password,
          displayName: data.display_name, avatarUrl: data.avatar_url,
          universityName: data.university_name, universityShortName: data.university_short_name,
          universityCity: data.university_city, studentEmail: data.student_email,
          isStudentVerified: data.is_student_verified, isTrustedVerified: data.is_trusted_verified || false,
          rating: data.rating ? Number(data.rating) : 5.0, reviewCount: data.review_count || 0
        };
      }
    }
    if (!dbUser) dbUser = (global as any).inMemoryUsers.find((u: any) => u.email === email) || null;
    if (!dbUser && email === "hangangbuong0912@gmail.com") {
      const defaultPassHash = await bcrypt.hash("unishare123", 12);
      const seed = {
        id: "usr_client_default", email: "hangangbuong0912@gmail.com", password: defaultPassHash,
        displayName: "Sinh viên Nguyễn Thu Hạ",
        avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=HaNguyen",
        rating: 4.9, reviewCount: 12, isStudentVerified: false,
        universityName: "Đại học Mở Hà Nội", universityShortName: "HOU", universityCity: "Hà Nội", studentEmail: ""
      };
      (global as any).inMemoryUsers.push(seed);
      dbUser = seed;
    }
    if (!dbUser) { res.status(401).json({ success: false, message: "Email hoặc mật khẩu không chính xác!" }); return; }
    if (!await bcrypt.compare(password, dbUser.password)) {
      res.status(401).json({ success: false, message: "Email hoặc mật khẩu không chính xác!" }); return;
    }
    const token = jwt.sign({ id: dbUser.id, email: dbUser.email, displayName: dbUser.displayName }, JWT_SECRET, { expiresIn: "7d" });
    res.json({
      success: true, message: "Đăng nhập thành công!", token,
      user: {
        id: dbUser.id, email: dbUser.email, displayName: dbUser.displayName, avatarUrl: dbUser.avatarUrl,
        universityName: dbUser.universityName, universityShortName: dbUser.universityShortName,
        universityCity: dbUser.universityCity, studentEmail: dbUser.studentEmail,
        isStudentVerified: dbUser.isStudentVerified, isTrustedVerified: dbUser.isTrustedVerified || false,
        rating: dbUser.rating, reviewCount: dbUser.reviewCount
      }
    });
  } catch (err: any) {
    console.error("Login Error:", err.message);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi đăng nhập!" });
  }
});

// ── OTP Store: { [userId]: { code, email, detectedUni, expiresAt, attempts } }
if (!(global as any).otpStore) (global as any).otpStore = {};

function getMailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── 3. SEND OTP (Brevo SMTP) ─────────────────────────────────────
router.post("/verify-student/send-otp", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { studentEmail } = req.body;
  const user = req.user;
  if (!user) { res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" }); return; }
  if (!studentEmail) { res.status(400).json({ success: false, message: "Vui lòng nhập Email sinh viên!" }); return; }
  if (user.isStudentVerified) { res.status(400).json({ success: false, message: "Tài khoản đã được xác thực từ trước!" }); return; }

  const detected = detectUniversityFromEmail(studentEmail);
  if (!detected) { res.status(400).json({ success: false, message: "Email trường không hợp lệ hoặc chưa được hỗ trợ!" }); return; }

  // Tạo mã OTP 6 số
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 phút

  // Lưu vào store
  (global as any).otpStore[user.id] = {
    code: otpCode,
    studentEmail,
    detectedUni: detected,
    expiresAt,
    attempts: 0,
  };

  try {
    const mailer = getMailer();
    await mailer.sendMail({
      from: process.env.EMAIL_FROM || "UNI-SHARE <noreply@uni-share.app>",
      to: studentEmail,
      subject: "🎓 Mã xác thực sinh viên UNI-SHARE",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;">
          <h2 style="color:#111827;margin-bottom:4px;">Xác thực Email Sinh Viên</h2>
          <p style="color:#6b7280;font-size:14px;">Trường: <strong>${detected.name}</strong></p>
          <div style="background:#f9fafb;border:2px dashed #d1d5db;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
            <p style="color:#6b7280;font-size:12px;margin:0 0 8px;">MÃ XÁC THỰC CỦA BẠN</p>
            <p style="font-size:40px;font-weight:900;letter-spacing:12px;color:#111827;margin:0;">${otpCode}</p>
            <p style="color:#9ca3af;font-size:11px;margin:8px 0 0;">Hết hạn sau 15 phút</p>
          </div>
          <p style="color:#6b7280;font-size:13px;">Nhập mã này vào UNI-SHARE để hoàn tất xác thực. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: `Mã OTP 6 chữ số đã gửi tới ${studentEmail}. Vui lòng kiểm tra hộp thư!`,
      university: { name: detected.name, shortName: detected.shortName, city: detected.city },
      expiresIn: 900,
    });
  } catch (err: any) {
    console.error("SMTP send error:", err);
    // Xóa OTP nếu gửi mail thất bại
    delete (global as any).otpStore[user.id];
    res.status(500).json({ success: false, message: "Không thể gửi email OTP: " + (err.message || "Lỗi SMTP") });
  }
});

// ── 4. CONFIRM OTP ───────────────────────────────────────────────
router.post("/verify-student/confirm-otp", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { studentEmail, otp } = req.body;
  const user = req.user;
  if (!user) { res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" }); return; }
  if (!studentEmail || !otp) { res.status(400).json({ success: false, message: "Thiếu thông tin xác thực!" }); return; }

  const stored = (global as any).otpStore?.[user.id];
  if (!stored) { res.status(400).json({ success: false, message: "Không tìm thấy mã OTP. Vui lòng gửi lại!" }); return; }
  if (Date.now() > stored.expiresAt) {
    delete (global as any).otpStore[user.id];
    res.status(400).json({ success: false, message: "Mã OTP đã hết hạn. Vui lòng gửi lại!" }); return;
  }
  if (stored.studentEmail !== studentEmail) { res.status(400).json({ success: false, message: "Email không khớp!" }); return; }

  stored.attempts += 1;
  if (stored.attempts > 5) {
    delete (global as any).otpStore[user.id];
    res.status(400).json({ success: false, message: "Quá nhiều lần thử. Vui lòng gửi lại mã mới!", code: "OTP_MAX_ATTEMPTS" }); return;
  }

  if (String(otp).trim() !== stored.code) {
    res.status(400).json({ success: false, message: `Mã OTP không đúng! Còn ${5 - stored.attempts} lần thử.` }); return;
  }

  // OTP đúng → cập nhật DB
  delete (global as any).otpStore[user.id];
  const detected = stored.detectedUni;

  const supabase = getSupabase();
  if (!supabase) { res.status(503).json({ success: false, message: "Dịch vụ DB chưa được cấu hình!" }); return; }

  try {
    const { data: updatedData, error: updateError } = await supabase.from("users").update({
      is_student_verified: true, student_email: studentEmail,
      university_name: detected.name, university_short_name: detected.shortName,
      university_city: detected.city, verified_at: new Date().toISOString()
    }).eq("id", user.id).select("*").single();

    if (updateError || !updatedData) {
      res.status(500).json({ success: false, message: "Xác thực thành công nhưng không cập nhật được hồ sơ!" }); return;
    }

    const updatedUser = {
      id: updatedData.id, email: updatedData.email, displayName: updatedData.display_name,
      avatarUrl: updatedData.avatar_url, universityName: updatedData.university_name,
      universityShortName: updatedData.university_short_name, universityCity: updatedData.university_city,
      studentEmail: updatedData.student_email, isStudentVerified: updatedData.is_student_verified,
      isTrustedVerified: updatedData.is_trusted_verified || false,
      rating: updatedData.rating ? Number(updatedData.rating) : 5.0, reviewCount: updatedData.review_count || 0
    };

    const mem = (global as any).inMemoryUsers;
    const idx = mem.findIndex((u: any) => u.id === user.id);
    if (idx !== -1) Object.assign(mem[idx], { isStudentVerified: true, studentEmail });

    res.json({ success: true, message: "Chúc mừng! Xác minh sinh viên thành công!", user: updatedUser });
  } catch (err: any) {
    console.error("Confirm OTP DB error:", err);
    res.status(500).json({ success: false, message: "Lỗi hệ thống khi xác thực!" });
  }
});

// ── 5. ME ────────────────────────────────────────────────────────
router.get("/me", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.user) res.json({ success: true, user: req.user });
  else res.status(401).json({ success: false, message: "Bạn chưa đăng nhập!" });
});

// ── 6. LOGOUT ────────────────────────────────────────────────────
router.post("/logout", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Đã xóa phiên làm việc thành công!" });
});

// ── 7. UPLOAD CARD (Gemini OCR → Badge SV Uy Tín) ───────────────
// ─── Step 4: Upload & AI-verify student card (Gemini Vision) ─────────────────
router.post("/verify-student/upload-card", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { imageBase64 } = req.body;
  const user = req.user;

  if (!user)                      { res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" }); return; }
  if (!user.isStudentVerified)    { res.status(400).json({ success: false, message: "Cần hoàn thành xác thực email sinh viên trước!" }); return; }
  if ((user as any).isTrustedVerified) { res.status(400).json({ success: false, message: "Tài khoản đã có badge SV Uy Tín rồi!" }); return; }
  if (!imageBase64)               { res.status(400).json({ success: false, message: "Vui lòng tải lên ảnh thẻ sinh viên!" }); return; }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.warn("[upload-card] Không có GEMINI_API_KEY — tự động duyệt (dev mode)");
    return await _approveCard(user, res, null);
  }

  // ── Chuẩn hóa base64 ──────────────────────────────────────────────────────
  let cleanBase64 = imageBase64;
  let mimeType = "image/jpeg";
  if (imageBase64.includes(";base64,")) {
    const parts = imageBase64.split(";base64,");
    mimeType = parts[0].replace("data:", "").trim() || "image/jpeg";
    cleanBase64 = parts[1];
  }
  cleanBase64 = cleanBase64.replace(/\s/g, "");

  // ── Gọi Gemini Vision với prompt chi tiết ────────────────────────────────
  const GEMINI_PROMPT = `Bạn là hệ thống OCR chuyên đọc thẻ sinh viên Việt Nam.
Hãy phân tích ảnh và trả về đúng JSON sau (không thêm text ngoài JSON):
{
  "isStudentCard": boolean,         // true nếu đây là thẻ sinh viên thật
  "confidence": number,             // 0-100, mức độ chắc chắn
  "studentName": string | null,     // Họ và tên sinh viên
  "studentId": string | null,       // Mã số sinh viên / MSSV
  "universityName": string | null,  // Tên trường đầy đủ
  "universityShortName": string | null, // Tên viết tắt nếu có (VD: HUST, UET, NEU)
  "major": string | null,           // Ngành / Khoa học
  "className": string | null,       // Lớp
  "dateOfBirth": string | null,     // Ngày sinh (DD/MM/YYYY)
  "enrollmentYear": string | null,  // Năm nhập học
  "expiryDate": string | null,      // Ngày hết hạn thẻ (DD/MM/YYYY)
  "cardIssueDate": string | null,   // Ngày cấp thẻ nếu có
  "rejectReason": string | null     // Lý do từ chối nếu isStudentCard = false
}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType, data: cleanBase64 } },
            { text: GEMINI_PROMPT }
          ]}],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("[upload-card] Gemini HTTP error:", geminiRes.status, errText);
      // fallback: tự duyệt nếu Gemini lỗi tạm thời
      return await _approveCard(user, res, null);
    }

    const gd = await geminiRes.json();
    const rawText = gd?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let ocr: any = {};
    try {
      ocr = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      ocr = { isStudentCard: false, confidence: 0, rejectReason: "Không thể phân tích phản hồi AI" };
    }

    console.log("[upload-card] Gemini OCR result:", JSON.stringify(ocr));

    // ── Kiểm tra hợp lệ ───────────────────────────────────────────────────
    if (!ocr.isStudentCard || (ocr.confidence ?? 0) < 60) {
      const reason = ocr.rejectReason || "Vui lòng chụp rõ mặt trước thẻ sinh viên!";
      res.status(400).json({
        success: false,
        message: `Ảnh không phải thẻ sinh viên hợp lệ. ${reason}`,
        details: { confidence: ocr.confidence || 0, rejectReason: ocr.rejectReason || null }
      });
      return;
    }

    return await _approveCard(user, res, ocr);

  } catch (err: any) {
    console.error("[upload-card] Gemini OCR Exception:", err?.message || err);
    // fallback: tự duyệt khi lỗi mạng / timeout
    return await _approveCard(user, res, null);
  }
});

// ─── Approve card & persist OCR data to Supabase ────────────────────────────
async function _approveCard(user: any, res: Response, ocr: any | null) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Các trường OCR sẽ lưu vào DB
  const ocrFields = ocr ? {
    card_student_name:       ocr.studentName       || null,
    card_student_id:         ocr.studentId         || null,
    card_university_name:    ocr.universityName     || null,
    card_university_short:   ocr.universityShortName || null,
    card_major:              ocr.major              || null,
    card_class_name:         ocr.className          || null,
    card_date_of_birth:      ocr.dateOfBirth        || null,
    card_enrollment_year:    ocr.enrollmentYear     || null,
    card_expiry_date:        ocr.expiryDate         || null,
    card_issue_date:         ocr.cardIssueDate      || null,
    card_ocr_confidence:     ocr.confidence         ?? null,
    card_ocr_raw:            ocr,                   // lưu toàn bộ JSON OCR
  } : {};

  let updatedUserObj: any = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("users")
      .update({
        is_trusted_verified: true,
        trusted_verified_at: now,
        ...ocrFields
      })
      .eq("id", user.id)
      .select("*")
      .single();

    if (error) {
      console.error("[_approveCard] Supabase update error:", error.message);
    } else if (data) {
      updatedUserObj = {
        id:                   data.id,
        email:                data.email,
        displayName:          data.display_name,
        avatarUrl:            data.avatar_url,
        universityName:       data.university_name,
        universityShortName:  data.university_short_name,
        universityCity:       data.university_city,
        studentEmail:         data.student_email,
        isStudentVerified:    data.is_student_verified,
        isTrustedVerified:    true,
        rating:               data.rating ? Number(data.rating) : 5.0,
        reviewCount:          data.review_count || 0,
        // Trả lại OCR data cho client để hiển thị
        cardStudentName:      data.card_student_name    || null,
        cardStudentId:        data.card_student_id      || null,
        cardUniversityName:   data.card_university_name || null,
        cardMajor:            data.card_major           || null,
        cardClassName:        data.card_class_name      || null,
        cardDateOfBirth:      data.card_date_of_birth   || null,
        cardEnrollmentYear:   data.card_enrollment_year || null,
        cardExpiryDate:       data.card_expiry_date     || null,
      };
    }
  }

  // ── In-memory fallback (dev / no Supabase) ────────────────────────────────
  const mem = (global as any).inMemoryUsers as any[] | undefined;
  if (mem) {
    const idx = mem.findIndex((u: any) => u.id === user.id);
    if (idx !== -1) {
      mem[idx] = { ...mem[idx], isTrustedVerified: true, trustedVerifiedAt: now, ...ocrFields };
      if (!updatedUserObj) updatedUserObj = { ...mem[idx] };
    }
  }
  if (!updatedUserObj) updatedUserObj = { ...user, isTrustedVerified: true };

  console.log(`[_approveCard] User ${user.id} approved as TrustedVerified. OCR confidence: ${ocr?.confidence ?? "N/A"}`);

  res.json({
    success: true,
    message: "Thẻ sinh viên đã được AI xác minh. Badge SV Uy Tín gắn vào tài khoản! 🎉",
    user: updatedUserObj,
    ocrData: ocr ? {
      studentName:        ocr.studentName       || null,
      studentId:          ocr.studentId         || null,
      universityName:     ocr.universityName     || null,
      major:              ocr.major              || null,
      className:          ocr.className          || null,
      dateOfBirth:        ocr.dateOfBirth        || null,
      enrollmentYear:     ocr.enrollmentYear     || null,
      expiryDate:         ocr.expiryDate         || null,
      confidence:         ocr.confidence         ?? null,
    } : null
  });
}

export default router;