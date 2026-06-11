import React, { useState } from "react";
import { Star } from "lucide-react";

interface RatingModalProps {
  isOpen: boolean;
  productName: string;
  sellerName: string;
  onSubmit: (score: number, comment: string) => void;
  onSkip: () => void;
}

export default function RatingModal({
  isOpen,
  productName,
  sellerName,
  onSubmit,
  onSkip,
}: RatingModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  const labels = ["Tệ", "Không tốt", "Ổn", "Tốt", "Tuyệt vời!"];
  const currentDisplayRating = hoverRating || rating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    onSubmit(rating, comment);
    // Reset state
    setRating(0);
    setHoverRating(0);
    setComment("");
  };

  const handleSkipClick = () => {
    setRating(0);
    setHoverRating(0);
    setComment("");
    onSkip();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center transition-opacity" id="rating-modal-overlay">
      <div 
        className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-6 shadow-2xl transition-all transform animate-slideUp md:animate-zoomIn flex flex-col gap-4 text-center max-h-[90vh] overflow-y-auto"
        id="rating-modal-card"
      >
        {/* Header content */}
        <div>
          <div className="text-4xl mb-2" aria-hidden="true">🎉</div>
          <h3 className="font-semibold text-lg text-stone-900 font-display">Giao dịch hoàn tất!</h3>
          <p className="text-stone-500 text-xs mt-1">
            Bạn nghĩ sao về <strong className="text-stone-850">{sellerName}</strong> khi mua <em className="not-italic text-rose-600 font-semibold">"{productName}"</em>?
          </p>
        </div>

        {/* 5 Interactive Stars and display feedback label */}
        <div className="flex flex-col items-center justify-center my-1 select-none">
          <div className="flex gap-2.5 justify-center py-2" role="radiogroup" aria-label="Đánh giá bằng sao">
            {[1, 2, 3, 4, 5].map((starValue) => {
              const isHighlighted = starValue <= currentDisplayRating;
              return (
                <button
                  key={starValue}
                  type="button"
                  onClick={() => setRating(starValue)}
                  onMouseEnter={() => setHoverRating(starValue)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-transform duration-75 active:scale-125 p-1 hover:scale-110 cursor-pointer min-w-11 min-h-11 flex items-center justify-center"
                  role="radio"
                  aria-checked={rating === starValue}
                  aria-label={`${starValue} sao - ${labels[starValue - 1]}`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      isHighlighted 
                        ? "fill-amber-400 text-amber-400" 
                        : "text-stone-200"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          {currentDisplayRating > 0 ? (
            <span className="text-amber-600 font-bold text-xs bg-amber-50 px-2.5 py-0.5 rounded-full mt-1.5 animate-fadeIn">
              {labels[currentDisplayRating - 1]}
            </span>
          ) : (
            <span className="text-stone-400 font-medium text-xs mt-1.5">Chọn mức độ hài lòng</span>
          )}
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="sr-only" htmlFor="rating-comment">Bình luận chi tiết</label>
            <textarea
              id="rating-comment"
              placeholder="Hàng đúng mô tả, người bán nhiệt tình... (tùy chọn)"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-stone-50 rounded-xl border border-stone-200 p-3 w-full resize-none text-xs focus:ring-1 focus:ring-rose-500 hover:border-stone-300 focus:outline-none focus:bg-white text-stone-800 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={rating === 0}
              className={`w-full font-bold text-xs py-3 rounded-xl transition-all active:scale-[0.98] shadow-sm flex items-center justify-center min-h-[44px] cursor-pointer ${
                rating > 0 
                  ? "bg-rose-600 text-white hover:bg-rose-700" 
                  : "bg-stone-105 text-stone-300 cursor-not-allowed"
              }`}
            >
              Gửi đánh giá
            </button>
            <button
              type="button"
              onClick={handleSkipClick}
              className="w-full text-stone-400 hover:text-stone-600 transition font-semibold text-xs py-2.5 min-h-[44px] cursor-pointer"
            >
              Bỏ qua
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
