import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
};

const mapCommentFromDB = (c: any) => ({
  id: c.id,
  author: c.author,
  school: c.school,
  content: c.content,
  createdAt: c.created_at,
});

const mapForumPostFromDB = (f: any, comments: any[] = []) => ({
  id: f.id,
  title: f.title,
  tag: f.tag,
  author: f.author,
  school: f.school,
  content: f.content,
  upvotes: Number(f.upvotes),
  commentsCount: Number(f.comments_count),
  comments,
  joinedUsers: Array.isArray(f.joined_users)
    ? f.joined_users
    : JSON.parse(f.joined_users || "[]"),
  targetMembers: f.target_members,
  currentPrice: f.current_price,
  originalPrice: f.original_price,
  productImage: f.product_image,
  isGroupBuyCompleted: f.is_group_buy_completed,
  createdAt: f.created_at,
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json();
  const { author, school, content } = body;

  if (!content?.trim()) {
    return NextResponse.json(
      { success: false, message: "Nội dung bình luận không được để trống!" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  if (supabase) {
    try {
      const commentId = "comment_" + Date.now();
      const newComment = {
        id: commentId,
        post_id: id,
        author: author || "Sinh viên ẩn danh",
        school: school || "Đại học Mở Hà Nội",
        content,
        created_at: new Date().toISOString(),
      };

      const { error: commentErr } = await supabase
        .from("forum_comments")
        .insert(newComment);

      if (!commentErr) {
        // Update comments_count on the post
        const { data: postData } = await supabase
          .from("forum_posts")
          .select("comments_count")
          .eq("id", id)
          .single();

        const newCount = (postData ? Number(postData.comments_count) : 0) + 1;

        await supabase
          .from("forum_posts")
          .update({ comments_count: newCount })
          .eq("id", id);

        // Re-fetch the full post + comments to return authoritative state
        const { data: updatedPost } = await supabase
          .from("forum_posts")
          .select("*")
          .eq("id", id)
          .single();

        const { data: allComments } = await supabase
          .from("forum_comments")
          .select("*")
          .eq("post_id", id)
          .order("created_at", { ascending: true });

        const mappedComments = (allComments || []).map(mapCommentFromDB);

        return NextResponse.json({
          success: true,
          comment: mapCommentFromDB(newComment),
          commentsCount: newCount,
          post: mapForumPostFromDB(updatedPost, mappedComments),
        });
      }
      console.error("Supabase comment insert failed:", commentErr);
    } catch (err) {
      console.error("Comment POST error:", err);
    }
  }

  return NextResponse.json(
    { success: false, message: "Lỗi kết nối database. Vui lòng thử lại!" },
    { status: 500 }
  );
}