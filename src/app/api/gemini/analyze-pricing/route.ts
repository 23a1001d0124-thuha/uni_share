import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(req: NextRequest) {
  try {
    const { name, condition, originalPrice, description } = await req.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Thiếu tên sản phẩm" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY chưa được cấu hình" },
        { status: 500 }
      );
    }

    const originalPriceText = originalPrice
      ? `Giá mua mới: ${originalPrice.toLocaleString("vi-VN")}đ`
      : "Giá mua mới: không có";

    const prompt = `Bạn là chuyên gia định giá đồ thanh lý sinh viên Việt Nam cho sàn UNI-SHARE.

Thông tin sản phẩm:
- Tên: ${name}
- Tình trạng: ${condition || "Không rõ"}
- ${originalPriceText}
- Mô tả: ${description || "Không có"}

Trả về JSON THUẦN TÚY (không markdown, không backtick):
{
  "suggestedLowerLimit": số nguyên VND (giá thấp nhất hợp lý),
  "suggestedUpperLimit": số nguyên VND (giá cao nhất hợp lý),
  "recommendedPrice": số nguyên VND (giá tối ưu nhất để bán nhanh),
  "confidence": "Cao" | "Trung bình" | "Thấp",
  "schoolSuitabilityScore": số từ 0-100 (mức độ phù hợp môi trường học đường: 100 = rất phù hợp như sách vở, 0 = không phù hợp),
  "suggestedTags": ["tag1", "tag2", "tag3"] (3-5 hashtag ngắn không dấu),
  "reasoning": "Giải thích ngắn gọn 1-2 câu tại sao định giá này hợp lý (tiếng Việt)"
}

Nguyên tắc định giá thanh lý sinh viên Việt Nam:
- Sách giáo trình mới: 30-70% giá gốc; cũ: 15-40%
- Đồ công nghệ mới: 60-80% giá gốc; cũ: 30-55%
- Đồ dùng phòng trọ: 30-60% giá gốc tùy tình trạng
- Không có giá gốc → ước tính theo thị trường sinh viên Hà Nội/TP.HCM
- Ưu tiên giá dễ bán nhanh trong 1-2 tuần

School Suitability Score:
- 90-100: Sách, giáo trình, dụng cụ học tập, văn phòng phẩm
- 70-89: Laptop, máy tính bảng, thiết bị học tập
- 50-69: Đồ dùng phòng trọ thông dụng (ấm, quạt, bàn học)
- 30-49: Quần áo, phụ kiện thời trang
- 10-29: Đồ điện tử giải trí (loa, tai nghe game)
- 0-9: Không liên quan đến học tập

Chỉ trả về JSON, không giải thích thêm.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[analyze-pricing] Gemini API error:", err);
      return NextResponse.json(
        { success: false, error: "Gemini API lỗi" },
        { status: 502 }
      );
    }

    const geminiData = await response.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[analyze-pricing] JSON parse error. Raw:", rawText);
      return NextResponse.json(
        { success: false, error: "AI trả về dữ liệu không hợp lệ" },
        { status: 500 }
      );
    }

    // Validate & sanitize numeric fields
    const safeNum = (v: unknown, fallback: number) =>
      typeof v === "number" && isFinite(v) ? v : fallback;

    analysis.suggestedLowerLimit = safeNum(analysis.suggestedLowerLimit, 0);
    analysis.suggestedUpperLimit = safeNum(analysis.suggestedUpperLimit, 0);
    analysis.recommendedPrice = safeNum(analysis.recommendedPrice, 0);
    analysis.schoolSuitabilityScore = Math.min(
      100,
      Math.max(0, safeNum(analysis.schoolSuitabilityScore, 50))
    );
    if (!Array.isArray(analysis.suggestedTags)) analysis.suggestedTags = [];
    if (!["Cao", "Trung bình", "Thấp"].includes(analysis.confidence)) {
      analysis.confidence = "Trung bình";
    }

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("[analyze-pricing] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi máy chủ nội bộ" },
      { status: 500 }
    );
  }
}