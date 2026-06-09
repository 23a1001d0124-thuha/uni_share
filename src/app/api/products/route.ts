import { NextResponse } from "next/server";
import { getProductsData } from "../../../lib/readOnlyApiData";

export async function GET() {
  const data = await getProductsData();
  return NextResponse.json(data);
}
