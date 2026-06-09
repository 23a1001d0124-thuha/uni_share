import { NextResponse } from "next/server";
import { getChatsData } from "../../../lib/readOnlyApiData";

export async function GET() {
  const data = await getChatsData();
  return NextResponse.json(data);
}
