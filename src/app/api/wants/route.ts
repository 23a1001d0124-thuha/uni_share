import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/server-config";

export async function GET() {
  if (!supabase) return NextResponse.json({ success: false, message: "DB error" }, { status: 500 });
  const { data, error } = await supabase.from("wants").select("*").order("created_at", { ascending: false });
  return NextResponse.json({ success: true, wants: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, category, budget, schoolFilter, description, buyer, buyerSchool } = body;
  if (!supabase) return NextResponse.json({ success: false, message: "DB error" }, { status: 500 });

  const newWant = {
    id: "want_" + Date.now(),
    title, category, budget,
    school_filter: schoolFilter || "Mọi trường",
    description: description || "",
    buyer: buyer || "Sinh viên",
    buyer_school: buyerSchool || "Chưa rõ",
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from("wants").insert(newWant);
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true, want: newWant });
}
