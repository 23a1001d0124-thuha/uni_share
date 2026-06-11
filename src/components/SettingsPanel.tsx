import React, { useState } from "react";
import {
  User,
  Bell,
  Check,
  CreditCard,
  Lock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  LogOut,
  Mail,
  Key,
  GraduationCap,
} from "lucide-react";
import { UserProfile } from "../types";
import { VIETNAMESE_UNIVERSITIES } from "../data";
import { useAuth } from "./auth/AuthContext";
import StudentBadge from "./auth/StudentBadge";

interface SettingsPanelProps {
  profile: UserProfile | null;
  isStudentVerified: boolean | undefined;
  onVerifyStudentToggle: (school: string, mssv: string) => void;
  onTogglePaymentLinked: () => void;
  onToggleNotifications: () => void;
}

export default function SettingsPanel({
  profile,
  isStudentVerified,
  onVerifyStudentToggle,
  onTogglePaymentLinked,
  onToggleNotifications,
}: SettingsPanelProps) {
  const { user, login, register, logout } = useAuth();

  // Auth Form Toggles: "login" or "register"
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Register Form States
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regMessage, setRegMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const [isRegLoading, setIsRegLoading] = useState(false);

  // Settings Fields
  const [typedMssv, setTypedMssv] = useState(
    profile?.studentId || "HOU-K28-9921",
  );
  const [selectedSchool, setSelectedSchool] = useState(
    profile?.school || "Đại học Mở Hà Nội",
  );
  const [typedName, setTypedName] = useState(profile?.name || "Nguyễn Thu Hạ");

  const [verifySuccess, setVerifySuccess] = useState(false);

  const handleVerifyAction = () => {
    onVerifyStudentToggle(selectedSchool, typedMssv);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginMessage({
        text: "Vui lòng nhập Email và Mật khẩu!",
        isError: true,
      });
      return;
    }

    setIsLoginLoading(true);
    setLoginMessage(null);

    const result = await login(loginEmail, loginPassword);
    setIsLoginLoading(false);

    if (result.success) {
      setLoginMessage({ text: result.message, isError: false });
    } else {
      setLoginMessage({ text: result.message, isError: true });
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setRegMessage({
        text: "Vui lòng điền đầy đủ thông tin đăng ký!",
        isError: true,
      });
      return;
    }

    setIsRegLoading(true);
    setRegMessage(null);

    const result = await register(regEmail, regPassword, regName);
    setIsRegLoading(false);

    if (result.success) {
      setRegMessage({
        text: "Đăng ký thành công! Hãy chuyển qua tab 'Đăng nhập' để tiếp tục.",
        isError: false,
      });
      // Reset registration states
      setRegName("");
      setRegEmail("");
      setRegPassword("");
    } else {
      setRegMessage({ text: result.message, isError: true });
    }
  };

  // Seed default credential parameters helper
  const handleAutoFillDemoDetails = () => {
    setLoginEmail("hangangbuong0912@gmail.com");
    setLoginPassword("unishare123");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" id="settings-panel">
      {/* 0. AUTHENTICATION & SESSION SECTION (CRITICAL) */}
      {!user ? (
        <div className="bg-white border-2 border-dashed border-stone-250 rounded-3xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 bg-rose-50 rounded-bl-2xl text-[10px] text-rose-600 font-bold tracking-wide select-none uppercase">
            CẦN ĐĂNG NHẬP
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-xl">
              <Lock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="font-display font-black text-xs text-stone-900 uppercase">
                Hệ Thống Thành Viên UNI-SHARE
              </h4>
              <p className="text-[10px] text-stone-400 font-sans">
                ĐĂNG NHẬP HOẶC TẠO TÀI KHOẢN ĐỂ GIAO DỊCH SINH VIÊN
              </p>
            </div>
          </div>

          {/* Form Tabs */}
          <div className="flex border-b border-stone-250 mb-5 text-xs text-stone-500 font-semibold">
            <button
              onClick={() => setAuthTab("login")}
              className={`cursor-pointer pb-2.5 px-4 filter duration-150 relative ${
                authTab === "login"
                  ? "text-rose-650 font-black border-b-2 border-rose-600"
                  : "hover:text-stone-800"
              }`}
            >
              Phần Đăng Nhập
            </button>
            <button
              onClick={() => setAuthTab("register")}
              className={`cursor-pointer pb-2.5 px-4 filter duration-150 relative ${
                authTab === "register"
                  ? "text-rose-650 font-black border-b-2 border-rose-600"
                  : "hover:text-stone-800"
              }`}
            >
              Phần Đăng Ký Tài Khoản
            </button>
          </div>

          {/* Tab contents */}
          {authTab === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-850">
                <div className="flex gap-2 items-start text-[11px] leading-normal font-sans">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Dùng tài khoản demo thử nghiệm:</strong> <br />•
                    Email:{" "}
                    <span className="font-bold underline">
                      hangangbuong0912@gmail.com
                    </span>
                    <br />• Mật khẩu:{" "}
                    <span className="font-bold underline">unishare123</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillDemoDetails}
                  className="cursor-pointer px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] shadow-xs shrink-0"
                >
                  Tự động điền nhanh
                </button>
              </div>

              {loginMessage && (
                <div
                  className={`p-3 rounded-2xl text-[11px] font-medium ${
                    loginMessage.isError
                      ? "bg-rose-50 border border-rose-200 text-rose-700"
                      : "bg-emerald-50 border border-emerald-250 text-emerald-700"
                  }`}
                >
                  {loginMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-600 block">
                    Địa chỉ hòm thư Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type="email"
                      required
                      placeholder="ten@gmail.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-250 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-605 block">
                    Mật khẩu tài khoản
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      type="password"
                      required
                      placeholder="Mật khẩu bảo vệ..."
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-250 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoginLoading}
                className="cursor-pointer w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-2xl transition shadow-xs flex items-center justify-center gap-1.5"
              >
                {isLoginLoading
                  ? "Đang tiến hành đăng nhập..."
                  : "🚀 Xác nhận đăng nhập"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regMessage && (
                <div
                  className={`p-3 rounded-2xl text-[11px] font-medium ${
                    regMessage.isError
                      ? "bg-rose-50 border border-rose-200 text-rose-700"
                      : "bg-emerald-50 border border-emerald-250 text-emerald-700"
                  }`}
                >
                  {regMessage.text}
                </div>
              )}

              <div className="space-y-1.5 text-xs font-sans">
                <label className="font-bold text-stone-600 block">
                  Họ và tên hoặc Biệt hiệu
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A..."
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-250 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-600 block">
                    Địa chỉ hòm thư Email Đăng ký
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="example@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-250 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-605 block">
                    Đặt Mật khẩu bảo mật
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mật khẩu bảo mật >= 6 kí tự..."
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-250 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isRegLoading}
                className="cursor-pointer w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl transition shadow-xs flex items-center justify-center gap-1.5"
              >
                {isRegLoading
                  ? "Đang xử lý đăng ký..."
                  : "✓ Đăng ký Tài khoản Học viên"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 border border-stone-850 rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <img
              src={
                user.avatarUrl ||
                "https://api.dicebear.com/7.x/adventurer/svg?seed=UniShareUser"
              }
              alt="User Avatar"
              referrerPolicy="no-referrer"
              className="w-14 h-14 bg-stone-700 rounded-2xl border-2 border-white/20 object-cover shadow-sm"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-display font-black text-sm">
                  {user.displayName}
                </h4>
                <StudentBadge
                  isVerified={user.isStudentVerified}
                  universityShortName={user.universityShortName}
                />
              </div>
              <p className="text-[11px] font-mono text-stone-300 select-all break-all">
                {user.email}
              </p>

              <div className="flex items-center gap-1 text-[10px] text-stone-400">
                <span>
                  ⭐ Uy tín người dùng:{" "}
                  <strong className="text-amber-400 font-semibold">
                    {user.rating.toFixed(1)}
                  </strong>{" "}
                  ({user.reviewCount} lượt đánh giá)
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="cursor-pointer px-4 py-2.5 bg-white/10 hover:bg-white/20 transition rounded-xl text-xs font-bold text-rose-300 flex items-center gap-1.5 shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}

      {/* 1. PROFILE INFORMATION CARD */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-stone-900 text-sm border-b pb-2 tracking-wide font-display flex items-center gap-1.5 uppercase select-none">
          <User className="w-4 h-4 text-stone-500" />
          Hồ Sơ Bản Chi Tiết
        </h3>

        <div className="space-y-3.5 text-xs font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-stone-605 block">
                Họ và tên của bạn
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-rose-300 transition-colors rounded-xl font-medium outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-605 block">
                Trường Đại học liên kết
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 focus:bg-white rounded-xl font-medium"
              >
                {VIETNAMESE_UNIVERSITIES.map((uni) => (
                  <option key={uni} value={uni}>
                    {uni}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CORE FEATURE STUDENT IDENTITY VERIFICATION FORM */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 relative overflow-hidden">
        <h3 className="font-bold text-stone-900 text-sm border-b pb-2 tracking-wide font-display flex items-center gap-1.5 uppercase select-none">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
          Xác Thực Huy Hiệu Sinh Viên
        </h3>

        {isStudentVerified ? (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-850 font-bold text-sm bg-white/40 p-2 rounded-xl">
              <Check className="w-5 h-5 text-emerald-750 bg-emerald-200 rounded-full p-0.5 shrink-0 stroke-[2.5]" />
              Bạn đã được hệ thống UNI-SHARE xác thực danh tính chính thức!
            </div>
            <p className="text-emerald-950 leading-relaxed font-sans font-medium">
              Tài khoản hiện sở hữu huy hiệu xanh lá{" "}
              <strong className="text-emerald-700">
                Sinh Viên Đã Xác Thực
              </strong>
              . Huy hiệu này đính kèm ngay cạnh hồ sơ đại diện giúp gia tăng
              tuyệt đối sự tin tưởng giao dịch trong ký túc xá!
            </p>
            <div className="text-[10px] text-emerald-700 font-mono bg-white/40 p-2 rounded-lg leading-relaxed">
              • CƠ QUAN LIÊN KẾT: {user?.universityName || profile?.school}{" "}
              <br />• THƯ ĐIỆN TỬ VIP:{" "}
              {user?.studentEmail || "Chính quy tích hợp qua Email OTP"} <br />•
              ĐĂNG KÍ LÚC:{" "}
              {user
                ? "Hệ thống xác thực từ xa thành công"
                : "Mô phỏng dữ liệu local"}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200/50 p-3.5 rounded-xl text-xs text-amber-800 flex gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="font-medium leading-relaxed font-sans">
                UNI-SHARE hiện cung cấp dịch vụ{" "}
                <strong>Xác thực bằng Email Trường đại học Việt Nam</strong> để
                đảm bảo tuyệt đối an ninh kết nối, ngăn ngừa lừa đảo nội khu ký
                túc xá.
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="text-xs">
                <p className="font-bold text-stone-850 flex items-center gap-1">
                  <GraduationCap className="w-4.5 h-4.5 text-blue-600" />
                  Bạn đã sẵn sàng nâng cấp tích xanh chính thức?
                </p>
                <p className="text-stone-500 mt-0.5">
                  Yêu cầu đăng nhập trước khi gửi lệnh nhận mã OTP học sinh.
                </p>
              </div>
              <button
                type="button"
                onClick={handleVerifyAction}
                disabled={!user}
                className={`py-2.5 px-5 text-xs font-black rounded-xl duration-150 transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm ${
                  user
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300 shadow-none"
                }`}
              >
                <span>Xác thực ngay qua Email</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            {!user && (
              <p className="text-[10px] text-rose-500 font-bold text-center italic animate-pulse">
                * Chú ý: Bạn hãy đăng nhập tài khoản một phút ở trên để bấm được
                nút kích hoạt này nhé!
              </p>
            )}

            {verifySuccess && (
              <p className="text-xs text-emerald-600 font-bold animate-pulse">
                ✓ Hệ thống xác thực bằng email sinh viên hoàn tất thành công!
              </p>
            )}
          </div>
        )}
      </div>

      {/* 3. NOTIFICATION PREFERENCES TOGGLE */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-stone-900 text-sm border-b pb-2 tracking-wide font-display flex items-center gap-1.5 uppercase select-none">
          <Bell className="w-4 h-4 text-stone-500" />
          Nhận Thông báo Hoạt Động
        </h3>

        <div className="flex justify-between items-center text-xs font-sans">
          <div>
            <span className="font-bold text-stone-800 block">
              Thông báo cập nhật tin nhắn & đơn hàng
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              Nhận thông báo tự động lúc rà soát tin trùng khớp, so tinder,
              trạng thái bán hàng thay đổi.
            </span>
          </div>

          <button
            onClick={onToggleNotifications}
            className={`cursor-pointer p-1.5 rounded-full w-12 transition-colors duration-250 relative flex items-center ${
              profile?.notificationsEnabled ? "bg-rose-600" : "bg-stone-200"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-white transition duration-200 transform ${
                profile?.notificationsEnabled
                  ? "translate-x-5"
                  : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
