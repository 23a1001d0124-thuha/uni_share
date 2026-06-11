import React, { useState, useEffect } from "react";
import {
  Send,
  MapPin,
  Tag,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  TrendingDown,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { ChatRoom, Product, Message } from "../types";

interface ChatWorkspaceProps {
  currentUserId: string;
  rooms: ChatRoom[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onPostMessage: (roomId: string, text: string) => Promise<void>;
  onLockInTransaction: (
    productId: string,
    status: "Đang chờ" | "Đã bán",
  ) => Promise<void>;
}

export default function ChatWorkspace({
  rooms,
  activeRoomId,
  onSelectRoom,
  onPostMessage,
  onLockInTransaction,
  currentUserId,
}: ChatWorkspaceProps) {
  const [inputText, setInputText] = useState("");
  const activeRoom = rooms.find((r) => r.roomId === activeRoomId) || rooms[0];

  // Mobile navigation tab representation (Messenger style)
  const [mobileActiveTab, setMobileActiveTab] = useState<
    "rooms" | "chat" | "pricing"
  >(activeRoomId ? "chat" : "rooms");

  useEffect(() => {
    if (activeRoomId) {
      setMobileActiveTab("chat");
    }
  }, [activeRoomId]);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom on mount, active room change, or message arrival
  useEffect(() => {
    scrollToBottom();
  }, [activeRoomId, activeRoom?.messages]);

  // Handle automatic height calculation
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // AI Pricing Analyst states
  const [isAnalyzingPrice, setIsAnalyzingPrice] = useState(false);
  const [pricingReport, setPricingReport] = useState<any | null>(null);

  // Send message hook
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeRoom) return;

    const copyText = inputText;
    setInputText("");
    try {
      await onPostMessage(activeRoom.roomId, copyText);
    } catch (err) {
      console.error(err);
      alert("Không gửi được tin nhắn.");
    }
  };

  // Quick Action: campus meet pin helper
  const triggerCampusMeet = async () => {
    if (!activeRoom) return;
    const campusStr = `📍 [HẸN GẶP]: Mình hẹn gặp nhau trực tiếp tại Sảnh chính Tòa nhà A - trường ${activeRoom.product.school} vào lúc 12:15 trưa mai nha. Bạn mang theo đồ qua mình kiểm tra luôn cho tiện nhé!`;
    try {
      await onPostMessage(activeRoom.roomId, campusStr);
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Action: Send coupon code
  const triggerSendCoupon = async () => {
    if (!activeRoom) return;
    const codes = ["MATCH20K", "UNIDISC5", "SINHVIENOK", "K62DEAL"];
    const coupon =
      codes[Math.floor(Math.random() * codes.length)] +
      Math.floor(Math.random() * 900 + 100);
    const textMsg = `🎫 [GỬI MÃ GIẢM GIÁ]: Nhượng lại mã giảm giá StudentPay đặc quyền cho bạn: **${coupon}** (Giảm ngay 15% khi thanh toán hoặc thanh toán bằng MoMo). Giao dịch an toàn nha!`;
    try {
      await onPostMessage(activeRoom.roomId, textMsg);
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Action: Lock-in transaction
  const triggerConfirmTransaction = async () => {
    if (!activeRoom) return;
    try {
      await onLockInTransaction(activeRoom.product.id, "Đang chờ");
      const systemNotice = `✅ [HỢP ĐỒNG GIAO DỊCH]: Trạng thái sản phẩm đã được cập nhật thành "Đang chờ thanh toán" (Đang khóa để giữ đồ cho bạn). Hãy điều hướng qua tab "Thanh Toán" để tất toán nhanh chóng!`;
      await onPostMessage(activeRoom.roomId, systemNotice);
    } catch (e) {
      console.error(e);
    }
  };

  // AI assistant pricing prediction
  const getAiPricingAnalysis = async () => {
    if (!activeRoom) return;
    setIsAnalyzingPrice(true);
    setPricingReport(null);

    try {
      const res = await fetch("/api/gemini/analyze-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: activeRoom.product.name,
          condition: "Cũ sài lướt đẹp",
          originalPrice: activeRoom.product.price * 2, // approximation fallback
          description: "Mô tả đồ cũ sinh viên",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPricingReport(data.analysis);
      } else {
        alert("Thất bại khi liên kết trí tuệ nhân tạo định giá.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingPrice(false);
    }
  };

  if (rooms.length === 0 || !activeRoom) {
    return (
      <div
        className="bg-stone-50 border border-stone-200 rounded-2xl py-12 p-6 text-center"
        id="chat-workspace"
      >
        <HelpCircle className="w-12 h-12 text-stone-300 mx-auto mb-3 animate-pulse" />
        <h4 className="text-stone-700 font-semibold text-lg">
          Chưa kết nối cuộc gọi chat nào
        </h4>
        <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto">
          Hãy tìm kiếm các sản phẩm trong mục "Kinh tế" hoặc lướt "Tinder Match"
          để hỏi mua sản phẩm từ bạn học khác.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[580px]"
      id="chat-workspace"
    >
      {/* 1. ROOMS LEFT LIST PANEL (3 Cols) */}
      <div
        className={`${mobileActiveTab === "rooms" ? "flex" : "hidden lg:flex"} lg:col-span-3 bg-white border border-stone-200 rounded-2xl p-3 space-y-2 flex-col h-full overflow-hidden`}
      >
        <span className="text-[10px] text-stone-400 font-black tracking-wider uppercase block px-2">
          HỘI THOẠI GIAO DỊCH ({rooms.length})
        </span>

        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {rooms.map((room) => {
            const isSelected = room.roomId === activeRoom.roomId;
            const lastMsg = room.messages[room.messages.length - 1];
            return (
              <button
                key={room.roomId}
                onClick={() => {
                  onSelectRoom(room.roomId);
                  setMobileActiveTab("chat");
                }}
                className={`w-full text-left p-2.5 rounded-xl transition cursor-pointer flex gap-2.5 border items-start ${
                  isSelected
                    ? "bg-rose-50/70 border-rose-200 text-rose-950"
                    : "bg-white border-transparent hover:bg-stone-50 text-stone-800"
                }`}
              >
                <img
                  src={room.product.image}
                  alt={room.product.name}
                  className="w-9 h-9 object-cover rounded-lg border border-stone-200 shrink-0 mt-0.5"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span
                      className="font-bold text-xs truncate max-w-[80px]"
                      title={
                        room.viewerRole === "seller"
                          ? room.buyer.name
                          : room.seller.name
                      }
                    >
                      {room.viewerRole === "seller"
                        ? room.buyer.name
                        : room.seller.name}
                    </span>
                    <span className="text-[9px] text-stone-400">
                      {room.product.school.split(" ").pop()}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-stone-600 truncate mt-0.5">
                    {room.product.name}
                  </p>
                  <p className="text-[10px] text-stone-400 truncate mt-1">
                    {lastMsg ? lastMsg.text : "Chưa có lời thắc mắc"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CHAT FEED & MESSAGE AREA (6 Cols) */}
      <div
        className={`${mobileActiveTab === "chat" ? "flex" : "hidden lg:flex"} lg:col-span-6 bg-white border border-stone-200 rounded-2xl flex-col justify-between overflow-hidden relative h-full`}
      >
        {/* Chat partner header banner */}
        <div className="bg-stone-50 border-b border-stone-200 p-3 px-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Elegant mobile-only Back Arrow */}
            <button
              onClick={() => setMobileActiveTab("rooms")}
              className="lg:hidden p-1.5 -ml-1 text-stone-600 hover:bg-stone-200 rounded-xl cursor-pointer"
              title="Quay lại danh sách chat"
              type="button"
            >
              <svg
                className="w-5 h-5 stroke-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="w-8 h-8 rounded-full bg-rose-200 border border-rose-300 flex items-center justify-center font-bold text-rose-800 text-xs shrink-0 select-none">
              {chatPartner?.name?.[0] ?? "?"}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-stone-900 text-xs flex items-center gap-1 truncate pb-0.5">
                {chatPartner?.name ?? "Đối phương"}
                {chatPartner?.isStudentVerified && (
                  <span className="bg-emerald-100 text-emerald-800 text-[8px] px-1.5 py-0.2 rounded-full font-black border border-emerald-250 shrink-0">
                    SV Verified
                  </span>
                )}
              </span>
              <span className="text-stone-400 text-[9px] block truncate font-medium">
                Trường: {chatPartner?.school ?? "Chưa rõ"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Interactive short-cut to AI Pricing analyst on mobile with Sparkles */}
            <button
              onClick={() => setMobileActiveTab("pricing")}
              className="lg:hidden bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 p-1.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              title="AI Định giá"
              type="button"
            >
              <Sparkles className="w-3 h-3 text-amber-550 fill-amber-500 animate-pulse" />
              Định giá
            </button>

            <div className="text-right">
              <span className="text-[10px] text-stone-400 block font-semibold uppercase">
                GIÁ CHỐT
              </span>
              <span className="font-extrabold text-xs text-rose-600 font-display">
                {activeRoom.product.price.toLocaleString()}đ
              </span>
            </div>
          </div>
        </div>

        {/* Message Feeds Scroll content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/30">
          {activeRoom.messages.length === 0 ? (
            <div
              className="my-auto py-12 p-6 text-center space-y-3 flex flex-col items-center justify-center h-full animate-fadeIn"
              id="chat-empty-state"
            >
              <span className="text-4xl block animate-bounce select-none">
                💬
              </span>
              <h4 className="font-bold text-stone-700 text-xs font-display">
                PHÒNG ĐÀM PHÁN UNI-SHARE
              </h4>
              <p className="text-[11px] text-stone-400 max-w-xs mx-auto leading-relaxed">
                Độ an toàn 100%. Hãy nhanh tay gửi câu hỏi thương lượng lịch sự
                bên dưới để liên lạc và chốt lịch bàn giao đồ!
              </p>
            </div>
          ) : (
            activeRoom.messages.map((msg) => {
              const isMe = currentUserId && msg.senderId === currentUserId;
              const isSys = msg.senderId === "system";

              if (isSys) {
                return (
                  <div
                    key={msg.id}
                    className="bg-amber-50 border border-amber-200 text-stone-800 text-xs p-3 rounded-xl max-w-lg mx-auto space-y-1"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      UNI-SHARE HỖ TRỢ XÁC MINH GIAO DỊCH
                    </div>
                    <p className="leading-relaxed font-medium text-[11px]">
                      {msg.text}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2.5`}
                >
                  {!isMe && (
                    <div className="w-6 h-6 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center font-bold text-stone-700 text-[10px] shrink-0">
                      {chatPartner?.name?.[0] ?? "?"}
                    </div>
                  )}

                  <div
                    className={`p-3 rounded-2xl text-xs max-w-[75%] leading-relaxed ${
                      isMe
                        ? "bg-rose-600 text-white rounded-br-none"
                        : "bg-white text-stone-850 border border-stone-200 rounded-bl-none"
                    }`}
                  >
                    <p className="text-xs">{msg.text}</p>
                    <span
                      className={`block text-[9px] mt-1 text-right ${isMe ? "text-rose-200/90" : "text-stone-400"}`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* BOTTOM QUICK TOOL ACTIONS BAR */}
        <div className="bg-stone-50 border-t border-stone-200 p-2 grid grid-cols-3 gap-2 shrink-0">
          <button
            onClick={triggerCampusMeet}
            className="bg-white hover:bg-stone-100 text-stone-700 text-[10px] font-bold py-2 rounded-xl border border-stone-250 flex items-center justify-center gap-1 shadow-2xs cursor-pointer min-h-[44px]"
            title="Chọn địa điểm hẹn gặp tại trường"
            type="button"
          >
            <MapPin className="w-3.5 h-3.5 text-stone-400" />
            Xét Hẹn Gặp
          </button>

          <button
            onClick={triggerSendCoupon}
            className="bg-white hover:bg-stone-100 text-stone-700 text-[10px] font-bold py-2 rounded-xl border border-stone-250 flex items-center justify-center gap-1 shadow-2xs cursor-pointer min-h-[44px]"
            title="Độc quyền trao đổi code coupon ưu đãi"
            type="button"
          >
            <Tag className="w-3.5 h-3.5 text-stone-400" />
            Tặng Coupon
          </button>

          <button
            onClick={triggerConfirmTransaction}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold py-2 rounded-xl border border-rose-250 flex items-center justify-center gap-1 shadow-2xs cursor-pointer min-h-[44px]"
            title="Thay đổi trạng thái sản phẩm sang chờ thanh toán"
            type="button"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            Xác Nhận Mua
          </button>
        </div>

        {/* Active Typing Input Area */}
        <form
          onSubmit={handleSend}
          className="bg-white p-3 border-t border-stone-205 flex gap-2 shrink-0 items-end"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Trao đổi lịch lấy đồ lịch sự, thương lượng giảm giá nhẹ..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 p-2.5 bg-stone-50 border border-stone-250 rounded-xl text-stone-800 text-xs focus:outline-hidden focus:border-rose-500 focus:bg-white transition resize-none min-h-[44px] max-h-[120px] overflow-y-auto leading-relaxed"
          />
          <button
            type="submit"
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl p-2.5 px-4 flex items-center justify-center transition cursor-pointer min-h-[44px]"
            aria-label="Gửi tin nhắn"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 3. RIGHT AI SIDE DRAWER (3 Cols) */}
      <div
        className={`${mobileActiveTab === "pricing" ? "flex" : "hidden lg:flex"} lg:col-span-3 bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex-col justify-between overflow-y-auto h-full`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-amber-200">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4.5 h-4.5 text-amber-600 fill-amber-500 animate-spin" />
              <span className="font-bold text-amber-900 text-xs font-display">
                QUẦY ĐỊNH GIÁ AI ĐỒ CŨ
              </span>
            </div>

            <button
              onClick={() => setMobileActiveTab("chat")}
              className="lg:hidden text-stone-605 bg-white hover:bg-stone-100 hover:text-stone-900 p-1 px-2 rounded-lg text-[10px] font-bold border border-stone-250 cursor-pointer transition-all shrink-0"
              type="button"
            >
              Về cuộc chat
            </button>
          </div>

          <p className="text-[10px] text-amber-950 font-medium leading-relaxed bg-white/60 p-2.5 rounded-lg border border-amber-200/50">
            Dành cho người bán & người mua: Hệ thống AI sẽ phân tích các đặc
            trưng mặt hàng để khuyên khoảng định giá tối ưu nhất so với thị
            trường sinh viên toàn quốc.
          </p>

          <button
            onClick={getAiPricingAnalysis}
            disabled={isAnalyzingPrice}
            className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-55 text-white py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            {isAnalyzingPrice ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                AI Đang Phân Tích...
              </>
            ) : (
              <>
                <TrendingDown className="w-3.5 h-3.5" />
                Định giá món đồ bằng AI
              </>
            )}
          </button>

          {/* Gemini output analyst report */}
          {pricingReport && (
            <div className="space-y-3 pt-2">
              <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2 shadow-2xs">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-stone-400 font-semibold font-display">
                    ĐỘ TIN CẬY AI
                  </span>
                  <span className="text-emerald-700 font-extrabold uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
                    {pricingReport.confidence}
                  </span>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1">
                  <div>
                    <span className="text-stone-400 text-[10px] block">
                      MỨC GIÁ ĐỀ NGHỊ
                    </span>
                    <span className="font-black text-rose-600 text-sm font-display">
                      {pricingReport.recommendedPrice?.toLocaleString()} VND
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-stone-400 text-[10px] block">
                      KHOẢNG KHUYÊN DÙNG
                    </span>
                    <span className="font-bold text-stone-700 text-[11px] block">
                      {pricingReport.suggestedLowerLimit?.toLocaleString()}đ -{" "}
                      {pricingReport.suggestedUpperLimit?.toLocaleString()}đ
                    </span>
                  </div>
                </div>
              </div>

              {/* Reasoning comment */}
              <div className="bg-white/90 p-3 rounded-xl border border-amber-150 text-[10px] text-amber-950 space-y-1 shadow-2xs">
                <span className="font-black text-amber-800 block">
                  Lời giải thích phân tích:
                </span>
                <p className="leading-relaxed italic">
                  "{pricingReport.reasoning}"
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-[9px] text-stone-400 text-center pt-2 border-t border-amber-200/50 mt-4 italic">
          Bảo trợ thông tin bởi mô hình Gemini 2.0-flash
        </div>
      </div>
    </div>
  );
}
