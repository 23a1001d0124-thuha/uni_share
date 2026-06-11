import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
};

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("upvotes")
        .eq("id", id)
        .single();

      if (!error && data) {
        const newUpvotes = Number(data.upvotes) + 1;
        const { error: updateError } = await supabase
          .from("forum_posts")
          .update({ upvotes: newUpvotes })
          .eq("id", id);

        if (!updateError) {
          return NextResponse.json({ success: true, upvotes: newUpvotes });
        }
      }
      console.error("Supabase upvote failed:", error);
    } catch (err) {
      console.error("Upvote error:", err);
    }
  }

  return NextResponse.json(
    { success: false, message: "Không tìm thấy bài viết hoặc lỗi kết nối." },
    { status: 404 }
  );
}