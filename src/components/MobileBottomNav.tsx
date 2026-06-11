import React from "react";
import { ShoppingBag, Megaphone, PlusCircle, MessageSquare, User } from "lucide-react";

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  chatRoomsLength: number;
  onPostOpen: () => void;
  onSearchOpen?: () => void;
}

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  chatRoomsLength,
  onPostOpen,
}: MobileBottomNavProps) {
  return (
    <div 
      className="block md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2"
      style={{
        paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
        height: "calc(58px + env(safe-area-inset-bottom, 0px))"
      }}
    >
      <div className="flex justify-around items-center h-[58px] max-w-lg mx-auto">
        
        {/* Tab 1: Chợ */}
        <button
          onClick={() => setActiveTab("marketplace")}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all flex-1 h-full select-none ${
            activeTab === "marketplace" 
              ? "text-rose-600 font-extrabold" 
              : "text-stone-400 hover:text-stone-700"
          }`}
        >
          <div className={`p-1 px-2 text-center rounded-xl flex flex-col items-center ${activeTab === "marketplace" ? "bg-rose-50" : ""}`}>
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[9.5px] leading-tight block mt-0.5">Chợ</span>
          </div>
        </button>

        {/* Tab 2: Gom Mua (Forum) */}
        <button
          onClick={() => setActiveTab("forum")}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all flex-1 h-full select-none ${
            activeTab === "forum" 
              ? "text-rose-600 font-extrabold" 
              : "text-stone-400 hover:text-stone-700"
          }`}
        >
          <div className={`p-1 px-2 text-center rounded-xl flex flex-col items-center ${activeTab === "forum" ? "bg-rose-50" : ""}`}>
            <Megaphone className="w-5 h-5" />
            <span className="text-[9.5px] leading-tight block mt-0.5">Gom Mua</span>
          </div>
        </button>

        {/* Tab 3: Đăng bán (Central prominent button) */}
        <button
          onClick={onPostOpen}
          className="flex flex-col items-center justify-center flex-1 h-full select-none -mt-4 relative z-60"
        >
          <div className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-4 border-white transition-all">
            <PlusCircle className="w-7 h-7" />
          </div>
          <span className="text-[9.5px] text-stone-500 font-semibold mt-1">Đăng bán</span>
        </button>


        {/* Tab 4: Chat */}
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all flex-1 h-full select-none ${
            activeTab === "chat" 
              ? "text-rose-600 font-extrabold" 
              : "text-stone-400 hover:text-stone-700"
          }`}
        >
          <div className={`p-1 px-2 text-center rounded-xl flex flex-col items-center relative ${activeTab === "chat" ? "bg-rose-50" : ""}`}>
            <MessageSquare className="w-5 h-5" />
            {chatRoomsLength > 0 && (
              <span className="absolute top-0 right-1.5 bg-rose-600 text-white font-black text-[8px] h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                {chatRoomsLength}
              </span>
            )}
            <span className="text-[9.5px] leading-tight block mt-0.5">Chat</span>
          </div>
        </button>

        {/* Tab 5: Tôi */}
        <button
          onClick={() => setActiveTab("my-listings")}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all flex-1 h-full select-none ${
            activeTab === "my-listings" 
              ? "text-rose-600 font-extrabold" 
              : "text-stone-400 hover:text-stone-700"
          }`}
        >
          <div className={`p-1 px-2 text-center rounded-xl flex flex-col items-center ${activeTab === "my-listings" ? "bg-rose-50" : ""}`}>
            <User className="w-5 h-5" />
            <span className="text-[9.5px] leading-tight block mt-0.5">Tôi</span>
          </div>
        </button>
        
      </div>
    </div>
  );
}
