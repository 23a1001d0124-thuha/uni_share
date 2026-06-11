import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/server-config";

export async function GET() {
  if (!supabase) return NextResponse.json({ success: false, message: "DB error" }, { status: 500 });
  
  const { data: posts, error: postsError } = await supabase.from("forum_posts").select("*").order("created_at", { ascending: false });
  const { data: comments, error: commentsError } = await supabase.from("forum_comments").select("*").order("created_at", { ascending: true });
  
  if (postsError) return NextResponse.json({ success: false, message: postsError.message }, { status: 500 });

  const mapped = (posts || []).map(p => ({
    ...p,
    id: p.id,
    title: p.title,
    tag: p.tag,
    author: p.author,
    school: p.school,
    content: p.content,
    upvotes: Number(p.upvotes),
    commentsCount: Number(p.comments_count),
    comments: (comments || [])
      .filter(c => c.post_id === p.id)
      .map(c => ({
        id: c.id,
        postId: c.post_id,
        author: c.author,
        school: c.school,
        content: c.content,
        createdAt: c.created_at
      })),
    joinedUsers: Array.isArray(p.joined_users) ? p.joined_users : JSON.parse(p.joined_users || "[]"),
    createdAt: p.created_at
  }));

  return NextResponse.json({ success: true, forumPosts: mapped });
}

export async function POST(req: NextRequest) {
  const { title, tag, content, author, school } = await req.json();
  if (!supabase) return NextResponse.json({ success: false, message: "DB error" }, { status: 500 });

  const newPost = {
    id: "forum_" + Date.now(),
    title,
    tag: tag || "Thảo luận",
    author: author || "Sinh viên",
    school: school || "Chưa rõ",
    content,
    upvotes: 1,
    comments_count: 0,
    joined_users: [],
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from("forum_posts").insert(newPost);
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  return NextResponse.json({ success: true, post: newPost });
}
