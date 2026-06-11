import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/server-config";

const mapProductFromDB = (p: any) => {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    originalPrice: Number(p.original_price),
    condition: p.condition,
    description: p.description,
    images: Array.isArray(p.images) ? p.images : (typeof p.images === "string" ? JSON.parse(p.images) : []),
    school: p.school,
    author: p.author,
    authorId: p.author_id,
    isStudentVerified: p.is_student_verified,
    views: Number(p.views),
    likes: Number(p.likes),
    status: p.status,
    suitabilityScore: Number(p.suitability_score),
    tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === "string" ? JSON.parse(p.tags) : []),
    sellerRating: p.seller_rating !== null && p.seller_rating !== undefined ? Number(p.seller_rating) : 4.8,
    sellerReviewCount: p.seller_review_count !== null && p.seller_review_count !== undefined ? Number(p.seller_review_count) : 8,
    createdAt: p.created_at
  };
};

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Database not configured" }, { status: 500 });
  }

  try {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      const mapped = data.map(mapProductFromDB);
      return NextResponse.json({ success: true, products: mapped });
    }
    return NextResponse.json({ success: false, message: error?.message || "Failed to fetch products" }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
