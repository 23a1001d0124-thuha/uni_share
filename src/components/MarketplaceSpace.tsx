import React, { useState, useEffect } from "react";
import { Search, SearchX, Sparkles, Filter, Camera, Plus, CheckCircle2, ShoppingBag, Loader2, Upload, AlertCircle, RefreshCw, Eye, MessageSquare, ShieldCheck, Check, Info, X, Flag } from "lucide-react";
import { Product, SellerRating } from "../types";
import { CATEGORIES, CONDITIONS, SMART_LENS_SAMPLES, VIETNAMESE_UNIVERSITIES } from "../data";
import { compressAndResizeImage } from "../utils";

export const getPriceEvaluationBadge = (price: number, originalPrice: number) => {
  if (!originalPrice || originalPrice <= 0) {
    return { label: "Giá hợp lý & Đúng giá", style: "bg-stone-50 text-stone-700 border-stone-200" };
  }
  const ratio = price / originalPrice;
  if (ratio <= 0.35) {
    return { label: "Rất rẻ (Hạt dẻ 🌟)", style: "bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold" };
  } else if (ratio <= 0.6) {
    return { label: "Giá tốt (Tiết kiệm 🔥)", style: "bg-rose-50 text-rose-700 border-rose-200 font-bold" };
  } else if (ratio > 0.85) {
    return { label: "Hơi đắt một tí ⚠️", style: "bg-stone-50 text-stone-600 border-stone-200" };
  } else {
    return { label: "Giá hợp lý (Chuẩn SV ✅)", style: "bg-stone-50 text-stone-600 border-stone-200" };
  }
};

interface MarketplaceSpaceProps {
  products: Product[];
  isLoading?: boolean;
  onAddProduct: (newProduct: any) => Promise<void>;
  onAddToCart: (p: Product) => void;
  onSelectProductForChat: (pId: string) => void;
  isStudentVerified: boolean;
  onTriggerVerification: () => void;
  onNavigateToTab?: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectSellerForProfile: (sellerName: string, sellerSchool: string) => void;
  savedProductIds: Record<string, boolean>;
  onToggleSave: (id: string) => void;
  onReportProduct?: (product: Product, reason: string) => Promise<void>;
  onOpenPostModal?: () => void;
}

const CONDITION_SHORT: Record<string, string> = {
  "Mới 100%": "Mới",
  "Như mới (98%)": "Như mới",
  "Còn tốt, đã dùng ít": "Dùng ít",
  "Còn tốt, đã dùng nhiều": "Dùng nhiều",
  "Cũ, còn dùng được": "Cũ OK",
};

export default function MarketplaceSpace({
  products,
  isLoading,
  onAddProduct,
  onAddToCart,
  onSelectProductForChat,
  isStudentVerified,
  onTriggerVerification,
  onNavigateToTab,
  searchQuery,
  setSearchQuery,
  onSelectSellerForProfile,
  savedProductIds,
  onToggleSave,
  onReportProduct,
  onOpenPostModal,
}: MarketplaceSpaceProps) {
  // Filters State
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState("Tất cả");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("Tất cả");
  const [onlySaved, setOnlySaved] = useState(false);
  const [onlyDeepDiscount, setOnlyDeepDiscount] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = [
    selectedCategory !== "Tất cả",
    onlyVerified,
    selectedCondition !== "Tất cả",
    selectedSchool !== "Tất cả",
    minPrice,
    maxPrice,
    onlySaved,
    onlyDeepDiscount
  ].filter(Boolean).length;

  // Add-to-cart local visual feedback state
  const [addedProductIds, setAddedProductIds] = useState<Record<string, boolean>>({});

  const handleAddToCartWithFeedback = (product: Product) => {
    onAddToCart(product);
    setAddedProductIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedProductIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1000);
  };

  // Local storage dynamic rating sync
  const [localRatings, setLocalRatings] = useState<SellerRating[]>([]);

  useEffect(() => {
    const loadRatings = () => {
      const existingRatingsStr = localStorage.getItem("uni_ratings");
      const ratings: SellerRating[] = existingRatingsStr ? JSON.parse(existingRatingsStr) : [];
      setLocalRatings(ratings);
    };
    loadRatings();

    window.addEventListener("uni_ratings_updated", loadRatings);
    return () => {
      window.removeEventListener("uni_ratings_updated", loadRatings);
    };
  }, []);

  // Compute enriched seller rating fields dynamically
  const enrichedProducts = React.useMemo(() => {
    return products.map((product) => {
      const sellerRatings = localRatings.filter((r) => r.sellerName === product.author);
      if (sellerRatings.length > 0) {
        const sum = sellerRatings.reduce((acc, curr) => acc + curr.score, 0);
        const avg = sum / sellerRatings.length;
        return {
          ...product,
          averageRating: avg,
          ratingCount: sellerRatings.length
        };
      } else {
        return {
          ...product,
          averageRating: undefined,
          ratingCount: 0
        };
      }
    });
  }, [products, localRatings]);

  // Local loading simulator to ensure Skeletons are shown on load / tab mount
  const [localLoading, setLocalLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLocalLoading(false);
    }, 605);
    return () => clearTimeout(timer);
  }, []);

  const showSkeleton = isLoading || localLoading;

  // Grid Ref for smooth scrolling top of listings on filter change
  const gridRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [searchQuery, selectedCategory, onlyVerified, selectedCondition, selectedSchool, minPrice, maxPrice, onlySaved, onlyDeepDiscount]);

  // Visual/Modals State
  const [isLensOpen, setIsLensOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Sản phẩm không đúng hiện trạng thực tế");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDetailProd, setSelectedDetailProd] = useState<Product | null>(null);

  // Smart Lens AI Upload State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [lensResult, setLensResult] = useState<any | null>(null);
  const [isLensAnalyzing, setIsLensAnalyzing] = useState(false);

  useEffect(() => {
    if (!isReportModalOpen) {
      setReportReason("Sản phẩm không đúng hiện trạng thực tế");
    }
  }, [isReportModalOpen]);

  // Filtered Products Computing
  const filteredProducts = enrichedProducts.filter((product) => {
    // Normal search & Vietnamese fuzzy approximation
    const normalQuery = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const productName = product.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const productDesc = product.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const productTags = (product.tags || []).join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Category match
    if (selectedCategory !== "Tất cả" && product.category !== selectedCategory) return false;

    // Condition match
    if (selectedCondition !== "Tất cả" && product.condition !== selectedCondition) return false;
    
    // School match
    if (selectedSchool !== "Tất cả" && product.school !== selectedSchool) return false;

    // Price match
    if (minPrice && product.price < Number(minPrice)) return false;
    if (maxPrice && product.price > Number(maxPrice)) return false;

    // Verification match
    if (onlyVerified && !product.isStudentVerified) return false;

    // Deep Discount match (>20% off)
    if (onlyDeepDiscount) {
      const discountRatio = 1 - (product.price / product.originalPrice);
      if (discountRatio <= 0.2) return false;
    }

    // Saved items
    if (onlySaved && !savedProductIds[product.id]) return false;

    // Search query match (Title, Description, Tags)
    if (searchQuery && !productName.includes(normalQuery) && !productDesc.includes(normalQuery) && !productTags.includes(normalQuery)) return false;

    return true;
  });

  // Handle Drag & Drop / manual select for click
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        try {
          // Compress the base64 before storing it
          const compressed = await compressAndResizeImage(rawBase64);
          setUploadedImage(compressed);
        } catch (err) {
          console.warn("Fallback on compression failure:", err);
          setUploadedImage(rawBase64);
        }
        setSelectedPresetId(null);
        setLensResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectPresetLens = (id: string, url: string) => {
    setSelectedPresetId(id);
    setUploadedImage(url);
    setLensResult(null);
  };

  const handleSmartLensAnalysis = async () => {
    if (!uploadedImage) return;
    setIsScanning(true);
    setIsLensAnalyzing(true);

    try {
      const payload: any = {};
      if (selectedPresetId) {
        payload.sampleId = selectedPresetId;
      } else {
        payload.imageBase64 = uploadedImage;
      }

      const res = await fetch("/api/gemini/smart-lens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setLensResult(data.results);
      } else {
        alert("Lỗi phân tích hình ảnh!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
      setIsLensAnalyzing(false);
    }
  };

  const applyLensResult = () => {
    if (lensResult) {
      setSearchQuery(lensResult.name);
      if (CATEGORIES.includes(lensResult.category)) {
        setSelectedCategory(lensResult.category);
      }
      setIsLensOpen(false);
      // Clean analysis
      setUploadedImage(null);
      setSelectedPresetId(null);
      setLensResult(null);
    }
  };

  return (
    <div className="space-y-6" id="marketplace-space">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-6 border border-rose-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-semibold text-rose-950 font-display flex items-center gap-2">
            Chợ Đồ Cũ Sinh Viên
            <span className="bg-rose-150 text-rose-700 text-xs px-2.5 py-0.5 rounded-full font-medium">Uni-Market</span>
          </h2>
          <p className="text-sm text-rose-800 mt-1">Mua bán đồ giáo trình, công nghệ, phòng trọ cũ an toàn nội bộ trường học.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsLensOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-rose-700 px-4 py-2.5 rounded-xl border border-rose-200 text-sm font-medium transition cursor-pointer"
            id="btn-smart-lens"
          >
            <Camera className="w-4 h-4" />
            AI Smart Lens
          </button>

          <button 
            onClick={() => onOpenPostModal && onOpenPostModal()}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl shadow-sm text-sm font-medium transition cursor-pointer"
            id="btn-post-product"
          >
            <Plus className="w-4 h-4" />
            Đăng bán ngay
          </button>
        </div>
      </div>

      {/* Filters Hub */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        {/* Mobile Filter Bar (< lg) */}
        <div className="flex lg:hidden items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Fuzzy search không dấu: sach kinh te..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white transition"
              id="search-input-mobile"
            />
          </div>
          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer relative"
          >
            <Filter className="w-4 h-4" />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Desktop Filter Layout (>= lg) */}
        <div className="hidden lg:flex flex-col space-y-3.5">
          <div className="flex flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Tìm đồ... sach kinh te, tai nghe"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 text-sm focus:outline-hidden focus:border-rose-500 focus:bg-white transition"
                id="search-input"
              />
            </div>
            
            <div className="flex flex-nowrap items-center gap-3">
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-700 outline-none focus:border-rose-500 cursor-pointer hover:bg-stone-100 transition"
              >
                <option value="Tất cả">Tất cả trường</option>
                {VIETNAMESE_UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>

              <div className="flex items-center gap-2 bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5">
                <input 
                  type="number" 
                  placeholder="Giá từ" 
                  className="w-24 bg-transparent text-sm outline-none text-stone-700"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span className="text-stone-400">-</span>
                <input 
                  type="number" 
                  placeholder="Đến" 
                  className="w-24 bg-transparent text-sm outline-none text-stone-700"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 justify-center">
                <label className="text-xs font-semibold text-stone-600 flex items-center gap-2 cursor-pointer w-full text-center">
                  <input
                    type="checkbox"
                    checked={onlyVerified}
                    onChange={(e) => setOnlyVerified(e.target.checked)}
                    className="w-4 h-4 accent-rose-600 cursor-pointer"
                  />
                  <span className="whitespace-nowrap">SV Xác Thực</span>
                </label>
              </div>

              <div className="flex items-center gap-3 bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 justify-center">
                <label className="text-xs font-semibold text-rose-600 flex items-center gap-2 cursor-pointer w-full text-center">
                  <input
                    type="checkbox"
                    checked={onlySaved}
                    onChange={(e) => setOnlySaved(e.target.checked)}
                    className="w-4 h-4 accent-rose-600 cursor-pointer"
                  />
                  <span className="whitespace-nowrap font-bold">♥ Đã Lưu</span>
                </label>
              </div>
            </div>
          </div>

          {/* Secondary Filters: Tags & Condition */}
          <div className="flex flex-row justify-between items-center gap-3">
            {/* Category Pill Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
              <button
                onClick={() => setSelectedCategory("Tất cả")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === "Tất cả"
                    ? "bg-rose-100 text-rose-700 font-bold border border-rose-200"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Tất cả danh mục
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-rose-100 text-rose-700 font-bold border border-rose-200"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-700 outline-none focus:border-rose-500 cursor-pointer hover:bg-stone-100 transition"
              >
                <option value="Tất cả">Mọi độ mới</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <label className="text-xs font-semibold text-rose-700 flex items-center gap-2 cursor-pointer bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <input
                  type="checkbox"
                  checked={onlyDeepDiscount}
                  onChange={(e) => setOnlyDeepDiscount(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 cursor-pointer"
                />
                <span className="whitespace-nowrap font-bold">🔥 Giảm sâu {'>'}20%</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Product List Grid */}
      {showSkeleton ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4" id="skeleton-grid">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-stone-100 rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              {/* Khối ảnh: bg-stone-200 animate-pulse h-48 w-full */}
              <div className="bg-stone-200 animate-pulse pt-[75%] w-full rounded-t-2xl" />
              <div className="mt-3 mx-4 h-1.5 bg-stone-100 animate-pulse rounded-full w-3/4" />
              
              {/* Nội dung padding p-4, 3 dòng animate-pulse, gap-2 */}
              <div className="p-3 md:p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="bg-stone-200 animate-pulse rounded w-3/4 h-4" />
                  <div className="bg-stone-200 animate-pulse rounded w-1/2 h-4" />
                  <div className="flex gap-1">
                    <div className="bg-stone-100 animate-pulse rounded w-12 h-4" />
                    <div className="bg-stone-100 animate-pulse rounded w-12 h-4" />
                    <div className="bg-stone-100 animate-pulse rounded w-12 h-4" />
                  </div>
                  <div className="bg-stone-200 animate-pulse rounded w-1/3 h-5" />
                  <div className="bg-stone-100 animate-pulse rounded-lg h-6 w-32" />
                </div>
                {/* Button skeletons */}
                <div className="pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-stone-100 animate-pulse rounded-xl h-9" />
                    <div className="bg-stone-100 animate-pulse rounded-xl h-9" />
                  </div>
                  <div className="bg-stone-50 animate-pulse rounded-lg h-8 mt-2 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-stone-50 border border-dashed border-stone-300 rounded-2xl py-16 px-4 text-center animate-fadeIn flex flex-col items-center justify-center">
          <SearchX className="w-10 h-10 text-stone-300 mb-3" />
          <h4 className="text-stone-700 font-medium text-base">Ồ, hết đồ rồi 😅</h4>
          <p className="text-stone-500 text-sm mt-1 max-w-md mx-auto">
            Không có sản phẩm nào khớp với bộ lọc hiện tại.
          </p>
          <button
            onClick={() => {
              setSelectedCategory("Tất cả");
              setSelectedCondition("Tất cả");
              setSelectedSchool("Tất cả");
              setMinPrice("");
              setMaxPrice("");
              setOnlyVerified(false);
              setOnlySaved(false);
              setOnlyDeepDiscount(false);
              setSearchQuery("");
            }}
            className="mt-4 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl px-4 py-2 transition text-xs font-semibold cursor-pointer"
          >
            Bỏ hết bộ lọc
          </button>
          
          <button 
            type="button" 
            onClick={() => onOpenPostModal && onOpenPostModal()}
            className="mt-4 text-[11px] font-medium text-stone-400 hover:text-rose-600 transition underline underline-offset-2 cursor-pointer"
          >
            Hoặc đăng bán thứ bạn cần tìm?
          </button>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 scroll-mt-24" id="products-grid">
          {filteredProducts.map((product) => {
            const originalPrice = product.originalPrice || 0;
            const hasDiscount = originalPrice > 0 && product.price < originalPrice;
            const discountPercent = hasDiscount ? Math.round((1 - product.price / originalPrice) * 100) : 0;
            let discountLabel = "";
            let discountStyle = "";

            if (discountPercent >= 40) {
              discountLabel = `🔥 Siêu rẻ -${discountPercent}%`;
              discountStyle = "bg-rose-600 text-white shadow-xs";
            } else if (discountPercent >= 20) {
              discountLabel = `✓ Giá tốt -${discountPercent}%`;
              discountStyle = "bg-emerald-600 text-white shadow-xs";
            } else if (discountPercent >= 10) {
              discountLabel = `-${discountPercent}%`;
              discountStyle = "bg-amber-500 text-white shadow-xs";
            }

            return (
              <div
                key={product.id}
                className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-md hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col group justify-between cursor-pointer"
                id={`product-card-${product.id}`}
                onClick={() => setSelectedDetailProd(product)}
              >
                {/* Product Cover */}
                <div className="relative pt-[75%] bg-stone-50 overflow-hidden shrink-0">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80";
                      e.currentTarget.className = "absolute inset-0 w-full h-full object-cover bg-stone-100";
                    }}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* AI Price Badge overlay */}
                  {discountPercent >= 10 && (
                    <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm z-20 ${discountStyle}`}>
                      {discountLabel}
                    </div>
                  )}

                  {/* Category chip + Verified badge */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10 items-start pointer-events-none">
                    {!discountLabel && product.category && (
                      <span className="bg-stone-900/80 backdrop-blur-md text-white text-[9.5px] font-bold px-2.5 py-1 rounded tracking-wide uppercase shadow-sm">
                        {product.category}
                      </span>
                    )}
                    {product.isStudentVerified && (
                      <span className={`bg-emerald-100/90 backdrop-blur-md text-emerald-800 border border-emerald-200/50 text-[9px] font-extrabold px-2 py-0.5 rounded shadow-xs flex items-center gap-1 ${discountPercent >= 10 ? "mt-7" : ""}`}>
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        SV Verified
                      </span>
                    )}
                  </div>

                  {/* Compatibility Match Badge */}
                  {product.suitabilityScore && (
                    <div className="absolute bottom-2 left-2 bg-rose-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm z-20 shadow-sm">
                      {product.suitabilityScore}% Match
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(product.id);
                    }}
                    className={`absolute top-2 right-2 p-1.5 md:p-2 rounded-full z-20 shadow-sm cursor-pointer transition ${
                      savedProductIds[product.id] 
                        ? "bg-rose-50 border border-rose-200 text-rose-600" 
                        : "bg-white/90 border border-transparent text-stone-400 hover:text-rose-500 hover:bg-white"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={savedProductIds[product.id] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  </button>

                  <div className="absolute top-2.5 right-11 md:right-12 bg-white/90 backdrop-blur-md text-stone-700 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm z-10 border border-stone-200/50">
                    {CONDITION_SHORT[product.condition] || product.condition}
                  </div>

                  {product.status !== "Đang bán" && (
                    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-2 z-10">
                      <span className="bg-white/95 text-stone-900 font-extrabold text-xs px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">
                        {product.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Tier 2: Title */}
                    <h3 
                      onClick={() => setSelectedDetailProd(product)}
                      className="font-bold text-stone-900 text-sm leading-snug line-clamp-2 hover:text-rose-600 transition duration-150 cursor-pointer"
                    >
                      {product.name}
                    </h3>

                    {/* Tier 3: AI tags, Suitability Score, Author/School */}
                    <div className="mt-1.5 space-y-2">
                      {/* Author / School Info */}
                      <div className="text-stone-500 text-[9px] flex items-center gap-1 font-medium truncate pt-1">
                         {product.school} &middot; {product.author.split(" ").pop()}
                         {product.isStudentVerified && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0 inline-block" />}
                      </div>

                      {/* AI Tags */}
                      {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {product.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="bg-rose-50 border border-rose-100 text-rose-700 text-[9px] px-1.5 py-0.5 rounded font-medium">
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Suitability Score bar */}
                      <div className="flex items-center gap-2 mt-2" title="AI tính điểm phù hợp dựa trên ngành học và lịch sử xem">
                        <div className="h-1.5 rounded-full bg-stone-100 flex-1 overflow-hidden">
                          <div 
                            className="h-full bg-rose-400 rounded-full transition-all" 
                            style={{ width: `${product.suitabilityScore}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-stone-400 whitespace-nowrap font-medium shrink-0">
                          AI khớp {product.suitabilityScore}%
                        </span>
                      </div>
                    </div>

                    {/* Price Evaluation Badge */}
                    {product.originalPrice && product.originalPrice > 0 ? (() => {
                      const evalBadge = getPriceEvaluationBadge(product.price, product.originalPrice);
                      return (
                        <div className={`mt-2.5 px-2 py-1 rounded-lg text-[10px] w-max flex items-center gap-1.5 border ${evalBadge.style} shadow-xs`}>
                          <Sparkles className="w-3 h-3 text-rose-400 fill-rose-300" />
                          {evalBadge.label}
                        </div>
                      );
                    })() : null}
                  </div>

                  {/* Actions Base on My Goods (Tier 1 Part 2) */}
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-1.5 flex-wrap">
                         <span className="font-extrabold text-rose-600 text-base md:text-lg font-display leading-none">{product.price.toLocaleString("vi-VN")}đ</span>
                         {product.originalPrice && product.originalPrice > product.price && (
                           <span className="text-[10px] text-stone-400 font-semibold line-through leading-none">
                             {product.originalPrice.toLocaleString("vi-VN")}đ
                           </span>
                         )}
                       </div>
                    </div>

                    {product.author === "Nguyễn Thu Hạ (Bạn)" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateToTab) onNavigateToTab("my-listings");
                        }}
                        className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[10px] md:text-sm py-1.5 md:py-2.5 rounded-xl transition cursor-pointer min-h-[36px]"
                      >
                        Sản phẩm của bạn
                      </button>
                    ) : (
                      <div className="flex flex-col">
                        <div className="grid grid-cols-2 gap-1.5 flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCartWithFeedback(product);
                            }}
                            disabled={product.status !== "Đang bán"}
                            className={`flex items-center justify-center rounded-xl transition cursor-pointer min-h-[36px] border ${
                              addedProductIds[product.id]
                                ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xs"
                                : "bg-white border-stone-200 hover:border-rose-300 text-stone-600 hover:text-rose-600 shadow-xs"
                            } disabled:opacity-50`}
                            title="Thêm vào giỏ"
                          >
                            {addedProductIds[product.id] ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> : <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 shrink-0" />}
                          </button>
  
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(product);
                              if (product.status === "Đang bán" && onNavigateToTab) {
                                onNavigateToTab("checkout");
                              }
                            }}
                            disabled={product.status !== "Đang bán"}
                            className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold text-[10px] md:text-xs py-1.5 rounded-xl transition cursor-pointer min-h-[36px] disabled:opacity-50 flex items-center justify-center truncate px-1"
                          >
                            Mua ngay
                          </button>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProductForChat(product.id);
                          }}
                          disabled={product.status !== "Đang bán"}
                          className="w-full text-center mt-3 text-rose-600 hover:text-rose-700 text-xs font-semibold cursor-pointer transition underline-offset-2 hover:underline flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                        >
                          💬 Nhắn tin hỏi giá
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: AI SMART LENS */}
      {isLensOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="lens-modal">
          <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <h3 className="font-semibold text-base font-display">AI Smart Lens - Quét Tìm Kiếm Bằng Ảnh</h3>
              </div>
              <button 
                onClick={() => setIsLensOpen(false)}
                className="text-white hover:text-white/80 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Context */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <p className="text-xs text-stone-600">
                Hãy lựa chọn 1 trong các ảnh sinh viên mặc định mẫu bên dưới để xem hệ thống AI phân tích tự động, hoặc drag & drop ảnh chụp đồ thanh lý của riêng bạn.
              </p>

              {/* Presets Gallery */}
              <div className="grid grid-cols-3 gap-3">
                {SMART_LENS_SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => selectPresetLens(sample.id, sample.url)}
                    className={`border-2 rounded-xl p-1.5 text-left transition cursor-pointer overflow-hidden flex flex-col ${
                      selectedPresetId === sample.id ? "border-rose-500 bg-rose-50" : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <img src={sample.url} alt={sample.title} className="aspect-video object-cover rounded-lg w-full h-20" referrerPolicy="no-referrer" />
                    <span className="text-[10px] font-bold text-stone-800 mt-1 line-clamp-1">{sample.title}</span>
                    <span className="text-[9px] text-stone-500 line-clamp-1">{sample.desc}</span>
                  </button>
                ))}
              </div>

              {/* Upload Field */}
              <div className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center hover:bg-stone-50 transition relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                />
                <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-stone-700 block">Kéo thả ảnh thực tế hoặc click chọn file</span>
                <span className="text-[10px] text-stone-400 mt-0.5 block">Hỗ trợ định dạng PNG, JPG dưới 5MB</span>
              </div>

              {/* Active Image Preview & Scanner Visual */}
              {uploadedImage && (
                <div className="relative bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col items-center">
                  <div className="relative w-fit overflow-hidden rounded-lg max-h-56">
                    <img src={uploadedImage} alt="Preview" referrerPolicy="no-referrer" className="object-contain max-h-52 w-auto" />
                    
                    {/* Pulsing Scan bar */}
                    {isScanning && (
                      <div className="absolute top-0 inset-x-0 h-1 bg-rose-500/80 shadow-rose-400 shadow-md animate-bounce z-20" />
                    )}
                  </div>

                  <button
                    onClick={handleSmartLensAnalysis}
                    disabled={isLensAnalyzing}
                    className="mt-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-5 rounded-lg flex items-center gap-2 transition cursor-pointer"
                  >
                    {isLensAnalyzing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        AI Đang Nhận Diện...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-white" />
                        Nhận diện bằng AI
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Gemini Analytics Results Display */}
              {lensResult && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-rose-800 flex items-center gap-1.5 font-display">
                    <Sparkles className="w-4 h-4 fill-rose-600 text-rose-600" />
                    Kết Quả Dự Đoán Từ AI Smart Lens
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-rose-150">
                      <span className="text-stone-400 block text-[10px]">TÊN MÓN ĐỒ DỰ ĐOÁN</span>
                      <span className="font-bold text-stone-800">{lensResult.name}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-rose-150">
                      <span className="text-stone-400 block text-[10px]">DANH MỤC KHUYÊN DÙNG</span>
                      <span className="font-bold text-stone-800">{lensResult.category}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-rose-150">
                      <span className="text-stone-400 block text-[10px]">TÌNH TRẠNG ƯỚC LƯỢNG</span>
                      <span className="font-bold text-stone-800">{lensResult.condition}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-rose-150">
                      <span className="text-stone-400 block text-[10px]">GIÁ ĐỀ XUẤT CHO SINH VIÊN</span>
                      <span className="font-bold text-rose-600">{lensResult.suggestedPrice?.toLocaleString()} VND</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-rose-150 text-xs">
                    <span className="text-stone-400 block text-[10px]">TỪ KHÓA ĐỒNG BỘ</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lensResult.tags?.map((tg: string) => (
                        <span key={tg} className="bg-stone-100 text-stone-600 text-[10px] px-2 py-0.5 rounded-md font-medium">
                          #{tg}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={applyLensResult}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Đồng bộ & Tìm kiếm Sản phẩm Ngay
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-stone-50 px-4 py-3 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLensOpen(false)}
                className="bg-white hover:bg-stone-100 text-stone-600 border border-stone-300 py-1.5 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BEAUTIFUL DETAILED PRODUCT VIEW */}
      {selectedDetailProd && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn" id="product-detail-modal">
          <div className="bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col relative">
            
            {/* Header section with neat design */}
            <div className="bg-gradient-to-r from-rose-650 via-rose-600 to-pink-600 p-4 px-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <span className="font-extrabold text-sm tracking-wide uppercase font-display">Chi Tiết Vật Phẩm Thanh Lý</span>
              </div>
              <button 
                onClick={() => setSelectedDetailProd(null)}
                className="bg-white/10 hover:bg-white/25 active:scale-95 text-white font-black text-xs py-1.5 px-3 rounded-xl transition cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            {/* Scrollable details wrapper */}
            <div className="overflow-y-auto p-6 md:p-8 space-y-6 flex-1 text-xs">
              {/* Dual-column section */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                
                {/* Image panel (2 Cols) */}
                <div className="md:col-span-2 space-y-3">
                  <div className="relative pt-[100%] bg-stone-50 border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
                    <img 
                      src={selectedDetailProd.images[0]} 
                      alt={selectedDetailProd.name} 
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Compatibility Match badge overlay */}
                    <div className="absolute bottom-3 right-3 bg-rose-605 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 z-15 bg-rose-600">
                      <Sparkles className="w-3.5 h-3.5 fill-white animate-spin" />
                      <span>{selectedDetailProd.suitabilityScore}% Match</span>
                    </div>

                    <div className="absolute top-3 left-3 z-15">
                      <span className="bg-stone-900/80 backdrop-blur-md text-white text-[9.5px] font-bold px-2.5 py-1 rounded tracking-wide uppercase">
                        {selectedDetailProd.category}
                      </span>
                    </div>
                  </div>

                  {/* Summary of items specifications */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-stone-400 font-semibold">Tình trạng cũ mới:</span>
                      <span className="font-bold text-stone-800 text-right">{selectedDetailProd.condition}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-stone-400 font-semibold">Hiện trạng đăng bán:</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        selectedDetailProd.status === "Đang bán" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>
                        {selectedDetailProd.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Information details panel (3 Cols) */}
                <div className="md:col-span-3 space-y-4">
                  {/* Title and premium pricing tags */}
                  <div className="space-y-1.5">
                    <h3 className="text-stone-900 font-black text-base md:text-lg leading-snug">
                      {selectedDetailProd.name}
                    </h3>
                    <div className="flex items-center gap-2.5">
                      <span className="text-rose-600 text-xl font-black font-display">
                        {selectedDetailProd.price.toLocaleString("vi-VN")}đ
                      </span>
                      {selectedDetailProd.originalPrice && (
                        <>
                          <span className="text-stone-400 text-xs line-through">
                            {selectedDetailProd.originalPrice.toLocaleString("vi-VN")}đ
                          </span>
                          <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-100">
                            Học viên tiết kiệm {Math.round((1 - selectedDetailProd.price / selectedDetailProd.originalPrice) * 100)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tags Detail block */}
                  {selectedDetailProd.tags && selectedDetailProd.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedDetailProd.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="bg-rose-50 border border-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded font-bold">
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Campus Verified Info block */}
                  <div className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-stone-700">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                      <span className="font-semibold text-stone-500">Khu vực bàn giao chính:</span>
                      <span className="font-bold text-stone-900 truncate">{selectedDetailProd.school}</span>
                    </div>

                    <div className="border-t border-stone-200/60 pt-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-stone-600">
                        <span className="font-medium text-stone-400">Thành viên bán:</span>
                        <span className="font-bold text-stone-850">{selectedDetailProd.author}</span>
                      </div>
                      
                      {selectedDetailProd.isStudentVerified ? (
                        <span className="text-emerald-700 text-[9.5px] font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-605 text-white bg-emerald-600 rounded-full" />
                          SV Đã Xác Thực
                        </span>
                      ) : (
                        <span className="text-stone-500 text-[9.5px] font-semibold bg-stone-100 px-2 py-0.5 rounded-full border">
                          Đăng ký tự do
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-stone-405 font-extrabold uppercase tracking-wide block">Ghi chú hiện trạng & lý do thanh lý</span>
                    <div className="bg-stone-50 border border-stone-205 p-4 rounded-xl text-stone-700 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line text-xs font-medium">
                      {selectedDetailProd.description || "Thành viên kiểm định đồ xài cũ bình thường, lý do bán vì phòng trọ chật, nhượng lại giá rẻ hỗ trợ các bạn cùng khóa."}
                    </div>
                  </div>

                  {/* Anti-fraud advisory and public meetup safety */}
                  <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl text-emerald-950 leading-relaxed space-y-1.5 shadow-3xs">
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                      An toàn giao dịch sinh viên:
                    </span>
                    <p className="text-[10.5px]">
                      Sản phẩm này tương thích để hẹn gặp bàn giao ngay tại sảnh hành lang hoặc sảnh KTX trường <b>{selectedDetailProd.school}</b>. Khuyên khích kiểm tra chức nang của thiết bị hay giáo trình đầy đủ chữ trước khi thực hiện giao dịch bằng ví <b>StudentPay</b> để nhận nhượng giá tốt nhất!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom active action buttons footer */}
            <div className="bg-stone-50 p-4.5 px-6 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 select-none">
                <span className="text-[10px] text-stone-400 font-semibold text-center sm:text-left">Hỗ trợ giao dịch trực tiếp an toàn</span>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="text-[10px] text-stone-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Báo cáo tin đăng nếu có dấu hiệu lừa đảo"
                >
                  <Flag className="w-3 h-3" /> Báo cáo
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDetailProd(null)}
                  className="bg-white hover:bg-stone-100 border border-stone-300 text-stone-600 font-bold px-4 py-2 rounded-xl transition cursor-pointer text-xs"
                >
                  Quay lại danh sách
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(selectedDetailProd);
                  }}
                  disabled={selectedDetailProd.status !== "Đang bán"}
                  className="bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-black px-4.5 py-2 rounded-xl border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
                  title="Thêm nhanh vào giỏ thanh toán"
                >
                  <ShoppingBag className="w-4 h-4 bg-rose-50" />
                  Thêm giỏ hàng
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(selectedDetailProd);
                    onSelectProductForChat(selectedDetailProd.id);
                    setSelectedDetailProd(null);
                  }}
                  disabled={selectedDetailProd.status !== "Đang bán"}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-xs shadow-xs disabled:opacity-50"
                >
                  💬 Hỏi mua & Đặt lịch hẹn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 3: ANTI-FRAUD REPORT */}
      {isReportModalOpen && selectedDetailProd && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div className="bg-white max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-rose-600 p-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-sm flex items-center gap-1.5 font-display">
                <AlertCircle className="w-4 h-4" /> Báo cáo lừa đảo / Vi phạm
              </h3>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="text-rose-100 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-stone-600">
                Hãy cho quản trị viên biết tại sao sản phẩm <b>"{selectedDetailProd.name}"</b> lại vi phạm tiêu chuẩn cộng đồng môi trường sinh viên:
              </p>
              
              <div className="space-y-2">
                {[
                  "Sản phẩm không đúng hiện trạng thực tế", 
                  "Người bán có dấu hiệu yêu cầu chuyển khoản trước",
                  "Hình ảnh không rỏ ràng, có dấu hiệu giả mạo",
                  "Bán đồ cấm, không phù hợp môi trường học đường",
                  "Spam danh mục, sai giá nhằm phá giá lừa đảo"
                ].map(r => (
                  <label key={r} className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-stone-50 border border-transparent hover:border-stone-100 transition">
                    <input 
                      type="radio" 
                      name="report" 
                      checked={reportReason === r} 
                      onChange={() => setReportReason(r)}
                      className="mt-0.5 accent-rose-600"
                    />
                    <span className="text-xs text-stone-700 font-medium">{r}</span>
                  </label>
                ))}
              </div>

              <button 
                onClick={async () => {
                  if (!selectedDetailProd || isSubmittingReport) return;
                  setIsSubmittingReport(true);
                  try {
                    if (onReportProduct) {
                      await onReportProduct(selectedDetailProd, reportReason);
                    } else {
                      await fetch("/api/reports", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ productId: selectedDetailProd.id, reason: reportReason })
                      });
                    }
                    alert(`Đã gửi báo cáo: "${reportReason}". Quản trị viên sẽ xem xét tin này.`);
                    setIsReportModalOpen(false);
                    setSelectedDetailProd(null);
                  } catch (err) {
                    alert("Chưa thể gửi báo cáo lúc này. Vui lòng thử lại sau.");
                  } finally {
                    setIsSubmittingReport(false);
                  }
                }}
                disabled={isSubmittingReport}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition shadow-xs mt-2 disabled:opacity-60"
              >
                {isSubmittingReport ? "Đang gửi..." : "Gửi Báo Cáo Bảo Vệ Cộng Đồng"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Bottom Sheet */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs animate-fadeIn" 
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="bg-white w-full rounded-t-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col animate-[slideUp_0.3s_ease-out]">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 font-display text-lg">Bộ lọc tìm kiếm</h3>
              <button onClick={() => setIsFilterOpen(false)} className="bg-stone-100 hover:bg-stone-200 text-stone-500 p-2 rounded-full transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[70vh] space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-stone-800">Danh mục</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory("Tất cả")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === "Tất cả"
                        ? "bg-rose-100 text-rose-700 font-bold border border-rose-200"
                        : "bg-stone-100 text-stone-600 border border-transparent"
                    }`}
                  >
                    Tất cả danh mục
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        selectedCategory === cat
                          ? "bg-rose-100 text-rose-700 font-bold border border-rose-200"
                          : "bg-stone-100 text-stone-600 border border-transparent"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-stone-800">Trường đại học</label>
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-3 text-sm text-stone-700 outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="Tất cả">Tất cả trường</option>
                  {VIETNAMESE_UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-stone-800">Tình trạng</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                      onClick={() => setSelectedCondition("Tất cả")}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-center ${
                        selectedCondition === "Tất cả"
                          ? "bg-rose-100 text-rose-700 font-bold border border-rose-200"
                          : "bg-stone-100 text-stone-600 border border-transparent"
                      }`}
                    >
                      Mọi độ mới
                  </button>
                  {CONDITIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedCondition(c)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-center ${
                        selectedCondition === c
                          ? "bg-rose-100 text-rose-700 font-bold border border-rose-200"
                          : "bg-stone-100 text-stone-600 border border-transparent"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-stone-800">Khoảng giá</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5">
                    <input 
                      type="number" 
                      placeholder="Từ (đ)" 
                      className="w-full bg-transparent text-sm outline-none text-stone-700"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                  </div>
                  <span className="text-stone-400 font-bold">-</span>
                  <div className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5">
                    <input 
                      type="number" 
                      placeholder="Đến (đ)" 
                      className="w-full bg-transparent text-sm outline-none text-stone-700"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-stone-800">Tùy chọn khác</label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-xl font-medium text-sm text-stone-700 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Chỉ hiện Người bán CÓ Thẻ sinh viên
                    </div>
                    <input
                      type="checkbox"
                      checked={onlyVerified}
                      onChange={(e) => setOnlyVerified(e.target.checked)}
                      className="w-5 h-5 accent-rose-600 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-xl font-medium text-sm text-rose-700 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">🔥</span>
                      Chỉ hiện đồ giảm giá sâu ({'>'}20%)
                    </div>
                    <input
                      type="checkbox"
                      checked={onlyDeepDiscount}
                      onChange={(e) => setOnlyDeepDiscount(e.target.checked)}
                      className="w-5 h-5 accent-rose-600 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-xl font-medium text-sm text-stone-700 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-500">♥</span>
                      Chỉ hiện sản phẩm Đã lưu
                    </div>
                    <input
                      type="checkbox"
                      checked={onlySaved}
                      onChange={(e) => setOnlySaved(e.target.checked)}
                      className="w-5 h-5 accent-rose-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-stone-100 flex gap-3 bg-white">
              <button 
                onClick={() => {
                  setSelectedCategory("Tất cả");
                  setSelectedSchool("Tất cả");
                  setSelectedCondition("Tất cả");
                  setMinPrice("");
                  setMaxPrice("");
                  setOnlyVerified(false);
                  setOnlyDeepDiscount(false);
                  setOnlySaved(false);
                }}
                className="px-6 py-3 rounded-xl font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
              >
                Reset
              </button>
              <button 
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer"
              >
                Áp dụng {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
