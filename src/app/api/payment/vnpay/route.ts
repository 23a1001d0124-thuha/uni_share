import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const VNPAY_CONFIG = {
  tmnCode: process.env.VNPAY_TMN_CODE || "DEMOV210",  // Thay bằng TMN Code thật từ VNPAY merchant portal
  hashSecret: process.env.VNPAY_HASH_SECRET || "CHANGEME_IN_PRODUCTION",
  url: process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  returnUrl: process.env.VNPAY_RETURN_URL || `${process.env.APP_URL || "http://localhost:3000"}/vnpay-return`,
};

// VNPAY yêu cầu createDate theo giờ Việt Nam (UTC+7), format: yyyyMMddHHmmss
function getVnpayCreateDate(): string {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000); // offset +7h
  return vn.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

function sortObject(obj: Record<string, string>) {
  return Object.keys(obj)
    .sort()
    .reduce((result: Record<string, string>, key) => {
      result[key] = obj[key];
      return result;
    }, {});
}

/**
 * POST /api/payment/vnpay
 * Body: { amount: number, orderId: string, orderInfo?: string }
 * Returns: { paymentUrl: string }
 */
export async function POST(req: NextRequest) {
  try {
    if (!VNPAY_CONFIG.tmnCode || VNPAY_CONFIG.tmnCode === "DEMOV210") {
      return NextResponse.json(
        { error: "Chưa cấu hình VNPAY_TMN_CODE (cần TMN Code thật)" },
        { status: 500 },
      );
    }
    if (!VNPAY_CONFIG.hashSecret || VNPAY_CONFIG.hashSecret === "CHANGEME_IN_PRODUCTION") {
      return NextResponse.json(
        { error: "Chưa cấu hình VNPAY_HASH_SECRET (hash secret thật)" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { amount, orderId } = body as {
      amount: number;
      orderId: string;
      orderInfo?: string;
    };
    const orderInfo = body?.orderInfo ?? `Thanh toan don hang ${orderId}`;

    if (amount === undefined || amount === null || Number(amount) <= 0 || !orderId) {
      return NextResponse.json(
        { error: "Thiếu hoặc không hợp lệ amount/orderId" },
        { status: 400 },
      );
    }


    const createDate = getVnpayCreateDate();

    const vnpParams: Record<string, string> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: VNPAY_CONFIG.tmnCode,
      vnp_Amount: String(Math.round(amount) * 100),
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: "other",
      vnp_Locale: "vn",
      vnp_ReturnUrl: VNPAY_CONFIG.returnUrl,
      vnp_IpAddr:
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1",
      vnp_CreateDate: createDate,
    };

    const sortedParams = sortObject(vnpParams);
    const signData = new URLSearchParams(sortedParams).toString();

    const secureHash = crypto
      .createHmac("sha512", VNPAY_CONFIG.hashSecret)
      .update(signData)
      .digest("hex");

    const paymentUrl =
      `${VNPAY_CONFIG.url}?${signData}&vnp_SecureHash=${secureHash}`;

    return NextResponse.json({ paymentUrl, orderId });
  } catch (err) {
    console.error("[VNPay] Create payment error:", err);
    return NextResponse.json({ error: "Lỗi tạo đường dẫn thanh toán" }, { status: 500 });
  }
}

/**
 * GET /api/payment/vnpay?vnp_*=...
 * VNPay IPN / Return URL handler — verify signature and update order status.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => { if (k !== "vnp_SecureHash" && k !== "vnp_SecureHashType") params[k] = v; });

  const receivedHash = searchParams.get("vnp_SecureHash") || "";
  const sortedParams = sortObject(params);
  const signData = new URLSearchParams(sortedParams).toString();

  const expectedHash = crypto
    .createHmac("sha512", VNPAY_CONFIG.hashSecret)
    .update(signData)
    .digest("hex");

  if (receivedHash.toLowerCase() !== expectedHash.toLowerCase()) {
    return NextResponse.json({ RspCode: "97", Message: "Sai chữ ký" });
  }

  const responseCode = searchParams.get("vnp_ResponseCode");
  const orderId = searchParams.get("vnp_TxnRef");
  const amount = Number(searchParams.get("vnp_Amount") || 0) / 100;

  if (responseCode === "00") {
    // TODO: Update order status in your DB here
    console.log(`[VNPay] Order ${orderId} paid: ${amount} VND`);
    return NextResponse.json({ RspCode: "00", Message: "Confirm Success", orderId, amount });
  }

  return NextResponse.json({ RspCode: responseCode, Message: "Payment failed", orderId });
}