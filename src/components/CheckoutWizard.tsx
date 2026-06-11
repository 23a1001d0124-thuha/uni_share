import React, { useState } from "react";
import {
  CreditCard,
  ShoppingBag,
  MapPin,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Trash2,
  User,
  Phone,
  AlertCircle,
  Banknote,
  ExternalLink,
  Building2,
} from "lucide-react";
import { Product, SellerRating } from "../types";
import RatingModal from "./RatingModal";

interface CheckoutWizardProps {
  cart: Product[];
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  isStudentVerified: boolean;
  currentUserId?: string;
  onPostMessageMock: (roomId: string, text: string) => Promise<void>;
  onSubmitNewTransactionNotice: (pId: string) => Promise<void>;
}

// ─── Vietnamese address data ──────────────────────────────────────────────────
const PROVINCES: Record<string, { districts: Record<string, string[]> }> = {
  "Hà Nội": {
    districts: {
      "Hai Bà Trưng": [
        "Bách Khoa",
        "Đồng Tâm",
        "Quỳnh Lôi",
        "Thanh Lương",
        "Vĩnh Tuy",
      ],
      "Cầu Giấy": [
        "Dịch Vọng",
        "Nghĩa Tân",
        "Quan Hoa",
        "Trung Hòa",
        "Yên Hòa",
      ],
      "Đống Đa": [
        "Cát Linh",
        "Khâm Thiên",
        "Kim Liên",
        "Láng Hạ",
        "Văn Chương",
      ],
      "Thanh Xuân": [
        "Hạ Đình",
        "Kim Giang",
        "Nhân Chính",
        "Phương Liệt",
        "Thanh Xuân Trung",
      ],
      "Nam Từ Liêm": [
        "Cầu Diễn",
        "Mỹ Đình I",
        "Mỹ Đình II",
        "Phú Đô",
        "Trung Văn",
      ],
      "Hoàng Mai": [
        "Hoàng Văn Thụ",
        "Linh Đàm",
        "Mai Động",
        "Tân Mai",
        "Tương Mai",
      ],
    },
  },
  "TP. Hồ Chí Minh": {
    districts: {
      "Quận 1": [
        "Bến Nghé",
        "Bến Thành",
        "Cô Giang",
        "Nguyễn Cư Trinh",
        "Phạm Ngũ Lão",
      ],
      "Quận 3": ["Phường 1", "Phường 4", "Phường 9", "Phường 12", "Võ Thị Sáu"],
      "Bình Thạnh": [
        "Phường 1",
        "Phường 6",
        "Phường 13",
        "Phường 25",
        "Phường 27",
      ],
      "Thủ Đức": [
        "Bình Thọ",
        "Hiệp Bình Chánh",
        "Linh Chiểu",
        "Tam Phú",
        "Trường Thọ",
      ],
      "Gò Vấp": ["Phường 1", "Phường 3", "Phường 7", "Phường 12", "Phường 16"],
    },
  },
  "Đà Nẵng": {
    districts: {
      "Hải Châu": [
        "Bình Hiên",
        "Hải Châu I",
        "Hải Châu II",
        "Nam Dương",
        "Phước Ninh",
      ],
      "Thanh Khê": [
        "An Khê",
        "Chính Gián",
        "Thạc Gián",
        "Tân Chính",
        "Xuân Hà",
      ],
      "Liên Chiểu": [
        "Hòa Hiệp Bắc",
        "Hòa Hiệp Nam",
        "Hòa Khánh Bắc",
        "Hòa Khánh Nam",
        "Hòa Minh",
      ],
      "Ngũ Hành Sơn": ["Hòa Hải", "Hòa Quý", "Khuê Mỹ", "Mỹ An"],
    },
  },
  "Cần Thơ": {
    districts: {
      "Ninh Kiều": ["An Bình", "An Cư", "An Hòa", "An Nghiệp", "Xuân Khánh"],
      "Bình Thủy": [
        "An Thới",
        "Bình Thủy",
        "Long Hòa",
        "Long Tuyền",
        "Thới An Đông",
      ],
    },
  },
};

const PRESET_DORMS = [
  {
    label: "KTX Đại học Mở HN – Nguyễn Hiền",
    value:
      "Ký túc xá Đại học Mở Hà Nội (Nguyễn Hiền), Bách Khoa, Hai Bà Trưng, Hà Nội",
  },
  {
    label: "KTX Mỹ Đình II – Hàm Nghi",
    value:
      "Khu đô thị Ký túc xá Mỹ Đình II (Hàm Nghi), Mỹ Đình II, Nam Từ Liêm, Hà Nội",
  },
  {
    label: "KTX Đại học Bách Khoa – Tạ Quang Bửu",
    value:
      "Ký túc xá Đại học Bách Khoa (Tạ Quang Bửu), Đồng Tâm, Hai Bà Trưng, Hà Nội",
  },
  {
    label: "KTX ULIS – Phạm Văn Đồng",
    value:
      "Ký túc xá Đại học Ngoại Ngữ ULIS (Phạm Văn Đồng), Dịch Vọng, Cầu Giấy, Hà Nội",
  },
];

// ─── Address validation ───────────────────────────────────────────────────────
interface AddressForm {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  note: string;
}

const emptyAddress = (): AddressForm => ({
  fullName: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  street: "",
  note: "",
});

function validateAddress(form: AddressForm): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.fullName.trim() || form.fullName.trim().length < 3)
    errs.fullName = "Vui lòng nhập họ tên đầy đủ (ít nhất 3 ký tự)";
  if (!/^(0|\+84)[0-9]{8,10}$/.test(form.phone.replace(/\s/g, "")))
    errs.phone = "Số điện thoại không hợp lệ (VD: 0912345678)";
  if (!form.province) errs.province = "Vui lòng chọn tỉnh / thành phố";
  if (!form.district) errs.district = "Vui lòng chọn quận / huyện";
  if (!form.ward) errs.ward = "Vui lòng chọn phường / xã";
  if (!form.street.trim() || form.street.trim().length < 5)
    errs.street = "Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường...)";
  return errs;
}

function buildFullAddress(form: AddressForm): string {
  return [form.street, form.ward, form.district, form.province]
    .filter(Boolean)
    .join(", ");
}

// ─── VNPAY helper (mock URL builder) ─────────────────────────────────────────
// Gọi server để tạo URL có chữ ký HMAC-SHA512 hợp lệ
async function buildVnpayUrl(amount: number, orderId: string): Promise<string> {
  const res = await fetch("/api/payment/vnpay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, orderId }),
  });
  if (!res.ok) throw new Error("Không thể tạo đường dẫn thanh toán VNPAY");
  const data = await res.json();
  if (!data.paymentUrl) throw new Error(data.error || "Lỗi tạo link VNPAY");
  return data.paymentUrl;
}

// ─── Component ────────────────────────────────────────────────────────────────
type PaymentMethod = "studentpay" | "vnpay" | "cod";

export default function CheckoutWizard({
  cart,
  onRemoveFromCart,
  onClearCart,
  isStudentVerified,
  currentUserId,
  onPostMessageMock,
  onSubmitNewTransactionNotice,
}: CheckoutWizardProps) {
  const [step, setStep] = useState<
    "cart" | "shipping" | "payment" | "complete"
  >("cart");

  // Address state
  const [addrMode, setAddrMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState<string>(
    PRESET_DORMS[0].value,
  );
  const [addrForm, setAddrForm] = useState<AddressForm>(emptyAddress());
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});
  const [addrTouched, setAddrTouched] = useState<Record<string, boolean>>({});

  // Payment state
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("studentpay");
  const [vnpayRedirected, setVnpayRedirected] = useState(false);
  const orderId = React.useRef(`ORD-${Date.now()}`);

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);

  // Rating
  const [showRating, setShowRating] = useState(false);
  const [ratedProduct, setRatedProduct] = useState<{
    name: string;
    seller: string;
    productId: string;
  } | null>(null);
  const [isRatingSubmitted, setIsRatingSubmitted] = useState(false);

  // Derived
  const subtotal = cart.reduce((sum, p) => sum + p.price, 0);
  const studentDiscount =
    isStudentVerified && paymentMethod === "studentpay"
      ? Math.floor(subtotal * 0.15)
      : 0;
  const deliveryFee = subtotal > 0 ? 12000 : 0;
  const total = Math.max(
    0,
    subtotal - studentDiscount - appliedDiscount + deliveryFee,
  );

  const shippingAddress =
    addrMode === "preset"
      ? selectedPreset
      : addrForm.province
        ? buildFullAddress(addrForm)
        : "";

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleFieldChange = (field: keyof AddressForm, value: string) => {
    setAddrForm((prev) => {
      const next = { ...prev, [field]: value };
      // Reset dependent selects
      if (field === "province") {
        next.district = "";
        next.ward = "";
      }
      if (field === "district") {
        next.ward = "";
      }
      return next;
    });
    setAddrTouched((prev) => ({ ...prev, [field]: true }));
    setAddrErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleBlur = (field: keyof AddressForm) => {
    setAddrTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validateAddress(addrForm);
    setAddrErrors((prev) => ({ ...prev, [field]: errs[field] || "" }));
  };

  const handleConfirmAddress = () => {
    if (addrMode === "preset") {
      setStep("payment");
      return;
    }
    const errs = validateAddress(addrForm);
    setAddrErrors(errs);
    setAddrTouched({
      fullName: true,
      phone: true,
      province: true,
      district: true,
      ward: true,
      street: true,
      note: true,
    });
    if (Object.keys(errs).length === 0) setStep("payment");
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
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

  const handleVnpayPay = async () => {
    try {
      const url = await buildVnpayUrl(total, orderId.current);
      setVnpayRedirected(true);
      window.open(url, "_blank");
    } catch (err: any) {
      alert(
        err.message ||
          "Không thể kết nối cổng thanh toán VNPAY. Vui lòng thử lại!",
      );
    }
  };

  const handleOrderCompletion = async () => {
    // Guard: prevent buying your own listing(s)
    const selfItems = currentUserId
      ? cart.filter((p) => p.authorId && p.authorId === currentUserId)
      : [];

    if (selfItems.length > 0) {
      alert("Bạn không thể mua sản phẩm do chính mình đăng bán!");
      return;
    }

    if (cart.length > 0) {
      setRatedProduct({
        name: cart[0].name,
        seller: cart[0].author,
        productId: cart[0].id,
      });
    }

    setStep("complete");
    for (const p of cart) {
      try {
        await onSubmitNewTransactionNotice(p.id);
      } catch (e) {
        console.error(e);
      }
    }
    if (cart.length > 0) setShowRating(true);
  };

  const handleRatingSubmit = (score: number, comment: string) => {
    if (!ratedProduct) return;
    const newRating: SellerRating = {
      productId: ratedProduct.productId,
      sellerName: ratedProduct.seller,
      score: score as 1 | 2 | 3 | 4 | 5,
      comment,
      createdAt: new Date().toISOString(),
    };
    const existing: SellerRating[] = JSON.parse(
      localStorage.getItem("uni_ratings") || "[]",
    );
    existing.push(newRating);
    localStorage.setItem("uni_ratings", JSON.stringify(existing));
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
    setVnpayRedirected(false);
    setAddrForm(emptyAddress());
    setAddrErrors({});
    setAddrTouched({});
    setAddrMode("preset");
    setSelectedPreset(PRESET_DORMS[0].value);
    orderId.current = `ORD-${Date.now()}`;
  };

  // ── Empty cart ───────────────────────────────────────────────────────────────
  if (cart.length === 0 && step !== "complete") {
    return (
      <div
        className="bg-stone-50 border border-stone-200 rounded-2xl py-12 p-6 text-center"
        id="checkout-wizard"
      >
        <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3 animate-pulse" />
        <h4 className="text-stone-700 font-semibold text-base">
          Giỏ hàng của bạn đang trống
        </h4>
        <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto">
          Hãy dạo quanh mục "Chợ Đồ Cũ" hoặc lướt "Tinder Match" để chọn món sản
          phẩm yêu thích.
        </p>
      </div>
    );
  }

  // ── districts & wards derived from form ─────────────────────────────────────
  const districts = addrForm.province
    ? Object.keys(PROVINCES[addrForm.province]?.districts ?? {})
    : [];
  const wards =
    addrForm.province && addrForm.district
      ? (PROVINCES[addrForm.province]?.districts[addrForm.district] ?? [])
      : [];

  const FieldError = ({ field }: { field: keyof AddressForm }) =>
    addrTouched[field] && addrErrors[field] ? (
      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {addrErrors[field]}
      </p>
    ) : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6" id="checkout-wizard">
      {/* Step indicators */}
      <div className="flex items-center justify-between bg-white border border-stone-200 rounded-2xl p-4 text-xs font-semibold select-none shadow-2xs">
        {(["cart", "shipping", "payment"] as const).map((s, idx) => {
          const labels = ["Giỏ hàng", "Địa chỉ", "Thanh toán"];
          const active = step === s;
          const done =
            ["cart", "shipping", "payment", "complete"].indexOf(step) > idx;
          return (
            <React.Fragment key={s}>
              <span
                className={`flex items-center gap-1.5 ${active ? "text-rose-600 font-bold" : done ? "text-emerald-600" : "text-stone-400"}`}
              >
                {done && !active ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : null}
                {labels[idx]} {s === "cart" ? `(${cart.length})` : ""}
              </span>
              {idx < 2 && (
                <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN ─────────────────────────────────────────────────────── */}
        <div className="md:col-span-8 bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          {/* ── STEP A: CART ─────────────────────────────────────────────────── */}
          {step === "cart" && (
            <div className="space-y-4">
              <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider border-b pb-2">
                Hạng Mục Trong Giỏ
              </h3>
              <div className="space-y-3">
                {cart.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center gap-4 border-b pb-3 border-stone-100 last:border-none"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-12 h-12 object-cover rounded-xl border"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="font-bold text-stone-850 text-xs line-clamp-1">
                          {p.name}
                        </h4>
                        <span className="text-[11px] text-stone-500 font-medium block">
                          {p.school} • {p.condition}
                        </span>
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
                  Xác nhận địa chỉ <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP B: SHIPPING (REDESIGNED) ────────────────────────────────── */}
          {step === "shipping" && (
            <div className="space-y-5">
              <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider border-b pb-2">
                Xác Nhận Địa Chỉ Giao Nhận
              </h3>

              {/* Mode switcher */}
              <div className="flex gap-2 p-1 bg-stone-100 rounded-xl">
                <button
                  onClick={() => setAddrMode("preset")}
                  className={`flex-1 text-xs font-bold py-2 rounded-lg transition cursor-pointer ${addrMode === "preset" ? "bg-white text-rose-600 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
                >
                  📍 Ký túc xá / Trường học
                </button>
                <button
                  onClick={() => setAddrMode("custom")}
                  className={`flex-1 text-xs font-bold py-2 rounded-lg transition cursor-pointer ${addrMode === "custom" ? "bg-white text-rose-600 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
                >
                  🏠 Địa chỉ khác
                </button>
              </div>

              {/* PRESET MODE */}
              {addrMode === "preset" && (
                <div className="space-y-2.5">
                  <p className="text-xs text-stone-500">
                    Chọn ký túc xá / sảnh trường để giao nhận an toàn trong khu
                    vực học xá:
                  </p>
                  {PRESET_DORMS.map((dorm) => (
                    <button
                      key={dorm.value}
                      onClick={() => setSelectedPreset(dorm.value)}
                      className={`w-full text-left p-3 rounded-xl border text-xs leading-relaxed transition cursor-pointer flex gap-2.5 items-start ${
                        selectedPreset === dorm.value
                          ? "bg-rose-50 border-rose-300 text-rose-950 font-semibold"
                          : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <MapPin className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      <div>
                        <span className="font-bold block">{dorm.label}</span>
                        <span className="text-stone-500 text-[11px]">
                          {dorm.value}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* CUSTOM MODE */}
              {addrMode === "custom" && (
                <div className="space-y-3">
                  {/* Tên người nhận */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase flex items-center gap-1 mb-1">
                      <User className="w-3 h-3" /> Họ và tên người nhận{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={addrForm.fullName}
                      onChange={(e) =>
                        handleFieldChange("fullName", e.target.value)
                      }
                      onBlur={() => handleBlur("fullName")}
                      className={`w-full text-xs p-2.5 border rounded-xl outline-none transition ${
                        addrTouched.fullName && addrErrors.fullName
                          ? "border-red-400 bg-red-50"
                          : "border-stone-200 bg-stone-50 focus:border-rose-400"
                      }`}
                    />
                    <FieldError field="fullName" />
                  </div>

                  {/* Số điện thoại */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase flex items-center gap-1 mb-1">
                      <Phone className="w-3 h-3" /> Số điện thoại{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="0912 345 678"
                      value={addrForm.phone}
                      onChange={(e) =>
                        handleFieldChange("phone", e.target.value)
                      }
                      onBlur={() => handleBlur("phone")}
                      className={`w-full text-xs p-2.5 border rounded-xl outline-none transition ${
                        addrTouched.phone && addrErrors.phone
                          ? "border-red-400 bg-red-50"
                          : "border-stone-200 bg-stone-50 focus:border-rose-400"
                      }`}
                    />
                    <FieldError field="phone" />
                  </div>

                  {/* Tỉnh / Thành phố */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase flex items-center gap-1 mb-1">
                      <Building2 className="w-3 h-3" /> Tỉnh / Thành phố{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={addrForm.province}
                      onChange={(e) =>
                        handleFieldChange("province", e.target.value)
                      }
                      onBlur={() => handleBlur("province")}
                      className={`w-full text-xs p-2.5 border rounded-xl outline-none transition bg-stone-50 cursor-pointer ${
                        addrTouched.province && addrErrors.province
                          ? "border-red-400 bg-red-50"
                          : "border-stone-200 focus:border-rose-400"
                      }`}
                    >
                      <option value="">-- Chọn tỉnh / thành phố --</option>
                      {Object.keys(PROVINCES).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <FieldError field="province" />
                  </div>

                  {/* Quận / Huyện */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase mb-1 block">
                      Quận / Huyện <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={addrForm.district}
                      onChange={(e) =>
                        handleFieldChange("district", e.target.value)
                      }
                      onBlur={() => handleBlur("district")}
                      disabled={!addrForm.province}
                      className={`w-full text-xs p-2.5 border rounded-xl outline-none transition cursor-pointer ${
                        !addrForm.province
                          ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                          : addrTouched.district && addrErrors.district
                            ? "border-red-400 bg-red-50"
                            : "border-stone-200 bg-stone-50 focus:border-rose-400"
                      }`}
                    >
                      <option value="">-- Chọn quận / huyện --</option>
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <FieldError field="district" />
                  </div>

                  {/* Phường / Xã */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase mb-1 block">
                      Phường / Xã <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={addrForm.ward}
                      onChange={(e) =>
                        handleFieldChange("ward", e.target.value)
                      }
                      onBlur={() => handleBlur("ward")}
                      disabled={!addrForm.district}
                      className={`w-full text-xs p-2.5 border rounded-xl outline-none transition cursor-pointer ${
                        !addrForm.district
                          ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                          : addrTouched.ward && addrErrors.ward
                            ? "border-red-400 bg-red-50"
                            : "border-stone-200 bg-stone-50 focus:border-rose-400"
                      }`}
                    >
                      <option value="">-- Chọn phường / xã --</option>
                      {wards.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                    <FieldError field="ward" />
                  </div>

                  {/* Địa chỉ cụ thể */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase mb-1 block">
                      Số nhà, tên đường <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 12 Nguyễn Hiền, phòng A205..."
                      value={addrForm.street}
                      onChange={(e) =>
                        handleFieldChange("street", e.target.value)
                      }
                      onBlur={() => handleBlur("street")}
                      className={`w-full text-xs p-2.5 border rounded-xl outline-none transition ${
                        addrTouched.street && addrErrors.street
                          ? "border-red-400 bg-red-50"
                          : "border-stone-200 bg-stone-50 focus:border-rose-400"
                      }`}
                    />
                    <FieldError field="street" />
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase mb-1 block">
                      Ghi chú thêm (tùy chọn)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Giao trước 17h, gọi trước khi đến..."
                      value={addrForm.note}
                      onChange={(e) =>
                        handleFieldChange("note", e.target.value)
                      }
                      className="w-full text-xs p-2.5 border border-stone-200 bg-stone-50 rounded-xl outline-none focus:border-rose-400"
                    />
                  </div>

                  {/* Preview */}
                  {shippingAddress && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2 items-start">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-rose-700 uppercase mb-0.5">
                          Địa chỉ giao nhận
                        </p>
                        <p className="text-xs text-rose-900 font-semibold">
                          {shippingAddress}
                        </p>
                        {addrForm.fullName && (
                          <p className="text-[11px] text-rose-700 mt-0.5">
                            {addrForm.fullName} · {addrForm.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-between">
                <button
                  onClick={() => setStep("cart")}
                  className="bg-white border border-stone-300 text-stone-600 text-xs font-bold py-2 px-4 rounded-xl hover:bg-stone-50 cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleConfirmAddress}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2 px-5 font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  Chọn thanh toán <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP C: PAYMENT ──────────────────────────────────────────────── */}
          {step === "payment" && (
            <div className="space-y-4">
              <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider border-b pb-2">
                Lựa Chọn Thanh Toán
              </h3>

              {/* Address summary */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex gap-2 items-start text-xs">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-700 mb-0.5">Giao đến:</p>
                  <p className="text-stone-600 leading-relaxed">
                    {shippingAddress}
                  </p>
                  {addrMode === "custom" && addrForm.fullName && (
                    <p className="text-stone-500 mt-0.5">
                      {addrForm.fullName} · {addrForm.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {/* 1. StudentPay */}
                <button
                  onClick={() => setPaymentMethod("studentpay")}
                  className={`w-full text-left p-4 rounded-2xl border transition cursor-pointer flex gap-4 ${
                    paymentMethod === "studentpay"
                      ? "bg-rose-50 border-rose-400 text-rose-950"
                      : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "studentpay"}
                    onChange={() => setPaymentMethod("studentpay")}
                    className="w-4 h-4 mt-1 accent-rose-600"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-stone-900 flex items-center gap-1.5 flex-wrap">
                      Thanh Toán Trực Tuyến StudentPay
                      <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                        Giảm thêm 15%
                      </span>
                    </span>
                    <span className="text-[11px] text-stone-500 block mt-1">
                      Hệ thống ví số bảo mật độc quyền do nhà trường cấp sẵn
                      500,000 VND.
                    </span>
                  </div>
                </button>

                {/* 2. VNPay */}
                <button
                  onClick={() => setPaymentMethod("vnpay")}
                  className={`w-full text-left p-4 rounded-2xl border transition cursor-pointer flex gap-4 ${
                    paymentMethod === "vnpay"
                      ? "bg-blue-50 border-blue-400 text-blue-950"
                      : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "vnpay"}
                    onChange={() => setPaymentMethod("vnpay")}
                    className="w-4 h-4 mt-1 accent-blue-600"
                  />
                  <div className="text-xs flex-1">
                    <span className="font-bold text-stone-900 flex items-center gap-2 flex-wrap">
                      <span className="bg-blue-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md tracking-wide">
                        VNPay
                      </span>
                      Cổng Thanh Toán VNPay
                    </span>
                    <span className="text-[11px] text-stone-500 block mt-1">
                      Thanh toán qua ATM nội địa, Visa/Mastercard, QR Code ngân
                      hàng. Bảo mật chuẩn PCI DSS.
                    </span>
                  </div>
                </button>

                {/* 3. COD */}
                <button
                  onClick={() => setPaymentMethod("cod")}
                  className={`w-full text-left p-4 rounded-2xl border transition cursor-pointer flex gap-4 ${
                    paymentMethod === "cod"
                      ? "bg-amber-50 border-amber-400 text-amber-950"
                      : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="w-4 h-4 mt-1 accent-amber-600"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-stone-900 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-amber-600" />
                      Thanh Toán Khi Nhận Hàng (COD)
                    </span>
                    <span className="text-[11px] text-stone-500 block mt-1">
                      Gặp mặt trực tiếp kiểm tra hàng hoá kỹ, đồng ý rồi mới trả
                      tiền mặt. An toàn 100%.
                    </span>
                  </div>
                </button>
              </div>

              {/* VNPay action block */}
              {paymentMethod === "vnpay" && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-2 text-blue-700 font-black text-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-black">
                        VN
                      </span>
                    </div>
                    Thanh Toán Qua VNPay
                  </div>
                  <div className="text-xs text-blue-800 space-y-1.5">
                    <p className="font-semibold">
                      Số tiền cần thanh toán:{" "}
                      <span className="text-blue-600 font-black text-sm">
                        {total.toLocaleString("vi-VN")}đ
                      </span>
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Nhấn nút bên dưới để chuyển sang cổng thanh toán VNPay.
                      Sau khi thanh toán thành công, bạn sẽ được chuyển về để
                      xác nhận đơn hàng.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-stone-600 pt-1">
                    {[
                      "ATM / Internet Banking",
                      "Visa / Mastercard / JCB",
                      "QR Code ngân hàng",
                    ].map((m) => (
                      <div
                        key={m}
                        className="bg-white border border-blue-100 rounded-lg p-2 text-center font-semibold text-stone-700 leading-tight"
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                  {!vnpayRedirected ? (
                    <button
                      onClick={handleVnpayPay}
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 min-h-[44px] shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Thanh toán qua VNPay ngay
                    </button>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Đã mở cổng VNPay. Sau khi thanh toán xong, nhấn "Xác nhận
                      đơn hàng" bên dưới.
                    </div>
                  )}
                </div>
              )}

              {/* COD instruction block */}
              {paymentMethod === "cod" && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-2 text-amber-700 font-black text-sm">
                    <Banknote className="w-6 h-6 text-amber-600" />
                    Hướng Dẫn Thanh Toán COD
                  </div>
                  <ol className="space-y-2 text-xs text-stone-700">
                    {[
                      "Người bán sẽ liên hệ bạn để xác nhận thời gian và địa điểm giao hàng.",
                      "Kiểm tra kỹ tình trạng hàng hoá trước khi nhận.",
                      "Thanh toán tiền mặt trực tiếp cho người bán sau khi hài lòng với hàng.",
                      "Hai bên xác nhận giao dịch hoàn tất trên ứng dụng.",
                    ].map((step, i) => (
                      <li key={i} className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="bg-white border border-amber-200 rounded-xl p-3 text-xs font-semibold text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    Không trả tiền trước khi đã kiểm tra và hài lòng với hàng.
                    Giao dịch trong khu vực trường học để đảm bảo an toàn.
                  </div>
                </div>
              )}

              {/* Coupon */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 gap-2 text-xs">
                <span className="font-bold block text-stone-700 mb-1.5 uppercase">
                  Áp Mã Giảm Giá:
                </span>
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
                  <span className="text-emerald-700 font-semibold block mt-1">
                    ✓ Áp mã giảm giá thành công! Đã giảm -
                    {appliedDiscount.toLocaleString()}đ.
                  </span>
                )}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  onClick={() => setStep("shipping")}
                  className="bg-white border border-stone-300 text-stone-600 text-xs font-bold py-2 px-4 rounded-xl hover:bg-stone-50 cursor-pointer min-h-[44px]"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleOrderCompletion}
                  disabled={paymentMethod === "vnpay" && !vnpayRedirected}
                  className={`rounded-xl py-2 px-6 font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm min-h-[44px] transition ${
                    paymentMethod === "vnpay" && !vnpayRedirected
                      ? "bg-stone-300 text-stone-500 cursor-not-allowed"
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  {paymentMethod === "cod"
                    ? "Đặt Hàng COD"
                    : paymentMethod === "vnpay"
                      ? "Xác Nhận Đơn Hàng"
                      : "Xác Nhận Đã Thanh Toán"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP D: COMPLETE ─────────────────────────────────────────────── */}
          {step === "complete" && (
            <div className="text-center py-10 space-y-5 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
                {[...Array(20)].map((_, i) => {
                  const left = `${Math.floor(Math.random() * 100)}%`;
                  const animationDelay = `${(Math.random() * 2).toFixed(1)}s`;
                  const colors = [
                    "bg-rose-500",
                    "bg-amber-400",
                    "bg-sky-400",
                    "bg-emerald-400",
                  ];
                  return (
                    <div
                      key={i}
                      style={{ left, animationDelay }}
                      className={`absolute -top-4 animate-bounce ${colors[i % colors.length]} w-2.5 h-2.5 opacity-80 duration-[3000ms] ease-linear`}
                    />
                  );
                })}
              </div>
              <div className="relative z-10 space-y-4 animate-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-12 h-12 fill-emerald-600 text-emerald-100 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-stone-900">
                    Giao Dịch Thành Công! 🎉
                  </h3>
                  <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">
                    Cảm ơn bạn đã sử dụng UNI-SHARE. Đơn hàng đang được chuẩn
                    bị.
                  </p>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl text-left text-xs text-stone-600 space-y-3 max-w-sm mx-auto shadow-sm">
                  <div className="flex justify-between font-extrabold text-stone-800">
                    <span>Trạng Thái:</span>
                    <span className="text-emerald-700 bg-emerald-100 px-2 rounded-full py-0.5">
                      ĐÃ XÁC NHẬN
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="font-medium shrink-0">Địa điểm:</span>
                    <span className="font-extrabold text-stone-900 text-right">
                      {shippingAddress}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Thanh toán:</span>
                    <span className="font-extrabold uppercase text-stone-900">
                      {paymentMethod === "cod"
                        ? "💵 Tiền mặt (COD)"
                        : paymentMethod === "vnpay"
                          ? "🏦 VNPay"
                          : "🎓 StudentPay"}
                    </span>
                  </div>
                  {addrMode === "custom" && addrForm.fullName && (
                    <div className="flex justify-between font-medium">
                      <span>Người nhận:</span>
                      <span className="font-extrabold text-stone-900">
                        {addrForm.fullName} · {addrForm.phone}
                      </span>
                    </div>
                  )}
                </div>

                {isRatingSubmitted ? (
                  <div className="text-center py-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 max-w-sm mx-auto">
                    <p className="text-sm font-extrabold text-emerald-800 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Cảm ơn bạn đã đánh
                      giá!
                    </p>
                  </div>
                ) : (
                  <div className="border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-5 rounded-3xl max-w-sm mx-auto text-left space-y-3">
                    <span className="text-[10px] text-amber-700 font-black tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-spin" />{" "}
                      ĐÁNH GIÁ ĐỂ NHẬN ƯU ĐÃI
                    </span>
                    <p className="text-amber-900 text-[11px] font-semibold leading-relaxed">
                      Để lại bình chọn cho người bán giúp trải nghiệm mua sắm an
                      toàn hơn.
                    </p>
                    <button
                      onClick={() => {
                        if (cart.length > 0) {
                          setRatedProduct({
                            name: cart[0].name,
                            seller: cart[0].author,
                            productId: cart[0].id,
                          });
                          setShowRating(true);
                        }
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer min-h-[44px]"
                    >
                      Đánh giá ngay ★
                    </button>
                  </div>
                )}

                <button
                  onClick={handleFinishWizard}
                  className="bg-stone-900 hover:bg-stone-950 text-white text-xs font-bold py-3.5 px-6 rounded-xl transition cursor-pointer w-full max-w-sm block mx-auto min-h-[44px] shadow-sm mt-6"
                >
                  Quay lại Trang Chủ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: ORDER SUMMARY ─────────────────────────────────────── */}
        {step !== "complete" && (
          <div className="md:col-span-4 bg-stone-100 border border-stone-300 rounded-2xl p-4 space-y-3 shadow-2xs">
            <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wide border-b pb-2">
              Tóm Tắt Hóa Đơn
            </h3>
            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Tạm tính ({cart.length} món):</span>
                <span className="font-semibold text-stone-800">
                  {subtotal.toLocaleString("vi-VN")}đ
                </span>
              </div>
              {isStudentVerified && paymentMethod === "studentpay" && (
                <div className="flex justify-between text-rose-600">
                  <span className="flex items-center gap-0.5 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 fill-rose-600 text-rose-500" />{" "}
                    StudentPay (-15%):
                  </span>
                  <span className="font-bold">
                    -{studentDiscount.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              )}
              {isCouponApplied && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Mã Voucher:</span>
                  <span className="font-bold">
                    -{appliedDiscount.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Phí ship nội khu:</span>
                <span>{deliveryFee.toLocaleString("vi-VN")}đ</span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline font-bold text-sm text-stone-900">
                <span>Tổng chi trả:</span>
                <span className="text-base text-rose-600 font-black">
                  {total.toLocaleString("vi-VN")}đ
                </span>
              </div>
              {step === "payment" && (
                <div className="pt-1 text-[11px] text-stone-500 border-t border-stone-200 mt-1">
                  <span className="font-semibold">Phương thức: </span>
                  {paymentMethod === "studentpay"
                    ? "StudentPay"
                    : paymentMethod === "vnpay"
                      ? "VNPay"
                      : "COD – Tiền mặt"}
                </div>
              )}
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
