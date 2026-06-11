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
 * POST /api/chats/[roomId]/messages
 * Body: { text: string }
 * Auth: Bearer token required (sender identity from JWT)
 *
 * Inserts a message into the given room and returns the updated room.
 * Socket.IO broadcast is handled by Express server.ts for WS support;
 * here we only persist and return the new state.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  // 1. Authenticate sender
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Yêu cầu đăng nhập để gửi tin nhắn!" },
      { status: 401 }
    );
  }

  let senderId: string;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ!" },
        { status: 403 }
      );
    }
    senderId = decoded.id;
  } catch {
    return NextResponse.json(
      { success: false, message: "Token đã hết hạn!" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { text } = body;

  if (!text || !text.trim()) {
    return NextResponse.json(
      { success: false, message: "Nội dung tin nhắn không được để trống!" },
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
    // Verify room exists and sender belongs to it (buyer or seller)
    const { data: roomRecord, error: roomErr } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomErr || !roomRecord) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phòng thương lượng!" },
        { status: 404 }
      );
    }

    // Security: only buyer or seller can send messages
    if (
      roomRecord.buyer_id !== senderId &&
      roomRecord.seller_id !== senderId
    ) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền gửi tin nhắn trong phòng này!" },
        { status: 403 }
      );
    }

    // Insert message
    const newMsg = {
      id: "msg_" + Date.now(),
      room_id: roomId,
      sender_id: senderId,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const { error: insertErr } = await supabase.from("messages").insert(newMsg);

    if (insertErr) {
      console.error("Message insert failed:", insertErr);
      return NextResponse.json(
        { success: false, message: "Không thể lưu tin nhắn!" },
        { status: 500 }
      );
    }

    // Fetch updated data to assemble room
    const { data: prodRecord } = await supabase
      .from("products")
      .select("*")
      .eq("id", roomRecord.product_id)
      .single();

    const { data: allMessages } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("timestamp", { ascending: true });

    const { data: buyerRecord } = await supabase
      .from("users")
      .select("id, display_name, university_short_name, university_name")
      .eq("id", roomRecord.buyer_id)
      .single();

    const product = prodRecord ? mapProductFromDB(prodRecord) : null;

    const assembledRoom = {
      roomId: roomRecord.id,
      product: {
        id: product ? product.id : roomRecord.product_id,
        name: product ? product.name : "Sản phẩm không hoạt động",
        price: product ? product.price : 0,
        image:
          product?.images?.[0] ||
          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c",
        school: product ? product.school : "Chưa rõ",
      },
      buyer: {
        id: roomRecord.buyer_id,
        name:
          buyerRecord?.display_name || "Người mua",
        school:
          buyerRecord?.university_short_name ||
          buyerRecord?.university_name ||
          "Chưa rõ",
      },
      seller: {
        id: roomRecord.seller_id || (product ? product.authorId : "unknown"),
        name: product ? product.author : "Người bán ẩn danh",
        school: product ? product.school : "Chưa rõ",
        isStudentVerified: product ? product.isStudentVerified : true,
      },
      messages: (allMessages || []).map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        text: m.text,
        timestamp: m.timestamp,
      })),
    };

    const formattedMsg = {
      id: newMsg.id,
      senderId: newMsg.sender_id,
      text: newMsg.text,
      timestamp: newMsg.timestamp,
    };

    return NextResponse.json({
      success: true,
      message: formattedMsg,
      room: assembledRoom,
    });
  } catch (err: any) {
    console.error("Messages POST error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Lỗi server!" },
      { status: 500 }
    );
  }
}