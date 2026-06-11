import React, { useState } from "react";
import { HelpCircle, Send, MessageSquare, ShieldAlert, Sparkles } from "lucide-react";
import { FAQS } from "../data";

export default function HelpCenter() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [supportInput, setSupportInput] = useState("");
  const [supportMessages, setSupportMessages] = useState<any[]>([
    {
      id: 1,
      sender: "support",
      text: "Xin chào! Mình là Trợ lý tự động hướng dẫn cộng đồng Uni-Share. Bạn cần hỗ trợ kiểm duyệt thẻ sinh viên hay phát hiện hành vi gian lận gì không?",
      time: "Vừa xong"
    }
  ]);

  const handleSupportSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportInput.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: supportInput,
      time: "Vừa xong"
    };
    setSupportMessages(prev => [...prev, userMsg]);
    setSupportInput("");

    // Simple automatic simulated smart reply after 1s
    setTimeout(() => {
      const answers = [
        "Cảm ơn phản hồi thực tế của bạn học! Hệ thống AI đã ghi nhận nhu cầu kiểm duyệt thủ công. Chuyên viên KKT sẽ phản hồi trực tiếp sau 15-30 phút nữa nha.",
        "Thông tin hướng dãn: Bàn giao đồ trực tiếp an toàn nhất là hẹn đỗ xe tại các chốt bảo vệ trường học hoặc cổng chính ký túc xá. Nếu có dấu hiệu lừa đảo, hãy nhấn nút 'Tố cáo' ở trang Cài Đặt của khách hàng nha.",
        "Về việc tích hợp StudentPay: Số dư mặc định 500k được ghi nhận sẵn trên applet thử nghiệm để các bạn trải nghiệm dịch vụ tất toán mượt mà. Hệ thống không tính bất kỳ chi phí thực tế nào cả!"
      ];
      const botMsg = {
        id: Date.now() + 1,
        sender: "support",
        text: answers[Math.floor(Math.random() * answers.length)],
        time: "Vừa xong"
      };
      setSupportMessages(prev => [...prev, botMsg]);
    }, 1200);
  };

  return (
    <div className="space-y-6" id="help-center">
      {/* Upper header */}
      <div className="bg-gradient-to-r from-stone-100 to-rose-50 border border-stone-200 p-6 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-stone-900 font-display flex items-center gap-1.5">
            Cổng Hỗ Trợ Đời Sống Sinh Viên
            <HelpCircle className="w-4 h-4 text-rose-500" />
          </h3>
          <p className="text-xs text-stone-500 mt-1">Cung cấp bộ quy chuẩn an toàn học đường, hỏi đáp nhanh trực tuyến và hỗ trợ khẩn cấp.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* FAQS ACCORDION LEFT PAGE (7 cols) */}
        <div className="md:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-stone-900 text-sm border-b pb-2 tracking-wide uppercase font-display select-none">Hỏi Đáp Thường Gặp (FAQs)</h3>
          
          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full text-left p-3.5 bg-stone-50 hover:bg-stone-100/70 font-semibold text-stone-800 text-xs flex justify-between items-center transition cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <span className="font-bold text-stone-400 text-sm">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div className="p-4 bg-white text-stone-605 text-xs leading-relaxed border-t border-stone-150">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-2.5 text-xs text-rose-900">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold block">Nguyên tắc giao dịch nội trú:</span>
              Luôn ưu tiên các giao dịch trao đổi vật chất trực tiếp tại Thư viện trường, Căn tin hoặc Sảnh giảng đường công cộng. Tuyệt đối không chuyển khoản đặt cọc trước cho các đối tác lạ chưa được gắn nhãn "SV Verified".
            </div>
          </div>
        </div>

        {/* SUPPORT TICKET CONVERSATION (5 cols) */}
        <div className="md:col-span-5 bg-white border border-stone-200 rounded-2xl p-4 flex flex-col justify-between h-[420px]">
          <div className="space-y-3 flex-1 overflow-y-auto pb-4">
            <span className="text-[10px] text-stone-400 font-bold block bg-stone-50 p-1.5 rounded-lg border text-center uppercase">Khung Chăm Sóc Khách Hàng</span>
            
            <div className="space-y-3.5">
              {supportMessages.map((msg) => {
                const isBot = msg.sender === "support";
                return (
                  <div key={msg.id} className={`flex ${isBot ? "justify-start" : "justify-end"} items-start gap-2`}>
                    {isBot && (
                      <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-rose-200">
                        S
                      </div>
                    )}
                    <div className={`p-2.5 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                      isBot ? "bg-stone-100 text-stone-850 rounded-tl-none" : "bg-rose-600 text-white rounded-tr-none"
                    }`}>
                      <p>{msg.text}</p>
                      <span className="text-[8px] opacity-70 block text-right mt-1">{msg.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form write input */}
          <form onSubmit={handleSupportSend} className="border-t border-stone-200 pt-3 flex gap-2 shrink-0">
            <input
              type="text"
              placeholder="Hỏi về phí, cách xác thực SV..."
              value={supportInput}
              onChange={(e) => setSupportInput(e.target.value)}
              className="flex-1 p-2 bg-stone-50 border border-stone-250 rounded-xl text-xs focus:outline-hidden focus:bg-white"
            />
            <button
              type="submit"
              className="bg-stone-900 hover:bg-stone-950 text-white rounded-xl p-2 px-3 flex items-center justify-center transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
