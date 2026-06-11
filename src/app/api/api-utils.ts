import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../lib/server-config";

export async function getUserIdFromReq(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded?.id || null;
  } catch { return null; }
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ success: false, message }, { status });
}
