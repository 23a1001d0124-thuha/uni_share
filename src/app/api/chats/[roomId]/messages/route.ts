import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromReq, errorResponse } from "../../api-utils";
import { supabase } from "../../../lib/server-config";

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  const { roomId } = await params;
  const { text } = await req.json();
  if (!text) return errorResponse("Nội dung tin nhắn trống!");

  const senderId = await getUserIdFromReq(req);
  if (!senderId) return errorResponse("Yêu cầu đăng nhập!", 401);

  if (!supabase) return errorResponse("Database not configured", 500);

  try {
    const newMsg = {
      id: "msg_" + Date.now(),
      room_id: roomId,
      sender_id: senderId,
      text,
      timestamp: new Date().toISOString()
    };
    
    const { error } = await supabase.from("messages").insert(newMsg);
    if (error) return errorResponse(error.message, 500);

    // No need to emit via Socket.io, Supabase Realtime will handle it
    return NextResponse.json({ success: true, message: newMsg });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
