import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  GraduationCap,
  Mail,
  ShieldCheck,
  Loader2,
  Timer,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Upload,
  Camera,
  Star,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import confetti from "canvas-confetti";

interface VerifyStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerifyStudentModal: React.FC<VerifyStudentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { token, updateUserDirectly, refreshUser } = useAuth();

  // Steps: 1 - Input Email, 2 - Input OTP, 3 - Success
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [studentEmail, setStudentEmail] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedUni, setDetectedUni] = useState<{
    name: string;
    shortName: string;
    city: string;
  } | null>(null);
  const [detectSug, setDetectSug] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Input States
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 4: Upload thẻ SV states
  const [cardImageBase64, setCardImageBase64] = useState<string | null>(null);
  const [cardImagePreview, setCardImagePreview] = useState<string | null>(null);
  const [isUploadingCard, setIsUploadingCard] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Timer States
  const [expiryTimeLeft, setExpiryTimeLeft] = useState(900); // 15 mins (in seconds)
  const [resendCooldown, setResendCooldown] = useState(60); // 60s resend lock

  // Reset when modal states change
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setStudentEmail("");
      setDetectedUni(null);
      setDetectSug(null);
      setErrorMessage(null);
      setOtp(Array(6).fill(""));
      setCardImageBase64(null);
      setCardImagePreview(null);
      setCardError(null);
    }
  }, [isOpen]);

  // Real-time University detection
  useEffect(() => {
    if (!studentEmail) {
      setDetectedUni(null);
      setDetectSug(null);
      return;
    }

    const emailParts = studentEmail.split("@");
    if (emailParts.length < 2 || !emailParts[1].includes(".")) {
      setDetectedUni(null);
      setDetectSug(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsDetecting(true);
      try {
        const response = await fetch(
          `/api/universities/detect?email=${encodeURIComponent(studentEmail)}`,
        );
        const data = await response.json();

        if (data.success && data.found) {
          setDetectedUni(data.university);
          setDetectSug(null);
        } else {
          setDetectedUni(null);
          setDetectSug(
            data.suggestion || "Tên miền email này chưa được liên kết.",
          );
        }
      } catch (err) {
        console.error("Error detecting university:", err);
      } finally {
        setIsDetecting(false);
      }
    }, 450); // Debounce detection hits by 450ms

    return () => clearTimeout(delayDebounceFn);
  }, [studentEmail]);

  // Countdown timers for Step 2
  useEffect(() => {
    if (step !== 2) return;

    const timer = setInterval(() => {
      setExpiryTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step !== 2 || resendCooldown === 0) return;

    const cooldownTimer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(cooldownTimer);
  }, [step, resendCooldown]);

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail || !detectedUni) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/verify-student/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("unishare_token")}`,
        },
        body: JSON.stringify({ studentEmail }),
      });
      const data = await response.json();

      if (data.success) {
        setStep(2);
        setOtp(Array(6).fill(""));
        setExpiryTimeLeft(data.expiresIn || 900);
        setResendCooldown(60);
      } else {
        setErrorMessage(
          data.message || "Không thể gửi mã xác nhận. Hãy thử lại!",
        );
      }
    } catch (err) {
      console.error("Send OTP Error:", err);
      setErrorMessage("Không thể kết nối đến máy chủ xác minh!");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Verify OTP Confirm
  const handleConfirmOtp = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setErrorMessage("Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số!");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/verify-student/confirm-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("unishare_token")}`,
        },
        body: JSON.stringify({ studentEmail, otp: otpValue }),
      });
      const data = await response.json();

      if (data.success && data.user) {
        // Upgrade layout profile globally in auth provider
        updateUserDirectly(data.user);

        // Advance to step 3 success
        setStep(3);

        // Trigger celebratory confetti animations
        triggerSuccessConfetti();
      } else {
        if (data.code === "OTP_MAX_ATTEMPTS") {
          // If max attempts reached, reset back to step 1
          setErrorMessage(data.message);
          setTimeout(() => {
            setStep(1);
            setOtp(Array(6).fill(""));
          }, 3500);
        } else {
          setErrorMessage(data.message || "Xác thực mã OTP không thành công.");
        }
      }
    } catch (err) {
      console.error("Confirm OTP Error:", err);
      setErrorMessage("Không thể kết nối máy chủ để xác thực!");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSuccessConfetti = () => {
    const duration = 2.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 25,
      spread: 360,
      ticks: 50,
      zIndex: 10000,
    };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 45 * (timeLeft / duration);

      // confetti showers from corners
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  // Step 4: Handle image file select
  const handleCardImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setCardError("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCardImageBase64(base64);
      setCardImagePreview(base64);
      setCardError(null);
    };
    reader.readAsDataURL(file);
  };

  // Step 4: Submit card to API
  const handleSubmitCard = async () => {
    if (!cardImageBase64) {
      setCardError("Vui lòng chọn ảnh thẻ sinh viên trước!");
      return;
    }
    setIsUploadingCard(true);
    setCardError(null);
    try {
      const response = await fetch("/api/auth/verify-student/upload-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("unishare_token")}`,
        },
        body: JSON.stringify({ imageBase64: cardImageBase64 }),
      });
      const data = await response.json();
      if (data.success && data.user) {
        updateUserDirectly(data.user);
        setStep(5 as any);
        triggerSuccessConfetti();
      } else {
        setCardError(
          data.message || "Không thể xác thực thẻ. Vui lòng thử ảnh khác!",
        );
      }
    } catch (err) {
      setCardError("Không thể kết nối máy chủ. Vui lòng thử lại!");
    } finally {
      setIsUploadingCard(false);
    }
  };

  // OTP Inputs handling: Auto focus shifts & copy-paste maps
  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "");
    if (!cleanVal) {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      return;
    }

    const latestChar = cleanVal[cleanVal.length - 1];
    const newOtp = [...otp];
    newOtp[index] = latestChar;
    setOtp(newOtp);

    // Auto focus next box
    if (index < 5 && latestChar) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData
      .getData("text")
      .trim()
      .replace(/[^0-9]/g, "");
    if (text.length >= 6) {
      const chars = text.slice(0, 6).split("");
      setOtp(chars);
      inputRefs.current[5]?.focus();
    }
  };

  // Format Helper
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 top-0 left-0 w-full h-full bg-stone-950/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden flex flex-col relative max-h-[90vh]">
        {/* Header decoration */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <GraduationCap className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-black text-stone-900 text-sm">
                Xác Thực Sinh Viên
              </h3>
              <p className="text-[10px] text-stone-500 font-sans tracking-wide">
                CHỨNG MINH DANH TÍNH • KẾT NỐI AN TOÀN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Step Content */}
        <div className="p-6 overflow-y-auto w-full flex-1">
          <AnimatePresence mode="wait">
            {/* STEP 1: Enter Email & Detect school */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-5"
              >
                <div className="text-center max-w-xs mx-auto">
                  <p className="text-stone-600 font-sans text-xs leading-relaxed">
                    Đăng ký bằng email trường học đại học được liên kết của bạn.
                    Hệ thống sẽ cấp huy hiệu{" "}
                    <strong className="text-emerald-600">
                      Xác thực uy tín
                    </strong>{" "}
                    giúp tạo thiện cảm 5 sao khi mua bán!
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-[11px] font-medium flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 block">
                      Địa chỉ Email sinh viên
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4.5 h-4.5" />
                      <input
                        type="email"
                        required
                        placeholder="abc123@st.ftu.edu.vn, em@hou.edu.vn..."
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        className="w-full bg-stone-50 hover:bg-stone-100/50 focus:bg-white text-xs border border-stone-200 hover:border-stone-300 focus:border-blue-500 rounded-2xl py-3 pl-10 pr-4 transition duration-150 focus:outline-hidden font-sans text-stone-800"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Realtime detection display indicator */}
                  <div className="min-h-[70px] bg-stone-50/50 border border-stone-100 rounded-2xl p-3.5 flex flex-col justify-center">
                    {isDetecting ? (
                      <div className="flex items-center gap-2 text-stone-400 text-xs justify-center italic">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span>Đang phân tích tên miền trường...</span>
                      </div>
                    ) : detectedUni ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-start gap-2.5 text-blue-800"
                      >
                        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 fill-blue-50" />
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
                            Đã nhận diện thành công trường học
                          </p>
                          <p className="text-xs font-bold text-stone-800 mt-0.5">
                            {detectedUni.name} ({detectedUni.shortName})
                          </p>
                          <p className="text-[10px] text-stone-500 font-medium">
                            Khu vực kiểm nghiệm: {detectedUni.city}
                          </p>
                        </div>
                      </motion.div>
                    ) : detectSug ? (
                      <div className="flex items-start gap-2 text-stone-600">
                        <HelpCircle className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed text-stone-500">
                          {detectSug}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center text-stone-400 text-[11px] italic">
                        Hãy nhập đúng email định dạng hòm thư học sinh, sinh
                        viên do trường đại học của bạn cung cấp.
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!detectedUni || isLoading}
                    className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition duration-150 cursor-pointer ${
                      detectedUni && !isLoading
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang gửi mã OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Gửi mã xác thực OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 2: Input 6-Digit OTP */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-5"
              >
                <div className="text-center max-w-xs mx-auto">
                  <p className="text-xs text-stone-500">
                    Mã xác minh SV vừa gửi đến
                  </p>
                  <p className="text-xs font-bold text-stone-800 font-sans mt-0.5 break-all">
                    {studentEmail}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-1 italic">
                    (Vui lòng hòm thư mục Thư rác/Quảng cáo nếu chưa nhận được
                    nhé)
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-[11px] font-medium flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* 6 Digit Box Inputs */}
                <div className="flex justify-center gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      maxLength={1}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-14 bg-stone-50 hover:bg-stone-100/50 focus:bg-white text-center font-bold text-lg border border-stone-200 hover:border-stone-300 focus:border-blue-500 rounded-xl transition focus:outline-hidden font-sans text-stone-800"
                    />
                  ))}
                </div>

                {/* OTP Expiry & Countdown */}
                <div className="flex items-center justify-between text-xs px-2 text-stone-500">
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4 text-rose-500" />
                    <span>
                      Hết hạn:{" "}
                      <strong className="text-stone-800 font-sans font-semibold">
                        {formatTime(expiryTimeLeft)}
                      </strong>
                    </span>
                  </div>

                  {resendCooldown > 0 ? (
                    <span className="text-[11px] text-stone-400">
                      Gửi lại mã khả dụng sau {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="cursor-pointer text-[11px] text-blue-600 hover:text-blue-800 font-bold transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
                      <span>Gửi lại mã</span>
                    </button>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="cursor-pointer flex-1 py-3 border border-stone-200 hover:bg-stone-50 rounded-2xl text-stone-600 font-black text-xs duration-150"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmOtp}
                    disabled={
                      otp.join("").length !== 6 ||
                      isLoading ||
                      expiryTimeLeft === 0
                    }
                    className={`flex-[2] py-3 rounded-2xl font-black text-xs shadow-sm flex items-center justify-center gap-1.5 duration-150 cursor-pointer ${
                      otp.join("").length === 6 &&
                      expiryTimeLeft > 0 &&
                      !isLoading
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang xác minh...</span>
                      </>
                    ) : (
                      <span>Đồng ý Xác Thực</span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Verification Success! */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-5 py-4"
              >
                <div className="flex justify-center">
                  <div className="p-3.5 bg-emerald-50 rounded-full text-emerald-600 border border-emerald-200/50 shadow-inner">
                    <CheckCircle className="w-12 h-12 stroke-[2.5]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-display font-black text-stone-900 text-base">
                    Xác Minh Thành Công!
                  </h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                    Hệ thống xác minh tư cách sinh viên tại{" "}
                    <strong>{detectedUni?.name}</strong> đã hoàn tất thành công
                    tốt đẹp!
                  </p>
                </div>

                {/* Show the verified badges in full view */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200/50 rounded-2xl max-w-sm mx-auto space-y-2">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="font-sans text-xs text-stone-500 font-medium">
                      Hộp thư sinh viên:
                    </span>
                    <strong className="font-sans text-xs text-stone-700 break-all">
                      {studentEmail}
                    </strong>
                  </div>
                  <div className="flex justify-center pt-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-semibold shadow-sm">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Thành viên: SV {detectedUni?.shortName}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-100" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="cursor-pointer w-full py-3.5 bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-700 hover:to-pink-600 text-white font-bold rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Star className="w-3.5 h-3.5" />
                    Nâng lên SV Uy Tín (Tick Vàng)
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold rounded-2xl text-xs transition"
                  >
                    Để sau
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Upload thẻ SV */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center space-y-1">
                  <div className="flex justify-center">
                    <div className="p-3 bg-amber-50 rounded-full border border-amber-200">
                      <Camera className="w-8 h-8 text-amber-500" />
                    </div>
                  </div>
                  <h4 className="font-display font-black text-stone-900 text-sm">
                    Xác Thực SV Uy Tín
                  </h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed max-w-xs mx-auto">
                    Chụp rõ <strong>mặt trước thẻ sinh viên</strong> của bạn. AI
                    sẽ tự động đọc và xác minh trong vài giây.
                  </p>
                </div>

                {/* Upload zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition min-h-[160px] ${
                    cardImagePreview
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-stone-200 bg-stone-50 hover:border-rose-300 hover:bg-rose-50/30"
                  }`}
                >
                  {cardImagePreview ? (
                    <>
                      <img
                        src={cardImagePreview}
                        alt="Thẻ SV"
                        className="max-h-36 rounded-xl object-contain shadow-sm"
                      />
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        ✓ Đã chọn ảnh — nhấn để đổi
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-stone-300" />
                      <span className="text-xs text-stone-400 font-medium">
                        Nhấn để chọn ảnh thẻ SV
                      </span>
                      <span className="text-[10px] text-stone-300">
                        JPG, PNG — tối đa 5MB
                      </span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCardImageSelect}
                  />
                </div>

                {/* Hướng dẫn */}
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-blue-700">
                    💡 Chụp ảnh đạt chuẩn:
                  </p>
                  <ul className="text-[10px] text-blue-600 space-y-0.5 list-disc list-inside">
                    <li>Ảnh chụp thẳng, đủ sáng, không bị mờ/lóa</li>
                    <li>Hiển thị rõ tên, mã SV và logo trường</li>
                    <li>Không che khuất bất kỳ thông tin nào</li>
                  </ul>
                </div>

                {cardError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-600">{cardError}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleSubmitCard}
                    disabled={!cardImageBase64 || isUploadingCard}
                    className="cursor-pointer w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2"
                  >
                    {isUploadingCard ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        AI đang phân tích thẻ...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Xác Thực Ngay
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-500 font-medium rounded-2xl text-[11px] transition"
                  >
                    Để sau
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Trusted Verified Success */}
            {(step as any) === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-5 py-4"
              >
                <div className="flex justify-center">
                  <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-full border border-amber-200 shadow-inner">
                    <Star className="w-12 h-12 text-amber-500 fill-amber-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-display font-black text-stone-900 text-base">
                    SV Uy Tín Kích Hoạt!
                  </h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                    Thẻ sinh viên của bạn đã được AI xác minh thành công. Badge{" "}
                    <strong className="text-amber-600">SV Uy Tín ✦</strong> đã
                    được gắn vào tài khoản!
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex justify-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-semibold shadow-sm">
                      <GraduationCap className="w-3.5 h-3.5" />
                      SV {detectedUni?.shortName || "Đã xác thực"}
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-100" />
                    </div>
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-bold shadow-sm">
                      <Star className="w-3 h-3 fill-white" />
                      SV Uy Tín
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-700 font-medium">
                    Bài đăng của bạn sẽ được ưu tiên hiển thị và tăng độ tin cậy
                    với người mua!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl text-xs shadow-md transition"
                >
                  Hoàn tất — Về trang chính!
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Brand guarantee footer */}
        <div className="p-4 border-t border-stone-100 text-center bg-stone-50/20">
          <p className="text-[10px] text-stone-400 font-sans">
            Mọi dữ liệu học hàm được Uni-Share mã hóa lưu trữ hoàn toàn bảo mật.
          </p>
        </div>
      </div>
    </div>
  );
};
export default VerifyStudentModal;
