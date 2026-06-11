import React, { useState } from "react";
import { Eye, Heart, BarChart2, ShieldAlert, Trash2, Check, RefreshCw, Loader2, Plus, X, Sparkles, Upload } from "lucide-react";
import { Product } from "../types";
import { CATEGORIES, CONDITIONS } from "../data";

interface MyListingsProps {
  products: Product[];
  onUpdateStatus: (id: string, stat: "Đang bán" | "Đang chờ" | "Đã bán") => Promise<void>;
  onDeleteListing: (id: string) => Promise<void>;
  onAddProduct: (newProduct: any) => Promise<void>;
  isStudentVerified: boolean;
}

const CONDITION_SHORT: Record<string, string> = {
  "Mới 100%": "Mới",
  "Như mới (98%)": "Như mới",
  "Còn tốt, đã dùng ít": "Dùng ít",
  "Còn tốt, đã dùng nhiều": "Dùng nhiều",
  "Cũ, còn dùng được": "Cũ OK",
};

export default function MyListings({ 
  products, 
  onUpdateStatus, 
  onDeleteListing,
  onAddProduct,
  isStudentVerified
}: MyListingsProps) {
  const [activeTab, setActiveTab] = useState<"Tất cả" | "Đang bán" | "Đang chờ" | "Đã bán">("Tất cả");
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  // Form State
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState(CATEGORIES[0]);
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdOriginalPrice, setNewProdOriginalPrice] = useState("");
  const [newProdCondition, setNewProdCondition] = useState(CONDITIONS[0]);
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Autocomplete Presets
  const SAMPLE_PRESETS = [
    {
      name: "Sách Kinh tế lượng nâng cao",
      category: "Sách & Giáo trình",
      price: "60000",
      originalPrice: "130000",
      condition: "Còn mới 95%",
      description: "Tài liệu học tập kỳ trước của thầy Sơn, có sẵn toàn bộ đáp án bài tập tự luận chương 1 đến 5.",
      image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80"
    },
    {
      name: "Đèn bàn học rạng đông chóa nhựa",
      category: "Đồ dùng phòng trọ",
      price: "85000",
      originalPrice: "180000",
      condition: "Còn mới 90%",
      description: "Đèn học sắc nét chống cận thị tốt, bóng đèn vàng ấm áp rất sướng mắt khi học bài khuya tại phòng trọ.",
      image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80"
    },
    {
      name: "Chuột Gaming Logitech G102 Lightsync",
      category: "Thiết bị công nghệ",
      price: "240000",
      originalPrice: "450000",
      condition: "Còn mới 92%",
      description: "Chuột dùng cực bốc, độ nhạy cao 8000 DPI, led RGB đổi màu đẹp mắt, thích hợp cho cả học tập lẫn giải trí.",
      image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80"
    }
  ];

  const applyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setNewProdName(preset.name);
    setNewProdCategory(preset.category);
    setNewProdPrice(preset.price);
    setNewProdOriginalPrice(preset.originalPrice);
    setNewProdCondition(preset.condition);
    setNewProdDescription(preset.description);
    setNewProdImage(preset.image);
  };

  // Filter listings only posted by this default user
  const myListings = products.filter(p => p.authorId === "user_client_default");

  // Tab filters
  const filteredMyListings = myListings.filter(p => {
    if (activeTab !== "Tất cả" && p.status !== activeTab) return false;
    return true;
  });

  const handleStatusChange = async (id: string, status: "Đang bán" | "Đang chờ" | "Đã bán") => {
    setIsProcessingId(id + "_" + status);
    try {
      await onUpdateStatus(id, status);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi cập nhật trạng thái!");
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn gỡ bài đăng này khỏi thị trường? Hành động không thể hoàn tác.")) return;
    setIsProcessingId(id + "_delete");
    try {
      await onDeleteListing(id);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi xóa bài đăng!");
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) {
      alert("Vui lòng điền tên và giá thanh lý!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: newProdName,
        category: newProdCategory,
        price: Number(newProdPrice),
        originalPrice: newProdOriginalPrice ? Number(newProdOriginalPrice) : undefined,
        condition: newProdCondition,
        description: newProdDescription,
        images: newProdImage ? [newProdImage] : ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80"],
        author: "Nguyễn Thu Hạ (Bạn)",
        school: isStudentVerified ? "Đại học Mở Hà Nội" : "Chưa xác thực"
      };

      await onAddProduct(payload);

      // Reset Form State
      setNewProdName("");
      setNewProdPrice("");
      setNewProdOriginalPrice("");
      setNewProdDescription("");
      setNewProdImage("");
      setIsOpenForm(false);
    } catch (e) {
      console.error(e);
      alert("Error posting your listing!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="my-listings-area">
      {/* Upper Analytics Banner summary */}
      <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div>
          <h3 className="text-xl font-extrabold font-display flex items-center gap-2 text-white">
            Gian Hàng Của Bạn
            {isStudentVerified && (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Check className="w-3 h-3" />
                Verified
              </span>
            )}
          </h3>
          <p className="text-xs text-stone-300 mt-1.5 font-medium">Quản lý kho đồ đăng bán và theo dõi lượng quan tâm thực tế.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full md:w-auto">
          <div className="flex gap-3">
            <div className="bg-stone-800/80 p-3 px-4 rounded-2xl border border-stone-700/50 min-w-[100px] text-center shadow-inner">
              <span className="text-[10px] text-stone-400 block font-bold tracking-wider mb-1">TIN ĐANG ĐĂNG</span>
              <span className="text-2xl font-black text-rose-400 font-display leading-none">{myListings.length}</span>
            </div>
            <div className="bg-stone-800/80 p-3 px-4 rounded-2xl border border-stone-700/50 min-w-[100px] text-center shadow-inner">
              <span className="text-[10px] text-stone-400 block font-bold tracking-wider mb-1">TỔNG LƯỢT ĐỌC</span>
              <span className="text-2xl font-black text-emerald-400 font-display leading-none">
                {myListings.reduce((sum, p) => sum + p.views, 0)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsOpenForm(!isOpenForm)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3.5 px-5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_14px_rgba(225,29,72,0.4)] active:scale-95 shrink-0"
          >
            {isOpenForm ? (
              <>
                <X className="w-4 h-4" />
                Đóng form đăng
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Thêm bài đăng mới
              </>
            )}
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE CREATION FORM */}
      {isOpenForm && (
        <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm transition space-y-4 animate-fadeIn">
          <div className="border-b pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-stone-900 font-display flex items-center gap-1.5 uppercase select-none">
                <Plus className="w-4.5 h-4.5 text-rose-600" />
                Đăng tin thanh lý đồ dùng sinh viên mới
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">Vật phẩm sẽ được đăng bán trực tiếp mang tên của bạn học.</p>
            </div>
            
            {/* Autofill helper badges */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                Mẫu thử tìm kiếm:
              </span>
              {SAMPLE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="bg-stone-50 hover:bg-rose-50 border border-stone-200 text-stone-600 hover:text-rose-700 text-[10px] px-2.5 py-1 rounded-lg transition font-medium cursor-pointer"
                >
                  {preset.name.split(" ")[0]}..
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            {/* Quick autofill helper for small mobile viewports */}
            <div className="flex sm:hidden flex-wrap items-center gap-1.5 bg-stone-50 p-2.5 border rounded-xl">
              <span className="text-[9px] text-stone-400 font-bold block w-full">ĐIỀN NHANH BẢN THỬ:</span>
              {SAMPLE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="bg-white hover:bg-rose-50 border text-stone-700 text-[9px] px-2 py-1 rounded-md transition font-semibold"
                >
                  {preset.name.split(" ")[0]}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-605 block">Tên vật phẩm cần nhượng lại / thanh lý *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Giáo Trình Kinh Tế Lượng 2024, Nồi Cơm Điện IH Xiaomi..."
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-250 rounded-xl font-medium focus:bg-white focus:outline-hidden transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-stone-605 block">Hạng mục sản phẩm *</label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-250 rounded-xl font-medium focus:bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-605 block">Đánh giá độ mới & tình trạng *</label>
                <select
                  value={newProdCondition}
                  onChange={(e) => setNewProdCondition(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-250 rounded-xl font-medium focus:bg-white"
                >
                  {CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-stone-605 block">Giá chuyển nhượng (VND) *</label>
                <input
                  type="number"
                  required
                  placeholder="Ví dụ: 45000"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-250 rounded-xl font-medium focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-605 block">Giá gốc mua mới (VND) [Để trống nếu không rõ]</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 120000"
                  value={newProdOriginalPrice}
                  onChange={(e) => setNewProdOriginalPrice(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-250 rounded-xl font-medium focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-605 block">Mô tả chi tiết tình trạng và địa điểm bàn giao hàng *</label>
              <textarea
                required
                rows={3}
                placeholder="Ví dụ: Sách học kì trước bọc cẩn thận không nhàu nát. Có thể hẹn gặp trực tiếp tại Giảng đường A hoặc sảnh KTX Đại học Mở Hà Nội..."
                value={newProdDescription}
                onChange={(e) => setNewProdDescription(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-250 rounded-xl font-medium focus:bg-white resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-605 block">Đầu vào ảnh minh họa (URL ảnh Unsplash/Web hoặc bỏ trống lấy ảnh mặc định của trường)</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/your-photo-link..."
                value={newProdImage}
                onChange={(e) => setNewProdImage(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-250 rounded-xl text-[10px] font-mono focus:bg-white"
              />
            </div>

            {/* Submit and Cancel Buttons */}
            <div className="pt-2 border-t flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsOpenForm(false)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold px-4.5 py-2 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold px-5.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang đăng...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Xác nhận Đăng bài
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Internal manager tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-1">
        {(["Tất cả", "Đang bán", "Đang chờ", "Đã bán"] as const).map((tab) => {
          const count = tab === "Tất cả" ? myListings.length : myListings.filter(p => p.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition relative cursor-pointer ${
                activeTab === tab
                  ? "bg-stone-100 text-stone-900 font-bold border border-stone-200"
                  : "text-stone-500 hover:bg-stone-50"
              }`}
            >
              {tab} ({count})
            </button>
          )
        })}
      </div>

      {/* Grid of myListings */}
      {filteredMyListings.length === 0 ? (
        <div className="bg-stone-50 border border-stone-200 py-12 p-6 text-center rounded-3xl">
          <ShieldAlert className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm font-medium">Hiện tại danh sách trống. Bạn chưa đăng tải mặt hàng nào thuộc trạng thái này!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {filteredMyListings.map((p) => {
            const isDeleting = isProcessingId === p.id + "_delete";
            return (
              <div 
                key={p.id}
                className="bg-white border border-stone-200 p-4 sm:p-5 rounded-3xl flex flex-col justify-between hover:shadow-md transition duration-300 group"
              >
                {/* Details layout */}
                <div className="flex gap-4 items-start w-full">
                  <img 
                    src={p.images[0]} 
                    alt={p.name} 
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-2xl border border-stone-150 shrink-0 group-hover:scale-105 transition-transform duration-500" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-exrabold font-display text-stone-900 text-sm leading-snug line-clamp-2">{p.name}</h4>
                    <span className="text-stone-400 text-[10px] sm:text-xs mt-1 block truncate">
                      {p.category}
                    </span>
                    
                    <div className="mt-2.5">
                      <span className="font-black text-rose-600 text-base">
                        {p.price.toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                       <span className="text-[10px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-md">
                         {CONDITION_SHORT[p.condition] || p.condition}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-stone-100 space-y-3">
                  <div className="flex items-center justify-between text-stone-500 text-xs font-semibold px-1">
                    <div className="flex items-center gap-3 w-full">
                      <span className="flex items-center gap-1 shrink-0">
                        <Eye className="w-4 h-4 text-stone-400" />
                        {p.views} xem
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Heart className="w-4 h-4 text-rose-400 fill-rose-50" />
                        {p.likes} thích
                      </span>
                      <span className="text-emerald-600 ml-auto flex items-center gap-1 shrink-0 border border-emerald-100 bg-emerald-50 px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider font-bold">
                        Đang đàm phán: 1
                      </span>
                    </div>
                  </div>

                  {/* Operations column */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full justify-between pt-1">
                    {/* Status pills selector */}
                    <div className="flex flex-1 gap-1 p-1 bg-stone-50 border border-stone-200 rounded-xl overflow-x-auto hide-scrollbar">
                      {(["Đang bán", "Đang chờ", "Đã bán"] as const).map((st) => {
                        const isCurrent = p.status === st;
                        const isL = isProcessingId === p.id + "_" + st;
                        return (
                          <button
                            key={st}
                            disabled={isCurrent}
                            onClick={() => handleStatusChange(p.id, st)}
                            className={`flex-1 px-2.5 py-2 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center min-w-max ${
                              isCurrent
                                ? "bg-stone-900 text-white font-black shadow-sm"
                                : "text-stone-500 hover:bg-stone-200 hover:text-stone-800 disabled:opacity-50"
                            }`}
                          >
                            {isL ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            {st}
                          </button>
                        );
                      })}
                    </div>

                    {/* Deletion button option */}
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={isDeleting}
                      className="p-3 bg-white shrink-0 rounded-xl border border-stone-200 hover:bg-red-50 text-stone-400 hover:text-red-600 hover:border-red-200 transition cursor-pointer disabled:opacity-50 min-h-[44px]"
                      title="Gỡ tin đăng"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
