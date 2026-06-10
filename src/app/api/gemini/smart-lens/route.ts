import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const CATEGORIES = [
  "Sách & Giáo trình",
  "Thiết bị công nghệ",
  "Đồ dùng phòng trọ",
  "Đồ dùng cá nhân khác",
];

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "Thiếu dữ liệu ảnh" },
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

    // Strip data URL prefix if present, extract mime type
    let mimeType = "image/jpeg";
    let base64Data = imageBase64;
    if (imageBase64.startsWith("data:")) {
      const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    const prompt = `Bạn là trợ lý AI phân tích hình ảnh cho sàn thanh lý đồ sinh viên UNI-SHARE (Việt Nam).

Hãy phân tích hình ảnh sản phẩm này và trả về JSON THUẦN TÚY (không có markdown, không có backtick) với cấu trúc sau:
{
  "name": "Tên sản phẩm ngắn gọn, rõ ràng (tiếng Việt, tối đa 60 ký tự)",
  "category": "Một trong: ${CATEGORIES.join(", ")}",
  "suggestedPrice": Số nguyên (VND, giá thanh lý hợp lý cho sinh viên Việt Nam),
  "condition": "Mô tả tình trạng ngắn gọn (Còn mới / Cũ tốt / Đã qua sử dụng)",
  "description": "Mô tả 1-2 câu về sản phẩm và tình trạng thực tế quan sát được từ ảnh",
  "tags": ["tag1", "tag2", "tag3"] (3-5 hashtag ngắn không dấu, ví dụ: sachtoan, giaycu, laptopcu)
}

Lưu ý định giá:
- Sách giáo trình: 15.000 - 80.000đ
- Đồ công nghệ (tai nghe, chuột, bàn phím): 50.000 - 500.000đ
- Laptop/điện thoại: 1.000.000 - 8.000.000đ
- Đồ dùng phòng trọ (ấm, quạt, nồi...): 30.000 - 300.000đ
- Quần áo, phụ kiện cá nhân: 20.000 - 150.000đ

Chỉ trả về JSON, không giải thích thêm.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[smart-lens] Gemini API error:", err);
      return NextResponse.json(
        { success: false, error: "Gemini API lỗi" },
        { status: 502 }
      );
    }

    const geminiData = await response.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Clean potential markdown fences
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let results;
    try {
      results = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[smart-lens] JSON parse error. Raw:", rawText);
      return NextResponse.json(
        { success: false, error: "AI trả về dữ liệu không hợp lệ" },
        { status: 500 }
      );
    }

    // Validate & sanitize
    if (!CATEGORIES.includes(results.category)) {
      results.category = CATEGORIES[3]; // fallback
    }
    if (typeof results.suggestedPrice !== "number") {
      results.suggestedPrice = 50000;
    }
    if (!Array.isArray(results.tags)) {
      results.tags = [];
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[smart-lens] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi máy chủ nội bộ" },
      { status: 500 }
    );
  }
}