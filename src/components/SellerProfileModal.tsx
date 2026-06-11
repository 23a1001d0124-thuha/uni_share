import React, { useState, useEffect } from "react";
import { X, MapPin, Star, MessageSquare, Package, ShieldCheck, Check } from "lucide-react";
import { Product, UserProfile } from "../types";

interface SellerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerName: string;
  sellerSchool?: string;
  products: Product[];
  onSelectProductForChat: (pId: string) => void;
}

export default function SellerProfileModal({ isOpen, onClose, sellerName, sellerSchool, products, onSelectProductForChat }: SellerProfileModalProps) {
  if (!isOpen) return null;

  const sellerProducts = products.filter(p => p.author === sellerName);
  
  const [sellerRatings, setSellerRatings] = useState<any[]>([]);
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("uni_ratings");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSellerRatings(parsed.filter((r: any) => r.sellerName === sellerName));
      }
    }
  }, [isOpen, sellerName]);

  const avgRating = sellerRatings.length > 0 
    ? (sellerRatings.reduce((sum, r) => sum + r.score, 0) / sellerRatings.length).toFixed(1)
    : "5.0";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full z-10 text-white transition-colors cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-32 shrink-0"></div>
        
        <div className="px-6 pb-6 flex-1 overflow-y-auto">
          {/* User Header */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-md flex items-center justify-center text-3xl shrink-0 font-bold text-slate-400">
              {sellerName.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                {sellerName}
                <div title="Đã xác thực sinh viên">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
              </h2>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4" /> {sellerSchool || "Chưa cập nhật trường"}
              </p>
            </div>
            <button className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm py-2.5 px-4 flex items-center justify-center gap-1.5 rounded-xl transition cursor-pointer">
              <MessageSquare className="w-4 h-4" />
              Nhắn tin ngay
            </button>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="bg-slate-50 dark:bg-zinc-800 flex-1 p-3 rounded-xl border flex flex-col items-center">
              <span className="text-xs text-slate-500 font-bold uppercase mb-1">Đánh giá</span>
              <div className="flex items-baseline gap-1 font-bold text-amber-500 text-xl font-display">
                {avgRating} <Star className="w-5 h-5 fill-amber-500 self-center" />
              </div>
              {sellerRatings.length > 0 && <span className="text-[10px] text-slate-400 font-medium">({sellerRatings.length} nhận xét)</span>}
            </div>
            <div className="bg-slate-50 dark:bg-zinc-800 flex-1 p-3 rounded-xl border flex flex-col items-center">
              <span className="text-xs text-slate-500 font-bold uppercase mb-1">Đang bán</span>
              <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 text-xl font-display">
                <Package className="w-5 h-5 text-indigo-500" /> {sellerProducts.filter(p => p.status === "Đang bán").length}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-800 flex-1 p-3 rounded-xl border flex flex-col items-center">
              <span className="text-xs text-slate-500 font-bold uppercase mb-1">Đã bán</span>
              <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 text-xl font-display">
                <Check className="w-5 h-5 text-emerald-500" /> {sellerProducts.filter(p => p.status === "Đã bán").length}
              </div>
            </div>
          </div>

          <h3 className="font-bold text-lg border-b pb-2 mb-4 dark:border-zinc-800">Tin đăng của {sellerName}</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sellerProducts.length === 0 ? (
              <p className="col-span-full text-center text-slate-500 py-8">Chưa có tin đăng nào.</p>
            ) : sellerProducts.map(p => (
              <div key={p.id} className="border rounded-xl overflow-hidden hover:shadow-md transition bg-white dark:bg-zinc-800 flex flex-col">
                <div className="aspect-square bg-slate-100 overflow-hidden relative">
                  <img src={p.images[0]} className="w-full h-full object-cover" alt={p.name} />
                  {p.status !== "Đang bán" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-rose-600 text-white font-bold text-xs px-2 py-1 rounded">Đã bán/Nhận cọc</span>
                    </div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-xs line-clamp-2">{p.name}</h4>
                    <span className="text-rose-600 font-bold text-sm block mt-1">{p.price.toLocaleString("vi-VN")}đ</span>
                  </div>
                  {p.status === "Đang bán" && (
                    <button 
                      onClick={() => {
                        onSelectProductForChat(p.id);
                        onClose();
                      }}
                      className="mt-3 w-full border border-slate-200 hover:bg-slate-50 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" /> Thương lượng
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
