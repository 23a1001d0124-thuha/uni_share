import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Search, X, Clock, HelpCircle } from "lucide-react";
import { Product } from "../types";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  products: Product[];
}

export default function SearchOverlay({
  isOpen,
  onClose,
  onSearch,
  products
}: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("uni_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading recent searches:", e);
    }
  }, [isOpen]);

  // Autofocus input when overlay is opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle Escape key closure
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Normalize string helper for Vietnamese query matching
  const normalizeStr = (str: string) => {
    return str
      ? str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim()
      : "";
  };

  const normalizedQuery = normalizeStr(query);

  // Suggestions filtered by fuzzy match
  const suggestions = query
    ? products
        .filter((prod) => normalizeStr(prod.name).includes(normalizedQuery))
        .slice(0, 6)
    : [];

  const handleSaveSearchQuery = (searchVal: string) => {
    if (!searchVal.trim()) return;
    const cleanVal = searchVal.trim();
    const updated = [cleanVal, ...recentSearches.filter((s) => s !== cleanVal)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem("uni_recent_searches", JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving search history:", e);
    }
  };

  const handleTriggerSearch = (searchVal: string) => {
    handleSaveSearchQuery(searchVal);
    onSearch(searchVal);
    onClose();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleTriggerSearch(query);
    }
  };

  const recentPills = [
    "Sách triết học",
    "Bàn phím cơ",
    "Tủ lạnh mini",
    "Giáo trình KTCT",
    "Tai nghe Sony",
    "Quạt điện"
  ];

  const handleClearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem("uni_recent_searches");
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-white flex flex-col animate-slideUp"
      id="search-overlay-container"
      style={{
        animation: "slideUp 280ms cubic-bezier(0.32, 0.72, 0, 1) forwards"
      }}
    >
      {/* Header (56px) - Safe Notch-friendly top spacing on Mobile */}
      <div className="h-14 py-2 px-4 border-b border-stone-100 flex items-center gap-3 bg-white shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-rose-600 font-bold hover:text-rose-700 transition cursor-pointer text-sm"
          id="btn-back-overlay"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>

        <form onSubmit={handleFormSubmit} className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm tài liệu, giáo trình, đồ điện, phụ kiện..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-stone-50 rounded-2xl pl-10 pr-10 py-2.5 text-sm border-none outline-none text-stone-900 placeholder-stone-400 focus:ring-1 focus:ring-rose-500 transition"
            id="input-search-overlay"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-700 font-bold cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        
        {/* Pills Quick Search Shortcuts */}
        <div className="space-y-2.5">
          <span className="text-stone-400 text-[11px] font-extrabold tracking-wide uppercase block text-left">Gợi ý tìm nhanh</span>
          <div className="flex flex-wrap gap-2">
            {recentPills.map((pill) => (
              <button
                key={pill}
                onClick={() => handleTriggerSearch(pill)}
                className="bg-rose-50 hover:bg-rose-100/80 active:scale-95 text-rose-700 text-xs px-3 py-1.5 rounded-full border border-rose-100 transition cursor-pointer font-medium"
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* Query Conditional Display */}
        {query ? (
          /* Suggestion Rows List Feed */
          <div className="space-y-3">
            <span className="text-stone-400 text-[11px] font-extrabold tracking-wide uppercase block text-left">Kết quả gợi ý khớp ({suggestions.length})</span>
            {suggestions.length > 0 ? (
              <div className="divide-y divide-stone-100 border border-stone-150 rounded-2xl overflow-hidden bg-white shadow-3xs">
                {suggestions.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => handleTriggerSearch(prod.name)}
                    className="w-full p-3 hover:bg-rose-50/50 transition flex items-center gap-3 text-left focus:bg-rose-50/30"
                  >
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover shrink-0 border border-stone-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900 text-sm truncate">{prod.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-rose-600 font-black text-xs">{prod.price.toLocaleString("vi-VN")}đ</span>
                        <span className="text-stone-300">•</span>
                        <span className="text-stone-400 text-xs font-medium">{prod.category}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-200 rounded-2xl text-stone-500 text-xs">
                <HelpCircle className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                Không tìm thấy gợi ý viết tắt nào khớp gần. Nhấn Enter để gửi truy vấn rộng.
              </div>
            )}
          </div>
        ) : (
          /* Recent Searches Section (Input is empty) */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 text-[11px] font-extrabold tracking-wide uppercase block text-left">Tìm kiếm gần đây</span>
              {recentSearches.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-stone-400 hover:text-rose-600 text-[11px] hover:underline font-semibold cursor-pointer"
                >
                  Xóa lịch sử
                </button>
              )}
            </div>

            {recentSearches.length > 0 ? (
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <div
                    key={`${search}-${index}`}
                    className="flex justify-between items-center bg-stone-50 hover:bg-stone-100 rounded-xl px-3.5 py-2.5 transition gap-2"
                  >
                    <button
                      onClick={() => handleTriggerSearch(search)}
                      className="flex-1 flex items-center gap-2.5 text-left text-xs font-semibold text-stone-700 hover:text-rose-600 transition cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      {search}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = recentSearches.filter((s) => s !== search);
                        setRecentSearches(filtered);
                        localStorage.setItem("uni_recent_searches", JSON.stringify(filtered));
                      }}
                      className="text-stone-400 hover:text-stone-605 text-sm p-1 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-stone-50/50 border border-stone-200/60 rounded-xl p-6 text-center text-xs text-stone-405">
                Chưa có lịch sử tìm kiếm gần đây. Thử gõ từ khóa!
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
