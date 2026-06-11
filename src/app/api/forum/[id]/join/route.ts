import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Thiếu userId!" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("joined_users")
        .eq("id", id)
        .single();

      if (!error && data) {
        let joined: string[] = Array.isArray(data.joined_users)
          ? data.joined_users
          : JSON.parse(data.joined_users || "[]");

        if (joined.includes(userId)) {
          joined = joined.filter((u) => u !== userId); // Toggle off
        } else {
          joined.push(userId); // Toggle on
        }

        const { error: updateError } = await supabase
          .from("forum_posts")
          .update({ joined_users: joined })
          .eq("id", id);

        if (!updateError) {
          return NextResponse.json({ success: true, joinedUsers: joined });
        }
      }
      console.error("Supabase join update failed:", error);
    } catch (err) {
      console.error("Join error:", err);
    }
  }

  return NextResponse.json(
    { success: false, message: "Không tìm thấy bài viết hoặc lỗi kết nối." },
    { status: 404 }
  );
}