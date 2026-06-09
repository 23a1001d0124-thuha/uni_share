import React, { useState } from "react";
import { CreditCard, ShoppingBag, MapPin, Sparkles, CheckCircle2, ChevronRight, Trash2, ClipboardCheck, Tag } from "lucide-react";
import { Product, SellerRating } from "../types";
import RatingModal from "./RatingModal";

interface CheckoutWizardProps {
  cart: Product[];
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  isStudentVerified: boolean;
  onPostMessageMock: (roomId: string, text: string) => Promise<void>;
  onSubmitNewTransactionNotice: (pId: string) => Promise<void>;
}

export default function CheckoutWizard({
  cart,
  onRemoveFromCart,
  onClearCart,
  isStudentVerified,
  onPostMessageMock,
  onSubmitNewTransactionNotice
}: CheckoutWizardProps) {
  const [step, setStep] = useState<"cart" | "shipping" | "payment" | "complete">("cart");

  // Rating Modal States
  const [showRating, setShowRating] = useState(false);
  const [ratedProduct, setRatedProduct] = useState<{name: string, seller: string, productId: string} | null>(null);

  // State calculations
  const [shippingAddress, setShippingAddress] = useState("Ký túc xá Đại học Mở Hà Nội (Nguyễn Hiền), Bách Khoa, Hai Bà Trưng");
  const [paymentMethod, setPaymentMethod] = useState<"studentpay" | "momo" | "cod">("studentpay");
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);

  // Seller rating states
  const [isRatingSubmitted, setIsRatingSubmitted] = useState(false);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  // Addresses defaults
  const PRESET_DORMS = [
    "Ký túc xá Đại học Mở Hà Nội (Nguyễn Hiền), Bách Khoa, Hai Bà Trưng",
    "Khu đô thị Ký túc xá Mỹ Đình II (Hàm Nghi), Nam Từ Liêm",
    "Ký túc xá Đại học Bách Khoa (Tạ Quang Bửu), Đồng Tâm",
    "Ký túc xá Đại học Ngoại Ngữ ULIS (Phạm Văn Đồng), Cầu Giấy"
  ];

  const subtotal = cart.reduce((sum, p) => sum + p.price, 0);
  // StudentPay 10% discount if verified student combined
  const studentDiscount = isStudentVerified ? Math.floor(subtotal * 0.15) : 0;
  const deliveryFee = subtotal > 0 ? 12000 : 0; // Local school delivery
  const total = Math.max(0, subtotal - studentDiscount - appliedDiscount + deliveryFee);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    // Matches and parses the Match coupon code from Tinder Match success
    if (couponCode.toUpperCase().includes("MATCH")) {
      setAppliedDiscount(20000);
      setIsCouponApplied(true);
    } else if (couponCode.toUpperCase() === "UNIPAY") {
      setAppliedDiscount(15000);
      setIsCouponApplied(true);
    } else {
      alert("Mã giảm giá không chính xác hoặc đã hết hạn!");
    }
  };

  const handleOrderCompletion = async () => {
    if (cart.length > 0) {
      setRatedProduct({
        name: cart[0].name,
        seller: cart[0].author,
        productId: cart[0].id
      });
    }

    setStep("complete");
    // Pushes status modification to products, marking sold
    for (const p of cart) {
      try {
        await onSubmitNewTransactionNotice(p.id);
      } catch (e) {
        console.error(e);
      }
    }

    if (cart.length > 0) {
      setShowRating(true);
    }
  };

  const handleRatingSubmit = (score: number, comment: string) => {
    if (!ratedProduct) return;
    const newRating: SellerRating = {
      productId: ratedProduct.productId,
      sellerName: ratedProduct.seller,
      score: score as 1 | 2 | 3 | 4 | 5,
      comment: comment,
      createdAt: new Date().toISOString()
    };

    const existingRatingsStr = localStorage.getItem("uni_ratings");
    const existingRatings: SellerRating[] = existingRatingsStr ? JSON.parse(existingRatingsStr) : [];
    existingRatings.push(newRating);
    localStorage.setItem("uni_ratings", JSON.stringify(existingRatings));

    window.dispatchEvent(new Event("uni_ratings_updated"));

    setIsRatingSubmitted(true);
    setShowRating(false);
  };

  const handleFinishWizard = () => {
    onClearCart();
    setStep("cart");
    setCouponCode("");
    setAppliedDiscount(0);
    setIsCouponApplied(false);
    setIsRatingSubmitted(false);
  };

  if (cart.length === 0 && step !== "complete") {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-2xl py-12 p-6 text-center" id="checkout-wizard">
        <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3 animate-pulse" />
        <h4 className="text-stone-700 font-semibold text-base">Giỏ hàng của bạn đang trống</h4>
        <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto">
          Hãy dạo quanh mục "Chợ Đồ Cũ" hoặc lướt "Tinder Match" để chọn món sản phẩm yêu thích và bắt đầu tất toán giao dịch an toàn.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="checkout-wizard">
      {/* 1. Step indicators navbar */}
      <div className="flex items-center justify-between bg-white border border-stone-200 rounded-2xl p-4 text-xs font-semibold select-none shadow-2xs">
        <span className={`flex items-center gap-1.5 ${step === "cart" ? "text-rose-600 font-bold" : "text-stone-400"}`}>
          Giỏ hàng ({cart.length})
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
        <span className={`flex items-center gap-1.5 ${step === "shipping" ? "text-rose-600 font-bold" : "text-stone-400"}`}>
          Địa chỉ giao nhận
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
        <span className={`flex items-center gap-1.5 ${step === "payment" ? "text-rose-600 font-bold" : "text-stone-400"}`}>
          Thanh toán
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: ACTIVE STEP WRAPPERS */}
        <div className="md:col-span-8 bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          
          {/* STEP A: SHOPPING CART */}
          {step === "cart" && (
            <div className="space-y-4">
              <h3 className="font-bold text-stone-900 text-sm font-display uppercase tracking-wider block border-b pb-2">Hạng Mục Trong Giỏ</h3>
              <div className="space-y-3">
                {cart.map((p) => (
                  <div key={p.id} className="flex justify-between items-center gap-4 border-b pb-3 border-stone-100 last:border-none">
                    <div className="flex items-center gap-3">
                      <img src={p.images[0]} alt={p.name} className="w-12 h-12 object-cover rounded-xl border" referrerPolicy="no-referrer" />
                      <div>
                        <h4 className="font-bold text-stone-850 text-xs line-clamp-1">{p.name}</h4>
                        <span className="text-[11px] text-stone-500 font-medium block">{p.school} • {p.condition}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-bold text-rose-600 text-xs">
                        {p.price.toLocaleString("vi-VN")}đ
                      </span>
                      <button
                        onClick={() => onRemoveFromCart(p.id)}
                        className="text-stone-400 hover:text-red-600 transition p-1.5 rounded-lg border border-transparent hover:border-stone-150 cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setStep("shipping")}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2 px-5 font-bold text-xs cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  Xác nhận địa chỉ
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP B: SHIPPING SELECTORS */}
          {step === "shipping" && (
            <div className="space-y-4">
              <h3 className="font-bold text-stone-900 text-sm font-display uppercase tracking-wider block border-b pb-2">Lựa Chọn Địa Chỉ Giao Nhận</h3>
              
              <p className="text-xs text-stone-500">Vì là giao lưu nội khu trường học để đảm bảo tin cậy, bạn có thể chọn phòng ký túc xá của mình hoặc sảnh chính dưới đây:</p>
              
              <div className="space-y-2.5">
                {PRESET_DORMS.map((dorm) => {
                  const isPresetActive = shippingAddress === dorm;
                  return (
                    <button
                      key={dorm}
                      onClick={() => setShippingAddress(dorm)}
                      className={`w-full text-left p-3 rounded-xl border text-xs leading-relaxed transition cursor-pointer flex gap-2.5 items-start ${
                        isPresetActive ? "bg-rose-50 border-rose-300 text-rose-950 font-semibold" : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <MapPin className="w-4 h-4 shrink-0 text-rose-500" />
                      {dorm}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 block uppercase">HOẶC ĐIỀN ĐỊA CHỈ KHÁC:</label>
                <input
                  type="text"
                  placeholder="Ghi rõ phòng Ký túc xá hoặc sảnh..."
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-200 bg-stone-50 rounded-xl"
                />
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep("cart")}
                  className="bg-white border border-stone-300 text-stone-600 text-xs font-bold py-2 px-4 rounded-xl hover:bg-stone-50 cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => setStep("payment")}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2 px-5 font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  Chọn thanh toán
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP C: PAYMENT COMPLETED LINKERS */}
          {step === "payment" && (
            <div className="space-y-4">
              <h3 className="font-bold text-stone-900 text-sm font-display uppercase tracking-wider block border-b pb-2">Lựa Chọn Thanh Toán</h3>

              <div className="space-y-3">
                {/* 1. StudentPay Wallet linkage option */}
                <button
                  onClick={() => setPaymentMethod("studentpay")}
                  className={`w-full text-left p-4 rounded-2xl border transition cursor-pointer flex gap-4 pr-3 ${
                    paymentMethod === "studentpay" ? "bg-rose-50 border-rose-400 text-rose-950" : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "studentpay"}
                    onChange={() => setPaymentMethod("studentpay")}
                    className="w-4 h-4 mt-1 accent-rose-600"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-stone-900 block flex items-center gap-1.5 flex-wrap">
                      Thanh Toán Trực Tuyến StudentPay 
                      <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold">Giảm thêm 15%</span>
                    </span>
                    <span className="text-[11px] text-stone-500 block mt-1">Hệ thống ví số bảo mật độc quyền do nhà trường cấp sẵn 500,000 VND.</span>
                  </div>
                </button>
 
                {/* 2. MoMo wallet linkage option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("momo")}
                  className={`w-full text-left p-4 rounded-2xl border transition cursor-pointer flex gap-4 ${
                    paymentMethod === "momo" ? "bg-rose-50 border-rose-400 text-rose-950" : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "momo"}
                    onChange={() => setPaymentMethod("momo")}
                    className="w-4 h-4 mt-1 accent-rose-600"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-stone-900 block">Ví Điện Tử MoMo (Quét QR Code)</span>
                    <span className="text-[11px] text-stone-500 block mt-1">Thanh toán bằng ứng dụng MoMo nhanh, hiển thị mã QR.</span>
                  </div>
                </button>
 
                {/* 3. Cash on Delivery (COD) */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`w-full text-left p-4 rounded-2xl border transition cursor-pointer flex gap-4 ${
                    paymentMethod === "cod" ? "bg-stone-100 border-stone-400 text-stone-900" : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="w-4 h-4 mt-1 accent-rose-600"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-stone-900 block">Giao dịch tiền mặt (Mặt đối mặt)</span>
                    <span className="text-[11px] text-stone-500 block mt-1">Gặp mặt kiểm tra đồ kỹ trực tiếp rồi mới đưa tiền mặt.</span>
                  </div>
                </button>
              </div>

              {/* Momo / ZaloPay simulated QR Code block */}
              {paymentMethod === "momo" && (
                <div className="mt-4 bg-pink-50 border-2 border-pink-100 rounded-3xl p-6 text-center space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center justify-center gap-2 text-pink-600 font-black tracking-tight text-base mb-1">
                    <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center">
                      <span className="text-white text-xs">M</span>
                    </div>
                    Thanh Toán Qua MoMo
                  </div>
                  
                  <div className="bg-white p-4 rounded-2xl shadow-sm inline-block mx-auto border border-pink-100">
                    {/* Simulated QR Code using CSS Grid for a "data matrix" look */}
                    <div className="w-40 h-40 bg-stone-900 mx-auto rounded-lg grid grid-cols-4 grid-rows-4 p-2 gap-1 opacity-90">
                      <div className="bg-white rounded-tl-md"></div>
                      <div className="bg-white"></div>
                      <div className="col-span-2 bg-pink-500 rounded-tr-md"></div>
                      <div className="col-span-2 bg-white"></div>
                      <div className="bg-white"></div>
                      <div className="bg-pink-500"></div>
                      <div className="bg-white"></div>
                      <div className="col-span-2 bg-pink-500"></div>
                      <div className="bg-white rounded-br-md"></div>
                      <div className="col-span-4 bg-white opacity-80 h-4 rounded-b-sm self-end"></div>
                    </div>
                  </div>
                  
                  <div className="text-sm font-bold text-stone-700">
                    Số tiền: <span className="text-pink-600 text-lg">{total.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <p className="text-xs text-stone-500">Mở ứng dụng MoMo trên điện thoại và quét mã QR trên báo</p>
                </div>
              )}

              {/* Discount Code input */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 gap-2 text-xs">
                <span className="font-bold block text-stone-700 mb-1.5 uppercase">ÁP MÃ GIẢM GIÁ GIAO DỊCH (TINDER MATCH HOẶC KHÁC):</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ví dụ: MATCH20K, UNIPAY..."
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 p-2 bg-white border rounded-lg text-xs outline-none focus:border-rose-400"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    type="button"
                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4 py-1.5 font-bold transition cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>
                {isCouponApplied && (
                  <span className="text-emerald-700 font-semibold block mt-1 animate-pulse">
                    ✓ Áp mã giảm giá thành công! Đã giảm -{appliedDiscount.toLocaleString()}đ vào hóa đơn.
                  </span>
                )}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep("shipping")}
                  className="bg-white border border-stone-300 text-stone-600 text-xs font-bold py-2 px-4 rounded-xl hover:bg-stone-50 cursor-pointer min-h-[44px]"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleOrderCompletion}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2 px-6 font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm min-h-[44px]"
                >
                  <CreditCard className="w-4 h-4" />
                  Xác nhận đã chuyển
                </button>
              </div>
            </div>
          )}

          {/* STEP D: ORDER WORKOUT RESULTS COMPLETION SUCCESS */}
          {step === "complete" && (
            <div className="text-center py-10 space-y-5 relative overflow-hidden align-middle">
              {/* Confetti falling effects */}
              <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
                {[...Array(20)].map((_, i) => {
                  const left = `${Math.floor(Math.random() * 100)}%`;
                  const animationDelay = `${(Math.random() * 2).toFixed(1)}s`;
                  const colors = ["bg-rose-500", "bg-amber-400", "bg-sky-400", "bg-emerald-400"];
                  const randColor = colors[i % colors.length];
                  return (
                    <div
                      key={i}
                      style={{ left, animationDelay }}
                      className={`absolute -top-4 animate-bounce ${randColor} w-2.5 h-2.5 opacity-80 duration-[3000ms] ease-linear`}
                    />
                  );
                })}
              </div>

              <div className="relative z-10 space-y-4 animate-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-12 h-12 fill-emerald-600 text-emerald-100 animate-pulse" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-extrabold text-stone-900 font-display">Giao Dịch Thành Công! 🎉</h3>
                  <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">Cảm ơn bạn đã sử dụng UNI-SHARE. Đơn hàng đang được chuẩn bị để giao cho bạn.</p>
                </div>

                <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl text-left text-xs text-stone-600 space-y-3 max-w-sm mx-auto shadow-sm">
                  <div className="flex justify-between font-extrabold text-stone-800">
                    <span>Trạng Thái:</span>
                    <span className="text-emerald-700 bg-emerald-100 px-2 rounded-full py-0.5">ĐÃ XÁC NHẬN</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="font-medium">Địa điểm bàn giao:</span>
                    <span className="font-extrabold text-stone-900 text-right line-clamp-2 w-32">{shippingAddress}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Hình thức:</span>
                    <span className="font-extrabold uppercase text-stone-900">{paymentMethod}</span>
                  </div>
                </div>

                {/* ⭐ Seller Rating Widget */}
                {isRatingSubmitted ? (
                  <div className="text-center py-4 space-y-1 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 max-w-sm mx-auto shadow-sm animate-in fade-in">
                    <p className="text-sm font-extrabold text-emerald-800 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Cảm ơn bạn đã đánh giá!
                    </p>
                    <p className="text-[11px] text-emerald-600 font-semibold leading-relaxed">
                      Đánh giá của bạn giúp cộng đồng sinh viên tin tưởng nhau hơn.
                    </p>
                  </div>
                ) : (
                  <div className="border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-5 rounded-3xl max-w-sm mx-auto shadow-[0_4px_24px_rgba(245,158,11,0.15)] text-left animate-in fade-in space-y-3">
                    <span className="text-[10px] text-amber-700 font-black tracking-wider block uppercase flex items-center gap-1.5 flex-wrap">
                      <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-spin" /> ĐÁNH GIÁ ĐỂ NHẬN ƯU ĐÃI
                    </span>
                    <p className="text-amber-900 text-[11px] font-semibold leading-relaxed">
                      Để lại bình chọn cho người bán giúp trải nghiệm mua sắm an toàn hơn cho sinh viên khác.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (cart.length > 0) {
                          setRatedProduct({
                            name: cart[0].name,
                            seller: cart[0].author,
                            productId: cart[0].id
                          });
                          setShowRating(true);
                        }
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer text-center block shadow-sm min-h-[44px]"
                    >
                      Đánh giá ngay ★
                    </button>
                  </div>
                )}

                <button
                  onClick={handleFinishWizard}
                  className="bg-stone-900 hover:bg-stone-950 text-white text-xs font-bold py-3.5 px-6 rounded-xl transition cursor-pointer w-full max-w-sm block mx-auto text-center font-sans tracking-wide min-h-[44px] shadow-sm mt-6"
                >
                  Quay lại Trang Chủ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: REUSABLE ORDER BILL RECEIPT */}
        {step !== "complete" && (
          <div className="md:col-span-4 bg-stone-100 border border-stone-300 rounded-2xl p-4 space-y-3 shadow-2xs">
            <h3 className="font-bold text-stone-900 text-xs font-display uppercase tracking-wide border-b pb-2">Tóm Tắt Hóa Đơn</h3>
            
            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Tạm tính ({cart.length} món):</span>
                <span className="font-semibold text-stone-800">{subtotal.toLocaleString("vi-VN")}đ</span>
              </div>
              
              {isStudentVerified && (
                <div className="flex justify-between text-rose-600">
                  <span className="flex items-center gap-0.5 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 fill-rose-600 text-rose-500" />
                    StudentPay Discount (-15%):
                  </span>
                  <span className="font-bold">-{studentDiscount.toLocaleString("vi-VN")}đ</span>
                </div>
              )}

              {isCouponApplied && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Mã Voucher giảm:</span>
                  <span className="font-bold">-{appliedDiscount.toLocaleString("vi-VN")}đ</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Phí ship nội khu:</span>
                <span>{deliveryFee.toLocaleString("vi-VN")}đ</span>
              </div>

              <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline font-bold text-sm text-stone-900">
                <span>Tổng chi trả:</span>
                <span className="text-base text-rose-600 font-black font-display">{total.toLocaleString("vi-VN")}đ</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {ratedProduct && (
        <RatingModal
          isOpen={showRating}
          productName={ratedProduct.name}
          sellerName={ratedProduct.seller}
          onSubmit={handleRatingSubmit}
          onSkip={() => setShowRating(false)}
        />
      )}
    </div>
  );
}
