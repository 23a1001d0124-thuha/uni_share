import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const JWT_SECRET = process.env.JWT_SECRET || "unishare_secret_key_development_2026";

const createSupabaseClient = () => {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
};

const mapProductFromDB = (p: any) => {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    images: Array.isArray(p.images)
      ? p.images
      : typeof p.images === "string"
        ? JSON.parse(p.images)
        : [],
    school: p.school,
    author: p.author,
    authorId: p.author_id,
    isStudentVerified: p.is_student_verified,
  };
};

/**
 * POST /api/chats/find-or-create
 * Body: { productId: string }
 * Auth: Bearer token required (buyer identity from JWT)
 *
 * Finds an existing room for (productId, buyerId) or creates one.
 * Returns the assembled ChatRoom object.
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate buyer
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Yêu cầu đăng nhập để mở phòng thương lượng!" },
      { status: 401 }
    );
  }

  let buyerId: string;
  let buyerName: string = "Người mua";
  let buyerSchool: string = "Chưa rõ";

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ!" },
        { status: 403 }
      );
    }
    buyerId = decoded.id;
  } catch {
    return NextResponse.json(
      { success: false, message: "Token đã hết hạn hoặc không hợp lệ!" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { productId } = body;

  if (!productId) {
    return NextResponse.json(
      { success: false, message: "Thiếu productId!" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { success: false, message: "Database chưa được cấu hình!" },
      { status: 503 }
    );
  }

  try {
    // Fetch buyer info for room assembly
    const { data: buyerRecord } = await supabase
      .from("users")
      .select("id, display_name, university_short_name, university_name")
      .eq("id", buyerId)
      .single();

    if (buyerRecord) {
      buyerName = buyerRecord.display_name || "Người mua";
      buyerSchool =
        buyerRecord.university_short_name ||
        buyerRecord.university_name ||
        "Chưa rõ";
    }

    // Fetch product
    const { data: prodRecord } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (!prodRecord) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy sản phẩm!" },
        { status: 404 }
      );
    }

    const product = mapProductFromDB(prodRecord);

    // Check if room already exists for this (product, buyer) pair
    const { data: existingRooms } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("product_id", productId)
      .eq("buyer_id", buyerId)
      .limit(1);

    let roomRecord: any;

    if (existingRooms && existingRooms.length > 0) {
      roomRecord = existingRooms[0];
    } else {
      // Create new room
      const newRoomId = "room_" + Date.now();
      const newRoom = {
        id: newRoomId,
        product_id: productId,
        buyer_id: buyerId,
        seller_id: product.authorId,
        created_at: new Date().toISOString(),
      };

      const { error: insertRoomErr } = await supabase
        .from("chat_rooms")
        .insert(newRoom);

      if (insertRoomErr) {
        console.error("Failed to create chat room:", insertRoomErr);
        return NextResponse.json(
          { success: false, message: "Không thể tạo phòng thương lượng!" },
          { status: 500 }
        );
      }

      // Insert system welcome message
      const initMsg = {
        id: "msg_init_" + Date.now(),
        room_id: newRoomId,
        sender_id: "system",
        text: `Kết nối thành công! Bạn đang hỏi mua sản phẩm "${product.name}" từ ${product.author}. Hãy trao đổi lịch hẹn văn minh tại trường học nhé!`,
        timestamp: new Date().toISOString(),
      };
      await supabase.from("messages").insert(initMsg);

      roomRecord = newRoom;
    }

    // Fetch messages for the room
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomRecord.id)
      .order("timestamp", { ascending: true });

    // Assemble response
    const assembledRoom = {
      roomId: roomRecord.id,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c",
        school: product.school,
      },
      buyer: {
        id: buyerId,
        name: buyerName,
        school: buyerSchool,
      },
      seller: {
        id: product.authorId,
        name: product.author,
        school: product.school,
        isStudentVerified: product.isStudentVerified,
      },
      messages: (messages || []).map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        text: m.text,
        timestamp: m.timestamp,
      })),
    };

    return NextResponse.json({ success: true, room: assembledRoom });
  } catch (err: any) {
    console.error("find-or-create error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Lỗi server!" },
      { status: 500 }
    );
  }
}