import { NextRequest, NextResponse } from "next/server";
import { detectUniversityFromEmail } from "../../../../data/universities";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { success: false, message: "Email query parameter is required" },
      { status: 400 }
    );
  }

  const detected = detectUniversityFromEmail(email);

  if (detected) {
    return NextResponse.json({
      success: true,
      found: true,
      university: {
        name: detected.name,
        shortName: detected.shortName,
        city: detected.city,
      },
    });
  }

  return NextResponse.json({
    success: true,
    found: false,
    suggestion:
      "Nếu trường bạn chưa có trong danh sách, hãy phản hồi về admin@uni-share.app để chúng mình cập nhật kịp thời nhé!",
  });
}
