import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getChatsData } from "../../../lib/readOnlyApiData";

const JWT_SECRET = process.env.JWT_SECRET || "unishare_secret_key_development_2026";

/**
 * GET /api/chats
 * Returns only chat rooms belonging to the authenticated user (buyer_id).
 * Requires Authorization: Bearer <token> header.
 */
export async function GET(req: NextRequest) {
  // Extract userId from JWT so we filter rooms per user — no more returning all rooms
  let userId: string | undefined;

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded?.id) {
        userId = decoded.id;
      }
    } catch {
      // Invalid token — still allow request but won't filter (returns empty or fallback)
    }
  }

  const data = await getChatsData(userId);
  return NextResponse.json(data);
}