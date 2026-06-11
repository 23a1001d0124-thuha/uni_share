"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function VerifyStudentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState(
    "Đang xác thực tài khoản sinh viên...",
  );

  useEffect(() => {
    const userId = searchParams.get("userId");
    const studentEmail = searchParams.get("studentEmail");
    const token = localStorage.getItem("unishare_token");

    if (!userId || !studentEmail || !token) {
      setStatus("error");
      setMessage(
        "Link xác thực không hợp lệ hoặc bạn chưa đăng nhập. Vui lòng thử lại từ ứng dụng.",
      );
      return;
    }

    // Gọi API confirm để cập nhật DB
    fetch("/api/auth/verify-student/confirm-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ studentEmail }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setMessage(
            `Xác thực email sinh viên thành công! Đang chuyển về trang chính...`,
          );
          // Redirect về trang chính sau 2 giây
          setTimeout(() => router.replace("/"), 2000);
        } else {
          setStatus("error");
          setMessage(
            data.message || "Xác thực không thành công. Vui lòng thử lại.",
          );
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Không thể kết nối máy chủ. Vui lòng thử lại.");
      });
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg border border-stone-200 p-8 max-w-sm w-full text-center space-y-5">
        {/* Icon */}
        <div className="flex justify-center">
          {status === "loading" && (
            <div className="p-4 bg-blue-50 rounded-full">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="p-4 bg-emerald-50 rounded-full">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
          )}
          {status === "error" && (
            <div className="p-4 bg-rose-50 rounded-full">
              <XCircle className="w-10 h-10 text-rose-600" />
            </div>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h2 className="font-bold text-stone-900 text-base">
            {status === "loading" && "Đang xử lý..."}
            {status === "success" && "Xác Thực Thành Công! 🎉"}
            {status === "error" && "Xác Thực Thất Bại"}
          </h2>
          <p className="text-sm text-stone-500 leading-relaxed">{message}</p>
        </div>

        {/* Action */}
        {status === "error" && (
          <button
            onClick={() => router.replace("/")}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl text-sm transition"
          >
            Quay về trang chính
          </button>
        )}

        {status === "success" && (
          <div className="text-xs text-stone-400 animate-pulse">
            Đang chuyển hướng...
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyStudentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-lg border border-stone-200 p-8 max-w-sm w-full text-center space-y-5">
            <div className="flex justify-center">
              <div className="p-4 bg-blue-50 rounded-full">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
            </div>
            <p className="text-sm text-stone-500">Đang tải...</p>
          </div>
        </div>
      }
    >
      <VerifyStudentCallbackContent />
    </Suspense>
  );
}
