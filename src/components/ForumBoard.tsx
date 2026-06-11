import React, { useState, useRef, useEffect } from "react";
import {
  Megaphone,
  Users,
  Plus,
  Star,
  Heart,
  ArrowUp,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ForumPost } from "../types";

interface ForumBoardProps {
  posts: ForumPost[];
  onUpvotePost: (id: string) => Promise<void>;
  onJoinGroupRequest: (id: string) => Promise<void>;
  onPublishPost: (newPost: any) => Promise<void>;
  onAddComment?: (postId: string, text: string) => Promise<void>;
  currentUser?: {
    id: string;
    displayName: string;
    universityName?: string;
  } | null;
}

export const BULLETIN_TAGS = [
  "Thảo luận",
  "Gom mua chung",
  "Phòng trọ & Ở ghép",
  "Hoạt động & Sự kiện",
  "Học tập & Tài liệu",
];

export default function ForumBoard({
  posts,
  onUpvotePost,
  onJoinGroupRequest,
  onPublishPost,
  onAddComment,
  currentUser,
}: ForumBoardProps) {
  const [selectedTag, setSelectedTag] = useState("Tất cả");
  const [isPublishingOpen, setIsPublishingOpen] = useState(false);

  // New Forum Post Input States
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState(BULLETIN_TAGS[0]);
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comments/Discussions Interactive states
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(
    null,
  );
  const [addingCommentText, setAddingCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Auto-scroll to newest comment
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const openPost = posts.find((p) => p.id === openCommentsPostId);
  const commentCount = openPost?.comments?.length ?? 0;
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [commentCount]);

  const handleCommentSubmit = async (postId: string) => {
    if (!addingCommentText.trim() || !onAddComment) return;
    setIsSubmittingComment(true);
    try {
      await onAddComment(postId, addingCommentText.trim());
      setAddingCommentText("");
    } catch (e) {
      console.error(e);
      alert("Gặp lỗi khi tải bình luận thảo luận!");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Filter bulletin posts
  const filteredPosts = posts.filter((p) => {
    if (selectedTag !== "Tất cả" && p.tag !== selectedTag) return false;
    return true;
  });

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) {
      alert("Vui lòng điền đủ tiêu đề và nội dung bài viết!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onPublishPost({
        title: newTitle,
        tag: newTag,
        content: newContent,
        author: currentUser?.displayName || "Sinh viên ẩn danh",
        school: currentUser?.universityName || "Đại học Mở Hà Nội",
      });

      // Reset
      setNewTitle("");
      setNewContent("");
      setIsPublishingOpen(false);
    } catch (e) {
      console.error(e);
      alert("Trục trặc khi đăng tải tin!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="forum-board">
      {/* Upper Billboard */}
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-rose-950 font-display flex items-center gap-2">
            Bản Tin Sinh Viên Toàn Trường
            <Megaphone className="w-4 h-4 text-rose-600 animate-bounce" />
            <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Trực tiếp
            </span>
          </h3>
          <p className="text-xs text-rose-800 mt-1">
            Nơi gom đơn mua chung, tìm phòng ở ghép, lập team học nhóm và đăng
            ký các hoạt động sinh viên hữu ích.
          </p>
        </div>

        <button
          onClick={() => setIsPublishingOpen(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2.5 px-5 font-bold text-xs flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tạo bản tin mới
        </button>
      </div>

      {/* Bullet Category Pill controls */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-stone-200">
        <button
          onClick={() => setSelectedTag("Tất cả")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            selectedTag === "Tất cả"
              ? "bg-stone-900 text-white font-bold"
              : "bg-stone-105 text-stone-600 hover:bg-stone-200"
          }`}
        >
          Tất cả tin đăng
        </button>
        {BULLETIN_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedTag === tag
                ? "bg-stone-900 text-white font-bold"
                : "bg-stone-105 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Post Feeds list */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div
            className="bg-stone-50/50 border border-stone-200 py-12 px-6 text-center rounded-3xl space-y-3 flex flex-col items-center justify-center animate-fadeIn"
            id="forum-empty-state"
          >
            <span className="text-4xl block animate-pulse select-none">📣</span>
            <h4 className="font-bold text-stone-700 text-xs font-display uppercase tracking-wide">
              Bắc cầu giao lưu sinh viên
            </h4>
            <p className="text-[11px] text-stone-400 max-w-xs mx-auto leading-relaxed">
              Mục này hiện đang trống. Hãy click nút "Tạo bản tin mới" ở góc
              trên để kết nối câu chuyện của riêng bạn với sinh viên toàn
              trường!
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const hasJoined = post.joinedUsers.includes(currentUser?.id || "");
            return (
              <div
                key={post.id}
                className="bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-xs transition relative space-y-4"
              >
                {/* Header author info */}
                <div className="flex justify-between items-start gap-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 border border-stone-200 flex items-center justify-center font-bold">
                      {post.author[0]}
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 block">
                        {post.author}
                      </span>
                      <span className="text-[10px] text-stone-400 block">
                        Trường {post.school}
                      </span>
                    </div>
                  </div>
                  <span className="bg-rose-50 text-rose-700 rounded-lg py-1 px-3.5 font-bold text-[10px] uppercase tracking-wider">
                    {post.tag}
                  </span>
                </div>

                {/* Content statement */}
                <div className="space-y-2 text-sm text-stone-800">
                  <h4 className="font-extrabold text-stone-950 font-display text-sm leading-snug">
                    {post.title}
                  </h4>
                  <p className="text-stone-600 text-xs leading-relaxed font-normal whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>

                {/* --- SMART CO-BUY HUB SECTION --- */}
                {post.tag === "Gom mua chung" && post.targetMembers && (
                  <div className="bg-stone-50/50 border border-stone-200/60 rounded-2xl p-3 flex flex-col md:flex-row gap-4 items-start md:items-center mt-2">
                    {post.productImage && (
                      <div className="w-20 h-20 shrink-0 bg-white rounded-xl border border-stone-200 p-1">
                        <img
                          src={post.productImage}
                          alt="Gom chung"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-stone-700">
                          Mục tiêu gom sỉ
                        </span>
                        <div className="text-right">
                          <span className="text-rose-600 font-black text-sm">
                            {(post.currentPrice || 0).toLocaleString("vi-VN")}đ
                          </span>
                          <span className="text-[10px] text-stone-400 line-through ml-1.5">
                            {(post.originalPrice || 0).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </div>

                      {/* Percent progress var */}
                      {(() => {
                        const progress = Math.min(
                          ((post.joinedUsers.length + 1) /
                            (post.targetMembers || 1)) *
                            100,
                          100,
                        );
                        const isSuccess =
                          progress >= 100 || post.isGroupBuyCompleted;
                        return (
                          <>
                            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${isSuccess ? "bg-emerald-500" : "bg-rose-500"}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-semibold text-stone-600">
                                Đã tham gia {post.joinedUsers.length + 1}/
                                {post.targetMembers} người
                              </span>
                              <span className="font-bold text-emerald-600">
                                -{" "}
                                {Math.floor(
                                  (1 -
                                    (post.currentPrice || 0) /
                                      (post.originalPrice || 1)) *
                                    100,
                                )}
                                %
                              </span>
                            </div>

                            {isSuccess && (
                              <div className="mt-1 bg-emerald-50 text-emerald-700 text-[10px] px-2 py-1.5 rounded-lg border border-emerald-100 font-bold flex items-center justify-center animate-pulse">
                                🎉 GOM THÀNH CÔNG! ĐANG GHÉP ĐƠN COUPON!
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
                {/* --- END SMART CO-BUY --- */}

                {/* Actions & Metrics line */}
                <div className="pt-3.5 border-t border-stone-100 flex items-center justify-between">
                  <div className="flex gap-4">
                    {/* Upvote controller */}
                    <button
                      onClick={() => onUpvotePost(post.id)}
                      className="flex items-center gap-1.5 text-stone-500 hover:text-rose-600 text-xs font-bold transition cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                      Hữu ích ({post.upvotes})
                    </button>

                    <button
                      onClick={() => {
                        if (openCommentsPostId === post.id) {
                          setOpenCommentsPostId(null);
                        } else {
                          setOpenCommentsPostId(post.id);
                          setAddingCommentText("");
                        }
                      }}
                      className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 text-xs font-black transition cursor-pointer hover:bg-rose-50 border border-rose-100 bg-white shadow-2xs px-3 py-1.5 rounded-xl"
                      title="Bấm để đọc thảo luận và gửi bình luận của bạn cùng bạn bè"
                    >
                      💬 Đọc và Thảo luận ({post.commentsCount})
                    </button>
                  </div>

                  {/* Join trigger if group buy or activity */}
                  {(post.tag === "Gom mua chung" ||
                    post.tag === "Hoạt động & Sự kiện" ||
                    post.tag === "Phòng trọ & Ở ghép") && (
                    <button
                      onClick={() => onJoinGroupRequest(post.id)}
                      className={`py-1.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        hasJoined
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {hasJoined ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Đã đăng ký ({post.joinedUsers.length})
                        </>
                      ) : (
                        <>
                          <Users className="w-3.5 h-3.5" />
                          Tham gia ngay ({post.joinedUsers.length})
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Collapsible Discussion Section */}
                {openCommentsPostId === post.id && (
                  <div className="mt-3 pt-4 border-t border-dashed border-stone-200 bg-stone-50/50 p-4 rounded-xl space-y-3.5 animate-fadeIn">
                    <h5 className="font-black text-rose-800 text-[10.5px] uppercase tracking-wide flex flex-col md:flex-row md:items-center justify-between gap-1 pb-1.5 border-b border-stone-150">
                      <span>
                        💬 PHÒNG THẢO LUẬN KHUÔN VIÊN TRƯỜNG (
                        {post.commentsCount} Bình luận)
                      </span>
                      <span className="text-[9px] font-medium text-stone-500 normal-case italic block">
                        Đọc & gửi thảo luận trao đổi cùng mọi học sinh. Bình
                        luận mới được tính vào tổng thảo luận ngoài.
                      </span>
                    </h5>

                    {/* Comments List */}
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {!post.comments || post.comments.length === 0 ? (
                        <p className="text-[11px] text-stone-400 font-medium italic py-2 text-center bg-white rounded-xl border border-stone-100">
                          Chưa có thảo luận nào cho bài viết này. Hãy đăng bình
                          luận đầu tiên bên dưới để trao đổi cùng bạn học!
                        </p>
                      ) : (
                        <>
                          {post.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="bg-white p-3 rounded-xl border border-stone-150 shadow-3xs space-y-1"
                            >
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-rose-700">
                                  {comment.author}
                                </span>
                                <span className="text-stone-400 text-[9px]">
                                  {comment.school}
                                </span>
                              </div>
                              <p className="text-stone-700 text-xs font-medium leading-relaxed">
                                {comment.content}
                              </p>
                            </div>
                          ))}
                          <div
                            ref={
                              openCommentsPostId === post.id
                                ? commentsEndRef
                                : null
                            }
                          />
                        </>
                      )}
                    </div>

                    {/* New Comment Submission Form */}
                    <div className="flex gap-2 items-center pt-2">
                      <input
                        type="text"
                        placeholder="Viết câu hỏi hoặc thảo luận của bạn tại đây..."
                        value={addingCommentText}
                        onChange={(e) => setAddingCommentText(e.target.value)}
                        className="flex-1 p-2.5 bg-white border border-stone-250 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-rose-400 transition"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCommentSubmit(post.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleCommentSubmit(post.id)}
                        disabled={
                          isSubmittingComment || !addingCommentText.trim()
                        }
                        className="bg-stone-900 hover:bg-stone-950 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4.5 rounded-xl transition cursor-pointer whitespace-nowrap"
                      >
                        {isSubmittingComment ? "Đang gửi..." : "Gửi"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: WRITE BULLETIN NEW CORNER */}
      {isPublishingOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handlePublishSubmit}
            className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-xl max-h-[95vh] flex flex-col"
          >
            {/* Header */}
            <div className="bg-rose-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-semibold text-base font-display">
                Tạo Bài Đăng Bản Tin Mới
              </h3>
              <button
                type="button"
                onClick={() => setIsPublishingOpen(false)}
                className="text-white hover:text-white/80 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Inputs Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-sm">
              <div className="space-y-1">
                <label className="text-stone-700 font-bold">
                  Tiêu đề bản tin *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Gom đơn mua nước rửa tay, Tìm bạn cùng rủ chạy bộ hồ tây..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">
                  Chuyên mục bản tin *
                </label>
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-250 rounded-xl"
                >
                  {BULLETIN_TAGS.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-bold">
                  Nội dung chi tiết *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Viết chi tiết kế hoạch gom chung, địa chỉ nhận hàng, phương thức liên lạc chia tiền..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-stone-50 px-4 py-3 border-t border-stone-200 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsPublishingOpen(false)}
                className="bg-white hover:bg-stone-100 text-stone-600 border border-stone-300 py-1.5 px-4 rounded-xl font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-1.5 px-5 font-bold cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 inline-block" />
                    Đang tải đăng...
                  </>
                ) : (
                  "Đăng bản tin"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
