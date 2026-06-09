import React from "react";
import "./globals.css";
import { AuthProvider } from "../components/auth/AuthContext";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
});

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
    <html lang="vi" className={`${plusJakarta.variable}`}>
      <body className="font-sans bg-[#FFF6F7] text-stone-900 min-h-screen selection:bg-rose-200">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
