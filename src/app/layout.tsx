import React from "react";
import "./globals.css";
import { AuthProvider } from "../components/auth/AuthContext";

export const metadata = {
  title: "UNI-SHARE | Chợ Đồ Cũ Sinh Viên",
  description: "Nền tảng mua bán đồ cũ sinh viên tích hợp AI.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#FFF6F7] text-stone-900 min-h-screen selection:bg-rose-200" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
