import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, Camera, Sparkles, X } from "lucide-react";
import { CATEGORIES, CONDITIONS } from "../data";
import { compressAndResizeImage } from "../utils";

interface PostItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (newProduct: any) => Promise<void>;
  isStudentVerified: boolean;
  onTriggerVerification: () => void;
}

export default function PostItemModal({
  isOpen,
  onClose,
  onAddProduct,
  isStudentVerified,
  onTriggerVerification,
}: PostItemModalProps) {
  const [postStep, setPostStep] = useState(1);
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState(
    CATEGORIES[0] || "Sách & Giáo trình",
  );
  const [newProdCondition, setNewProdCondition] = useState(
    CONDITIONS[2] || "Còn mới 90% (Xài kỹ, đẹp)",
  );
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdOriginalPrice, setNewProdOriginalPrice] = useState("");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Smart Lens States for the modal
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lensResult, setLensResult] = useState<any | null>(null);
  const [isLensAnalyzing, setIsLensAnalyzing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Track whether user entered via manual path (no AI prefill)
  const [isManualMode, setIsManualMode] = useState(false);

  // Step 2 manual upload states (for manual mode – separate from AI-path file)
  const [manualSelectedFile, setManualSelectedFile] = useState<File | null>(
    null,
  );
  const [manualImagePreview, setManualImagePreview] = useState<string | null>(
    null,
  );

  // AI Assessor Pricing & Suitability
  const [pricingAnalysis, setPricingAnalysis] = useState<any>(null);
  const [isAnalyzingPrice, setIsAnalyzingPrice] = useState(false);

  // Auto Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setPostStep(1);
      setUploadedImage(null);
      setSelectedFile(null);
      setLensResult(null);
      setPricingAnalysis(null);
      setIsManualMode(false);
      setManualSelectedFile(null);
      setManualImagePreview(null);
      // Reset all form fields to blank on every open
      setNewProdName("");
      setNewProdCategory(CATEGORIES[0] || "Sách & Giáo trình");
      setNewProdCondition(CONDITIONS[2] || "Còn mới 90% (Xài kỹ, đẹp)");
      setNewProdPrice("");
      setNewProdOriginalPrice("");
      setNewProdDescription("");
      setNewProdImage("");
    }
  }, [isOpen]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        try {
          const compressed = await compressAndResizeImage(rawBase64);
          setUploadedImage(compressed);
        } catch (err) {
          console.warn(
            "Fallback on compression failure in PostItemModal:",
            err,
          );
          setUploadedImage(rawBase64);
        }
        setLensResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSmartLensAnalysis = async () => {
    if (!uploadedImage) return;
    setIsScanning(true);
    setIsLensAnalyzing(true);
    try {
      const res = await fetch("/api/gemini/smart-lens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: uploadedImage }),
      });
      const data = await res.json();
      if (data.success) {
        setLensResult(data.results);
      } else {
        alert("Lỗi phân tích hình ảnh từ AI!");
      }
    } catch (e) {
      console.error("Smart Lens Error:", e);
      alert("Không thể kết nối với dịch vụ AI!");
    } finally {
      setIsScanning(false);
      setIsLensAnalyzing(false);
    }
  };

  const handleAIAssessor = async () => {
    if (!newProdName) {
      alert("Vui lòng nhập Tên sản phẩm trước khi phân tích!");
      return;
    }
    setIsAnalyzingPrice(true);
    try {
      const payload = {
        name: newProdName,
        condition: newProdCondition,
        originalPrice: newProdOriginalPrice
          ? Number(newProdOriginalPrice)
          : undefined,
        description: newProdDescription,
      };
      const res = await fetch("/api/gemini/analyze-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setPricingAnalysis(data.analysis);
      }
    } catch (e) {
      console.error("AI Assessor Error:", e);
    } finally {
      setIsAnalyzingPrice(false);
    }
  };

  const handleManualImageFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
      return;
    }
    setManualSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setManualImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !newProdDescription) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    try {
      setIsSubmitting(true);
      let uploadedImageUrl = "";

      // Determine which file to upload: AI-path file OR manual-path file
      const fileToUpload = isManualMode ? manualSelectedFile : selectedFile;

      if (fileToUpload) {
        const formData = new FormData();
        formData.append("file", fileToUpload);
        try {
          const upRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          const upData = await upRes.json();
          if (upData.success && upData.url) {
            uploadedImageUrl = upData.url;
          } else {
            console.warn("[PostItemModal] Upload thất bại:", upData.message);
          }
        } catch (upErr) {
          console.error("[PostItemModal] Upload error:", upErr);
        }
      }

      const payload: any = {
        name: newProdName,
        category: newProdCategory,
        price: Number(newProdPrice),
        originalPrice: newProdOriginalPrice ? Number(newProdOriginalPrice) : 0,
        condition: newProdCondition,
        description: newProdDescription,
        images: uploadedImageUrl ? [uploadedImageUrl] : undefined,
        author: "Nguyễn Thu Hạ (Bạn)",
        school: isStudentVerified ? "Đại học Mở Hà Nội" : "Chưa xác thực",
      };

      if (pricingAnalysis?.schoolSuitabilityScore) {
        payload.suitabilityScore = pricingAnalysis.schoolSuitabilityScore;
      }
      if (pricingAnalysis?.suggestedTags) {
        payload.tags = pricingAnalysis.suggestedTags;
      }

      await onAddProduct(payload);

      // Reset Form fields
      setNewProdName("");
      setNewProdPrice("");
      setNewProdOriginalPrice("");
      setNewProdDescription("");
      setNewProdImage("");
      setSelectedFile(null);
      setUploadedImage(null);
      setManualSelectedFile(null);
      setManualImagePreview(null);
      setIsManualMode(false);
      setPricingAnalysis(null);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Đăng bán tin thanh lý thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-0 md:p-4 animate-fadeIn"
      id="global-post-modal"
    >
      <form
        onSubmit={handlePostSubmit}
        className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl md:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="bg-rose-600 p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 fill-rose-105 animate-pulse" />
            <h3 className="font-semibold text-base font-display">
              Đăng Bán Tin - Quick Post Wizard
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-white/80 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Stepper progress indicator */}
        <div className="bg-stone-50 border-b border-stone-150 py-3.5 px-6 flex items-center justify-center gap-6 text-xs text-stone-500 font-bold shrink-0 select-none">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black border transition-colors ${
                postStep === 1
                  ? "bg-rose-50 border-rose-600 text-rose-600"
                  : "bg-emerald-500 border-emerald-500 text-white"
              }`}
            >
              {postStep > 1 ? "✓" : "1"}
            </div>
            <span
              className={
                postStep === 1
                  ? "text-rose-600 font-black"
                  : "text-emerald-600 font-extrabold"
              }
            >
              Ảnh sản phẩm
            </span>
          </div>
          <span className="text-stone-300">→</span>
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black border transition-colors ${
                postStep === 2
                  ? "bg-rose-50 border-rose-600 text-rose-600"
                  : "border-stone-300 text-stone-400"
              }`}
            >
              2
            </div>
            <span
              className={
                postStep === 2
                  ? "text-rose-600 font-black"
                  : "text-stone-400 font-semibold"
              }
            >
              Thông tin chi tiết
            </span>
          </div>
        </div>

        {/* Step Contents */}
        {postStep === 1 ? (
          /* STEP 1: IMAGE PROCESSING */
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-stone-850 flex flex-col justify-start">
            {!uploadedImage ? (
              <div className="space-y-4 my-auto">
                <label
                  htmlFor="global-wizard-upload"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-stone-250 hover:border-rose-450 hover:bg-rose-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all gap-3"
                >
                  <Camera className="w-10 h-10 text-stone-300" />
                  <div>
                    <span className="font-bold text-stone-800 block text-sm">
                      Chụp hoặc tải ảnh lên
                    </span>
                    <span className="text-stone-400 text-xs mt-1 block">
                      AI sẽ tự nhận diện và điền thông tin
                    </span>
                  </div>
                  <input
                    id="global-wizard-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Clear all form fields so Step 2 opens completely blank
                      setNewProdName("");
                      setNewProdCategory(CATEGORIES[0] || "Sách & Giáo trình");
                      setNewProdCondition(
                        CONDITIONS[2] || "Còn mới 90% (Xài kỹ, đẹp)",
                      );
                      setNewProdPrice("");
                      setNewProdOriginalPrice("");
                      setNewProdDescription("");
                      setManualSelectedFile(null);
                      setManualImagePreview(null);
                      setIsManualMode(true);
                      setPostStep(2);
                    }}
                    className="text-stone-400 text-sm underline hover:text-stone-600 transition cursor-pointer font-medium"
                  >
                    Tự nhập thủ công →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="relative max-w-xs mx-auto aspect-square rounded-2xl overflow-hidden shadow-xs border border-stone-200 bg-stone-50">
                  <img
                    src={uploadedImage}
                    alt="Preview"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImage(null);
                      setLensResult(null);
                    }}
                    className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/85 text-white p-1 rounded-full border border-white/20 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {!lensResult && (
                  <div className="space-y-3 text-center">
                    <button
                      type="button"
                      onClick={handleSmartLensAnalysis}
                      disabled={isLensAnalyzing}
                      className="w-full max-w-xs bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mx-auto shadow-md"
                    >
                      {isLensAnalyzing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>AI Đang Phân Tích Hình Ảnh...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 fill-white" />
                          <span>Phân Tích Bằng AI</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-stone-400 max-w-[280px] mx-auto leading-relaxed">
                      Mô hình Gemini sẽ tự động nhận dạng, đề xuất giá thanh lý
                      và điền danh mục tự động.
                    </p>
                  </div>
                )}

                {lensResult && (
                  <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 space-y-3 max-w-sm mx-auto text-left animate-fadeIn">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-rose-100">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600 fill-rose-100 animate-pulse" />
                      <span className="text-rose-700 font-extrabold text-xs">
                        AI Gợi Ý Thành Công!
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="col-span-2 bg-white/50 p-2 rounded-lg border border-rose-100/50">
                        <span className="text-[10px] text-stone-400 font-semibold block uppercase">
                          Tên vật phẩm gợi ý
                        </span>
                        <span className="font-bold text-stone-850 block mt-0.5">
                          {lensResult.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold block uppercase">
                          Danh mục
                        </span>
                        <span className="font-bold text-stone-850 block mt-0.5 truncate">
                          {lensResult.category}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold block uppercase">
                          Giá đề xuất
                        </span>
                        <span className="font-bold text-rose-600 block mt-0.5">
                          {(lensResult.suggestedPrice || 50000).toLocaleString(
                            "vi-VN",
                          )}
                          đ
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-stone-400 font-semibold block uppercase">
                          Mô tả & Tình trạng AI đọc được
                        </span>
                        <p className="text-stone-700 mt-1 leading-relaxed text-[11px] line-clamp-3">
                          {lensResult.description || lensResult.condition || "Không có mô tả chi tiết."}
                        </p>
                      </div>
                      {lensResult.tags && lensResult.tags.length > 0 && (
                        <div className="col-span-2 flex flex-wrap gap-1 mt-1">
                          {lensResult.tags.map((t: string) => (
                            <span key={t} className="bg-rose-100/50 text-rose-700 text-[9px] px-1.5 py-0.5 rounded font-medium">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setNewProdName(lensResult.name || "");
                        if (
                          lensResult.category &&
                          CATEGORIES.includes(lensResult.category)
                        ) {
                          setNewProdCategory(lensResult.category);
                        }
                        if (lensResult.suggestedPrice) {
                          setNewProdPrice(String(lensResult.suggestedPrice));
                        }
                        if (lensResult.condition) {
                          const matchedCond = CONDITIONS.find(
                            (c) =>
                              c
                                .toLowerCase()
                                .includes(lensResult.condition.toLowerCase()) ||
                              lensResult.condition
                                .toLowerCase()
                                .includes(c.toLowerCase()),
                          );
                          if (matchedCond) setNewProdCondition(matchedCond);
                        }
                        // Use description from AI if available
                        setNewProdDescription(lensResult.description || lensResult.condition || "");
                        
                        if (uploadedImage) {
                          setNewProdImage(uploadedImage);
                        }
                        setPostStep(2);
                      }}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer text-center block mt-2 shadow-sm"
                    >
                      Dùng thông tin này →
                    </button>
                  </div>
                )}

                {!lensResult && !isLensAnalyzing && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="text-stone-500 hover:text-stone-800 text-xs font-semibold cursor-pointer underline"
                    >
                      Chụp / Tải ảnh khác
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* STEP 2: DETAILS ENTRY FORM WITH AUTOFILL */
          <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-stone-850 animate-fadeIn">
            <div className="space-y-1.5">
              {!isManualMode && (
                <span className="text-emerald-600 font-bold text-[10px] uppercase flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Đồng bộ thông tin sản phẩm bởi AI
                </span>
              )}
              {isManualMode && (
                <span className="text-stone-500 font-bold text-[10px] uppercase flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-stone-400 rounded-full" />
                  Nhập thủ công — Điền đầy đủ thông tin bên dưới
                </span>
              )}
              <label className="text-stone-700 font-semibold block text-left">
                Tên sản phẩm muốn thanh lý *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Giáo trình toán cao cấp 1, Ấm đun nước siêu tốc..."
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-stone-700 font-semibold block text-left">
                  Danh mục *
                </label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-1 focus:ring-rose-500 outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-stone-700 font-semibold block text-left">
                  Tình trạng vật phẩm *
                </label>
                <select
                  value={newProdCondition}
                  onChange={(e) => setNewProdCondition(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-1 focus:ring-rose-500 outline-none"
                >
                  {CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-stone-700 font-semibold block text-left">
                  Giá bán thanh lý (VND) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ví dụ: 45000"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-stone-700 font-semibold block text-left">
                  Giá mua mới gốc (VND)
                </label>
                <input
                  type="number"
                  placeholder="Ví dụ: 120000"
                  value={newProdOriginalPrice}
                  onChange={(e) => setNewProdOriginalPrice(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-stone-700 font-semibold block text-left">
                Mô tả chi tiết và tình trạng *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Mô tả cụ thể để sinh viên biết: có rách trang, xước màn hình, chỗ nhận hàng ở cổng trường HOU..."
                value={newProdDescription}
                onChange={(e) => setNewProdDescription(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl resize-none focus:ring-1 focus:ring-rose-500 outline-none"
              />
            </div>

            {/* AI Assessor Section */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
              {!pricingAnalysis ? (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleAIAssessor}
                    disabled={isAnalyzingPrice || !newProdName}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mx-auto shadow-sm"
                  >
                    {isAnalyzingPrice ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang phân tích cấu hình giá...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-white text-white" />
                        <span>Phân Tích Giá & Khả năng Bán Bằng AI</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-stone-500 mt-2">
                    Dựa trên tên vật phẩm và tình trạng, Gemini sẽ gợi ý khoảng
                    định giá thanh lý tốt nhất.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <span className="text-blue-800 font-bold text-xs flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 fill-blue-500 text-blue-500 animate-pulse" />
                      Báo Cáo Phân Tích AI
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                      Độ tin cậy: {pricingAnalysis.confidence}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-500 block">
                        Biên độ giá hợp lý
                      </span>
                      <span className="font-bold text-stone-800 block mt-0.5">
                        {(
                          pricingAnalysis.suggestedLowerLimit || 0
                        ).toLocaleString("vi-VN")}{" "}
                        -{" "}
                        {(
                          pricingAnalysis.suggestedUpperLimit || 0
                        ).toLocaleString("vi-VN")}{" "}
                        đ
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">
                        Mức giá xuất sắc nhất
                      </span>
                      <span className="font-bold text-rose-600 block mt-0.5 text-sm">
                        {(pricingAnalysis.recommendedPrice || 0).toLocaleString(
                          "vi-VN",
                        )}{" "}
                        đ
                      </span>
                    </div>
                    {pricingAnalysis.schoolSuitabilityScore && (
                      <div className="col-span-2">
                        <span className="text-[10px] text-stone-500 block">
                          Điểm Phù Hợp Môi Trường Học Đường (School Suitability
                          Score)
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${pricingAnalysis.schoolSuitabilityScore}%`,
                              }}
                            />
                          </div>
                          <span className="font-bold text-emerald-600 text-xs">
                            {pricingAnalysis.schoolSuitabilityScore}/100
                          </span>
                        </div>
                      </div>
                    )}
                    {pricingAnalysis.suggestedTags &&
                      pricingAnalysis.suggestedTags.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-[10px] text-stone-500 block">
                            Gợi ý Thẻ Nổi Bật (Tags)
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pricingAnalysis.suggestedTags.map((t: string) => (
                              <span
                                key={t}
                                className="bg-white border border-stone-200 text-stone-600 text-[10px] px-2 py-0.5 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-blue-50 text-[11px] text-stone-600 leading-relaxed italic relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-300 rounded-l-xl"></div>
                    <span className="pl-2 block">
                      {pricingAnalysis.reasoning}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPricingAnalysis(null)}
                      className="text-stone-500 text-xs font-semibold py-1.5 hover:bg-white rounded-lg cursor-pointer"
                    >
                      Làm lại phân tích
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNewProdPrice(
                          String(pricingAnalysis.recommendedPrice),
                        )
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 rounded-lg cursor-pointer transition shadow-sm"
                    >
                      Dùng Giá Đề Xuất
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Image section: upload from device (manual) or preview AI image */}
            {isManualMode ? (
              <div className="space-y-1.5">
                <label className="text-stone-700 font-semibold block text-left">
                  Ảnh sản phẩm{" "}
                  <span className="text-stone-400 font-normal text-xs">
                    (không bắt buộc)
                  </span>
                </label>
                {!manualImagePreview ? (
                  <label
                    htmlFor="manual-image-upload"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-stone-200 hover:border-rose-400 hover:bg-rose-50/20 rounded-xl p-5 text-center cursor-pointer transition-all gap-2"
                  >
                    <Camera className="w-7 h-7 text-stone-300" />
                    <span className="text-xs text-stone-500 font-medium">
                      Nhấn để chọn ảnh từ thiết bị
                    </span>
                    <span className="text-[10px] text-stone-400">
                      JPG, PNG — tối đa 5MB. Ảnh sẽ được lưu trên Cloudinary.
                    </span>
                    <input
                      id="manual-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleManualImageFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-50 max-h-40 flex items-center justify-center">
                    <img
                      src={manualImagePreview}
                      alt="Preview"
                      className="max-h-40 object-contain w-full"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setManualSelectedFile(null);
                        setManualImagePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/85 text-white p-1 rounded-full transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[10px] text-center py-1 font-medium">
                      ✓ Đã chọn — nhấn ✕ để đổi
                    </span>
                  </div>
                )}
              </div>
            ) : uploadedImage ? (
              <div className="space-y-1.5">
                <label className="text-stone-700 font-semibold block text-left">
                  Ảnh sản phẩm
                </label>
                <div className="relative rounded-xl overflow-hidden border border-emerald-200 bg-stone-50 max-h-40 flex items-center justify-center">
                  <img
                    src={uploadedImage}
                    alt="Ảnh AI"
                    className="max-h-40 object-contain w-full"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-emerald-600/80 text-white text-[10px] text-center py-1 font-medium">
                    ✓ Ảnh từ AI — sẽ được upload lên Cloudinary khi đăng tin
                  </span>
                </div>
              </div>
            ) : null}

            {!isStudentVerified && (
              <div className="bg-amber-50 border border-amber-205 text-amber-800 p-3 rounded-xl flex gap-2.5 text-xs text-left">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold block text-amber-900">
                    Tài khoản chưa được kiểm chứng sinh viên!
                  </span>
                  Tin đăng sẽ thiếu nhãn "SV Verified". Hãy tiến hành{" "}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTriggerVerification();
                    }}
                    className="underline font-bold text-rose-600 cursor-pointer"
                  >
                    Xác thực bằng Thẻ sinh viên
                  </button>{" "}
                  để nâng cao uy tín.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer controls */}
        <div className="bg-stone-50 px-4 py-3.5 border-t border-stone-200 flex justify-between items-center shrink-0">
          {postStep === 2 ? (
            <button
              type="button"
              onClick={() => setPostStep(1)}
              className="bg-white hover:bg-stone-100 text-stone-600 border border-stone-300 py-1.5 px-4 rounded-xl text-xs font-semibold cursor-pointer transition active:scale-95"
            >
              ← Quay lại
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-stone-100 text-stone-600 border border-stone-300 py-1.5 px-4 rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              Hủy bỏ
            </button>

            {postStep === 2 && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white py-1.5 px-5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-md transition active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang đăng tin...
                  </>
                ) : (
                  "Đăng Tin Bán"
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
