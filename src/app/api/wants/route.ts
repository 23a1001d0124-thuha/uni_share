import { NextResponse } from "next/server";
import { getWantsData } from "../../../lib/readOnlyApiData";

export async function GET() {
  const data = await getWantsData();
  return NextResponse.json(data);
}
