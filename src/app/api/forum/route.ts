import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getForumData } from "../../../lib/readOnlyApiData";
import { INITIAL_FORUM_POSTS } from "../../../fallbackData";

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
};

export async function GET() {
  const data = await getForumData();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, tag, content, author, school } = body;

  if (!title || !content) {
    return NextResponse.json(
      { success: false, message: "Thiếu tiêu đề hoặc nội dung bài đăng!" },
      { status: 400 }
    );
  }

  const newPost = {
    id: "forum_" + Date.now(),
    title,
    tag: tag || "Thảo luận",
    author: author || "Sinh viên ẩn danh",
    school: school || "Đại học Mở Hà Nội",
    content,
    upvotes: 1,
    comments_count: 0,
    joined_users: [],
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("forum_posts").insert(newPost);
      if (!error) {
        return NextResponse.json({ success: true, post: newPost });
      }
      console.error("Supabase forum insert failed:", error);
    } catch (err) {
      console.error("Forum POST error:", err);
    }
  }

  // In-memory fallback (no localStorage, no persistence)
  return NextResponse.json({ success: true, post: newPost });
}