import { NextResponse } from "next/server";
import { getForumData } from "../../../lib/readOnlyApiData";

export async function GET() {
  const data = await getForumData();
  return NextResponse.json(data);
}
