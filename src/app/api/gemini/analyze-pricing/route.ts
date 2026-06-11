import { NextRequest, NextResponse } from "next/server";
import { ai } from "../../../../lib/server-config";

function robustParseJSON(text: string): any {
  let cleanText = (text || "{}").trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return JSON.parse(cleanText);
}

export async function POST(req: NextRequest) {
  try {
    const { name, condition, originalPrice, description } = await req.json();
    if (!name) {
      return NextResponse.json({ success: false, message: "Tên sản phẩm trống!" }, { status: 400 });
    }

    if (!ai) {
      return NextResponse.json({
        success: true,
        simulated: true,
        analysis: {
          suggestedLowerLimit: Math.floor((originalPrice || 200000) * 0.35),
          suggestedUpperLimit: Math.floor((originalPrice || 200000) * 0.55),
          recommendedPrice: Math.floor((originalPrice || 200000) * 0.45),
          confidence: "Cao (92%)",
          schoolSuitabilityScore: Math.floor(Math.random() * 15) + 85,
          suggestedTags: ["Tiết kiệm", "Giá tốt sinh viên", "Xài bền"],
          reasoning: `Dựa vào dữ liệu thị trường sinh viên, sản phẩm "${name}" có tình trạng "${condition || "Cũ"}" thường có mức khấu hao 50-60% giá trị gốc.`
        }
      });
    }

    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Bạn là một trợ lý AI định giá đồ cũ thông minh dành riêng cho sinh viên Việt Nam tại sàn giao dịch UNI-SHARE.
Tên sản phẩm: "${name}"
Tình trạng: "${condition || "Bình thường"}"
Giá mua mới gốc: ${originalPrice || "Chưa rõ"} VND
Mô tả chi tiết: "${description || "Không có mô tả"}"
Trả về JSON duy nhất: suggestedLowerLimit, suggestedUpperLimit, recommendedPrice, confidence, schoolSuitabilityScore, suggestedTags, reasoning.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const data = robustParseJSON(text);

    return NextResponse.json({ success: true, analysis: data });

  } catch (err: any) {
    console.error("Gemini Error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
