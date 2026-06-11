import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import multer from "multer";
import { Server as SocketIOServer } from "socket.io";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import authRouter from "./src/routes/auth.ts";
import { detectUniversityFromEmail } from "./src/data/universities.ts";
import ws from "ws";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "unishare_secret_key_development_2026";

function getUserIdFromReq(req: any): string | null {
  const authHeader = req.headers["authorization"] as string | undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded?.id || null;
  } catch { return null; }
}

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);
const PORT = 3000;

// Set up server side image upload limit first
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize the GoogleGenAI client on the server side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not defined!");
}

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { transport: ws },
    })
  : null;
// const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
let listingReports: any[] = [];
let sellerReviews: any[] = [];
let notificationsStore: any[] = [];
let transactionsStore: any[] = [];
let listingAnalyticsStore: any[] = [];

// Database schema mappers between PostrgeSQL (snake_case) and JSON interface (camelCase)
const mapProductFromDB = (p: any) => {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    originalPrice: Number(p.original_price),
    condition: p.condition,
    description: p.description,
    images: Array.isArray(p.images) ? p.images : (typeof p.images === "string" ? JSON.parse(p.images) : []),
    school: p.school,
    author: p.author,
    authorId: p.author_id,
    isStudentVerified: p.is_student_verified,
    views: Number(p.views),
    likes: Number(p.likes),
    status: p.status,
    suitabilityScore: Number(p.suitability_score),
    tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === "string" ? JSON.parse(p.tags) : []),
    sellerRating: p.seller_rating !== null && p.seller_rating !== undefined ? Number(p.seller_rating) : 4.8,
    sellerReviewCount: p.seller_review_count !== null && p.seller_review_count !== undefined ? Number(p.seller_review_count) : 8,
    createdAt: p.created_at
  };
};

const mapProductToDB = (p: any) => {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    original_price: p.originalPrice,
    condition: p.condition,
    description: p.description,
    images: p.images || [],
    school: p.school,
    author: p.author,
    author_id: p.authorId,
    is_student_verified: p.isStudentVerified,
    views: p.views || 0,
    likes: p.likes || 0,
    status: p.status || "Đang bán",
    suitability_score: p.suitabilityScore || 90,
    tags: p.tags || [],
    seller_rating: p.sellerRating || 4.8,
    seller_review_count: p.sellerReviewCount || 8,
    created_at: p.createdAt
  };
};

const mapWantFromDB = (w: any) => {
  if (!w) return null;
  return {
    id: w.id,
    title: w.title,
    category: w.category,
    budget: w.budget,
    schoolFilter: w.school_filter,
    description: w.description,
    buyer: w.buyer,
    buyerSchool: w.buyer_school,
    createdAt: w.created_at
  };
};

const mapWantToDB = (w: any) => {
  return {
    id: w.id,
    title: w.title,
    category: w.category,
    budget: w.budget,
    school_filter: w.schoolFilter,
    description: w.description,
    buyer: w.buyer,
    buyer_school: w.buyerSchool,
    created_at: w.createdAt
  };
};

const mapForumPostFromDB = (f: any, comments: any[] = []) => {
  if (!f) return null;
  return {
    id: f.id,
    title: f.title,
    tag: f.tag,
    author: f.author,
    school: f.school,
    content: f.content,
    upvotes: Number(f.upvotes),
    commentsCount: Number(f.comments_count),
    comments: comments || [],
    joinedUsers: Array.isArray(f.joined_users) ? f.joined_users : (typeof f.joined_users === "string" ? JSON.parse(f.joined_users) : []),
    targetMembers: f.target_members,
    currentPrice: f.current_price,
    originalPrice: f.original_price,
    productImage: f.product_image,
    isGroupBuyCompleted: f.is_group_buy_completed,
    createdAt: f.created_at
  };
};

const mapForumPostToDB = (f: any) => {
  return {
    id: f.id,
    title: f.title,
    tag: f.tag,
    author: f.author,
    school: f.school,
    content: f.content,
    upvotes: f.upvotes || 1,
    comments_count: f.commentsCount || 0,
    joined_users: f.joinedUsers || [],
    target_members: f.targetMembers,
    current_price: f.currentPrice,
    original_price: f.originalPrice,
    product_image: f.productImage,
    is_group_buy_completed: f.isGroupBuyCompleted,
    created_at: f.createdAt
  };
};

const mapCommentFromDB = (c: any) => {
  if (!c) return null;
  return {
    id: c.id,
    postId: c.post_id,
    author: c.author,
    school: c.school,
    content: c.content,
    createdAt: c.created_at
  };
};

const assembleChatRoom = async (
  room: any,
  allProducts: any[],
  messagesList: any[],
  allUsers: any[] = [],
  viewerUserId?: string   // userId của người đang xem — để đặt "seller" = đối phương
) => {
  if (!room) return null;
  const prod = allProducts.find((p: any) => p.id === room.product_id);
  const roomMsgs = messagesList
    .filter((m: any) => m.room_id === room.id)
    .map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      text: m.text,
      timestamp: m.timestamp
    }));

  const buyerRecord  = allUsers.find((u: any) => u.id === room.buyer_id);
  const sellerRecord = allUsers.find((u: any) => u.id === (room.seller_id || (prod ? prod.authorId : null)));

  const buyerName  = buyerRecord?.display_name  || "Người mua";
  const buyerSchool  = buyerRecord?.university_short_name  || buyerRecord?.university_name  || "Chưa rõ";
  const sellerName = prod ? prod.author : (sellerRecord?.display_name || "Người bán ẩn danh");
  const sellerSchool = prod ? prod.school : (sellerRecord?.university_short_name || sellerRecord?.university_name || "Chưa rõ");
  const sellerVerified = prod ? prod.isStudentVerified : true;

  // "chatPartner" = người đối diện với viewerUserId
  // Nếu viewer là seller → partner là buyer; ngược lại → partner là seller
  const viewerIsSeller = viewerUserId && viewerUserId === (room.seller_id || (prod ? prod.authorId : null));
  const chatPartner = viewerIsSeller
    ? { id: room.buyer_id, name: buyerName, school: buyerSchool, isStudentVerified: buyerRecord?.is_student_verified || false }
    : { id: room.seller_id || (prod ? prod.authorId : "unknown"), name: sellerName, school: sellerSchool, isStudentVerified: sellerVerified };

  return {
    roomId: room.id,
    viewerRole: viewerIsSeller ? "seller" : "buyer",   // để FE biết ai đang xem
    product: {
      id: prod ? prod.id : room.product_id,
      name: prod ? prod.name : "Sản phẩm không hoạt động",
      price: prod ? prod.price : 0,
      image: prod && prod.images?.[0] ? prod.images[0] : "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c",
      school: prod ? prod.school : "Chưa rõ"
    },
    buyer: {
      id: room.buyer_id || "unknown",
      name: buyerName,
      school: buyerSchool
    },
    seller: chatPartner,   // luôn = đối phương của người đang xem
    messages: roomMsgs
  };
};

// Global In-Memory Database State (used as fallback and as seeding blueprint)
let products = [
  {
    id: "prod_mine_1",
    name: "Sách Kinh Tế Học Vi Mô HOU (Giáo trình Bạn)",
    category: "Sách & Giáo trình",
    price: 35000,
    originalPrice: 110000,
    condition: "Còn mới 95%",
    description: "Sách học của tôi kì trước, bìa kính sạch đẹp không tì vết, có đầy đủ đề thi khảo sát của trường HOU lấy hên thi đạt điểm A.",
    images: ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Mở Hà Nội",
    author: "Nguyễn Thu Hạ (Bạn)",
    authorId: "user_client_default",
    isStudentVerified: true,
    views: 18,
    likes: 3,
    status: "Đang bán",
    suitabilityScore: 99,
    createdAt: new Date().toISOString(),
  },
  {
    id: "prod_mine_2",
    name: "Quạt Hộp Để Bàn Học KTX Senko",
    category: "Đồ dùng phòng trọ",
    price: 120000,
    originalPrice: 280000,
    condition: "Cũ tốt 80-85%",
    description: "Quạt bàn Senko gọn nhẹ, làm mát đằm phòng trọ 12-15m2 cực kỳ êm dể chịu, phích cắm 2 chân tiện lợi, nhượng lại để chuyển sang KTX ở.",
    images: ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Mở Hà Nội",
    author: "Nguyễn Thu Hạ (Bạn)",
    authorId: "user_client_default",
    isStudentVerified: true,
    views: 29,
    likes: 6,
    status: "Đang bán",
    suitabilityScore: 96,
    createdAt: new Date().toISOString(),
  },
  {
    id: "prod_1",
    name: "Sách Giáo Trình Kinh Tế Vĩ Mô - FTU",
    category: "Sách & Giáo trình",
    price: 45000,
    originalPrice: 120000,
    condition: "Còn mới 90%",
    description: "Sách giáo trình mới học kỳ trước, không bị nháp bẩn nhiều, chỉ highlight vài dòng chương 3. Rất thích hợp cho các bạn K62 FTU chuẩn bị học môn này.",
    images: ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Ngoại Thương",
    author: "Nguyễn Văn Hùng",
    authorId: "user_student_hung",
    isStudentVerified: true,
    views: 42,
    likes: 8,
    status: "Đang bán",
    suitabilityScore: 95,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_2",
    name: "Tai Nghe Chống Ồn Sony WH-1000XM4",
    category: "Thiết bị công nghệ",
    price: 3200000,
    originalPrice: 6500000,
    condition: "Cũ tốt 80-85%",
    description: "Tai nghe chống ồn siêu tốt, đệm tai hơi sờn nhẹ nhưng âm thanh và pin nguyên bản vẫn nghe được hơn 20 tiếng. Nhượng lại cho bạn nào ôn thi thư viện chống ồn tốt.",
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Bách Khoa Hà Nội",
    author: "Lê Minh Tuấn",
    authorId: "user_student_tuan",
    isStudentVerified: true,
    views: 128,
    likes: 24,
    status: "Đang bán",
    suitabilityScore: 88,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_3",
    name: "Ấm Siêu Tốc Điện Sunhouse 1.8L",
    category: "Đồ dùng phòng trọ",
    price: 90000,
    originalPrice: 220000,
    condition: "Cũ tốt 80-85%",
    description: "Ấm đun nước siêu nhanh 1.8L, vỏ inox bền, đun nước pha mì tôm hay pha trà đều ok, phòng trọ đổi ấm ga nên thanh lý bớt cho gọn tủ.",
    images: ["https://images.unsplash.com/photo-1594212699903-ec8a3cee50f6?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Quốc Gia Hà Nội",
    author: "Trần Thị Lan",
    authorId: "user_student_lan",
    isStudentVerified: true,
    views: 64,
    likes: 5,
    status: "Đang bán",
    suitabilityScore: 92,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_4",
    name: "Bàn Học Gấp Gọn Đa Năng Cho Giường KTX",
    category: "Đồ dùng phòng trọ",
    price: 35000,
    originalPrice: 85000,
    condition: "Còn mới 95%",
    description: "Bàn gấp gọn chân sắt cứng cáp, có khe cắm iPad và chỗ để cốc nước, mặt bàn giả vân gỗ sáng đẹp sạch sẽ, tiện sử dụng ngay trên giường ktx.",
    images: ["https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Kinh tế Quốc dân",
    author: "Phạm Minh Đức",
    authorId: "user_student_duc",
    isStudentVerified: true,
    views: 93,
    likes: 12,
    status: "Đang bán",
    suitabilityScore: 97,
    createdAt: new Date().toISOString(),
  },
  {
    id: "prod_5",
    name: "Chuột Không Dây Logitech Pebble M350",
    category: "Thiết bị công nghệ",
    price: 180000,
    originalPrice: 400000,
    condition: "Còn mới 90%",
    description: "Chuột kết nối bluetooth và tăm nhận USB đều được, bấm cực kỳ êm không tiếng động (silent click), màu cát hồng nhạt siêu đẹp, ít hao pin.",
    images: ["https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Ngoại Thương",
    author: "Đỗ Thùy Linh",
    authorId: "user_student_linh",
    isStudentVerified: true,
    views: 31,
    likes: 4,
    status: "Đang chờ",
    suitabilityScore: 90,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_6",
    name: "Sách Giáo Trình Kinh Tế Lượng - NEU",
    category: "Sách & Giáo trình",
    price: 55000,
    originalPrice: 110000,
    condition: "Còn mới 95%",
    description: "Sách Kinh tế lượng trường NEU học kì mới, sách bao kiếng bọc góc cẩn thận, không viết bút mực mực đỏ gì cả, tặng kèm tập đề thi thử kỳ trước.",
    images: ["https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Kinh tế Quốc dân",
    author: "Nguyễn Anh Minh",
    authorId: "user_student_minh",
    isStudentVerified: true,
    views: 55,
    likes: 14,
    status: "Đang bán",
    suitabilityScore: 93,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_7",
    name: "Máy Tính Bỏ Túi Casio FX-580VN X",
    category: "Thiết bị công nghệ",
    price: 380000,
    originalPrice: 750000,
    condition: "Còn mới 90%",
    description: "Máy tính cầm tay Casio đầy đủ nắp đậy, chữ số phím bấm rõ ràng sắc nét, phục vụ tốt các kỳ thi THPT hay các môn Toán Cao Cấp và Kinh tế lượng đại học.",
    images: ["https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Bách Khoa Hà Nội",
    author: "Trần Thế Phong",
    authorId: "user_student_phong",
    isStudentVerified: true,
    views: 185,
    likes: 31,
    status: "Đang bán",
    suitabilityScore: 91,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_8",
    name: "Đèn Học Để Bàn Chống Cận Xiaomi LED",
    category: "Thiết bị công nghệ",
    price: 190000,
    originalPrice: 380000,
    condition: "Còn mới 95%",
    description: "Đèn bàn thông minh Xiaomi kết nối được wifi điều chỉnh độ sáng qua app Mihome cực êm dịu, không nhấp nháy, giúp bảo vệ mắt tốt khi thức khuya ôn thi.",
    images: ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Quốc gia TP.HCM",
    author: "Vũ Bảo Ngọc",
    authorId: "user_student_ngoc",
    isStudentVerified: true,
    views: 79,
    likes: 18,
    status: "Đang bán",
    suitabilityScore: 94,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_9",
    name: "iPad Air 4 64GB kèm Bút Cảm Ứng Wifi",
    category: "Thiết bị công nghệ",
    price: 7400000,
    originalPrice: 13500000,
    condition: "Còn mới 90%",
    description: "iPad dùng mượt mà, bao gồm sạc cáp zin và bút stylus ghi chú bài giảng siêu nhạy. Đã dán cường lực nhám chống vân tay thuận tiện cho vẽ/viết.",
    images: ["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Ngoại Thương",
    author: "Phan Khánh Vy",
    authorId: "user_student_vy",
    isStudentVerified: true,
    views: 312,
    likes: 67,
    status: "Đang bán",
    suitabilityScore: 89,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_10",
    name: "Bàn Là Hơi Nước Cầm Tay Philips 1000W",
    category: "Đồ dùng phòng trọ",
    price: 240000,
    originalPrice: 620000,
    condition: "Còn mới 95%",
    description: "Bàn ủi hơi nước cầm tay nhỏ gọn, là phẳng quần áo sơ mi đi học chỉ trong 1 phút, hơi nước phun mạnh kháng khuẩn, an toàn tất cả chất vải.",
    images: ["https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80"],
    school: "Học viện Ngoại giao",
    author: "Ngô Hoàng Nam",
    authorId: "user_student_nam",
    isStudentVerified: true,
    views: 62,
    likes: 9,
    status: "Đang bán",
    suitabilityScore: 96,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_11",
    name: "Kệ Giày Gỗ Thông 5 Tầng Hàn Quốc",
    category: "Đồ dùng phòng trọ",
    price: 130000,
    originalPrice: 290000,
    condition: "Còn mới 90%",
    description: "Kệ giày gỗ thông tự nhiên cứng cáp, chịu lực tốt, sức chứa lên tới 15 - 18 đôi giày dép. Đặt ở góc phòng trọ vô cùng gọn gàng và thẩm mỹ.",
    images: ["https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Kinh tế TP.HCM",
    author: "Lê Nhật Huy",
    authorId: "user_student_huy",
    isStudentVerified: true,
    views: 110,
    likes: 22,
    status: "Đang bán",
    suitabilityScore: 92,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_12",
    name: "Bình Giữ Nhiệt Lock&Lock 500ml Inox",
    category: "Đồ dùng cá nhân khác",
    price: 95000,
    originalPrice: 250000,
    condition: "Mới tinh 100% (Seal/Hộp)",
    description: "Bình giữ nhiệt thương hiệu Lock&Lock inox 316 cao cấp, giữ ấm tối đa 12 tiếng, giữ lạnh 24 tiếng. Hàng quà tặng hội thảo chưa qua sử dụng nguyên hộp.",
    images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Sư phạm Hà Nội",
    author: "Nguyễn Mai Phương",
    authorId: "user_student_phuong",
    isStudentVerified: true,
    views: 84,
    likes: 19,
    status: "Đang bán",
    suitabilityScore: 95,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_13",
    name: "Bàn Phím Cơ RK61 Blue Switch Bluetooth",
    category: "Thiết bị công nghệ",
    price: 450000,
    originalPrice: 900000,
    condition: "Còn mới 90%",
    description: "Bàn phím cơ layout 61 phím siêu nhỏ gọn xếp vào balo mang đi cafe hay thư viện trường tiện lợi. Led vàng đơn sắc cực chất, pin sạc bền bỉ.",
    images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80"],
    school: "Học viện Công nghệ Bưu chính Viễn thông",
    author: "Cao Đình Hùng",
    authorId: "user_student_chinh",
    isStudentVerified: true,
    views: 145,
    likes: 38,
    status: "Đang bán",
    suitabilityScore: 90,
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_14",
    name: "Gương Đèn Led Tròn Trang Điểm Cảm Ứng",
    category: "Đồ dùng cá nhân khác",
    price: 75000,
    originalPrice: 180000,
    condition: "Còn mới 95%",
    description: "Gương trang điểm tròn để bàn, có tích hợp viền đèn LED màu sáng trắng tự nhiên điều chỉnh 3 mức cảm ứng xịn xò, mặt gương nét chống mốc.",
    images: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80"],
    school: "Học viện Báo chí và Tuyên truyền",
    author: "Đặng Khánh Huyền",
    authorId: "user_student_huyen",
    isStudentVerified: true,
    views: 66,
    likes: 15,
    status: "Đang bán",
    suitabilityScore: 93,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prod_15",
    name: "Sổ Tay Từ Vựng Tiếng Anh Giao Tiếp IELTS",
    category: "Sách & Giáo trình",
    price: 25000,
    originalPrice: 70000,
    condition: "Cũ tốt 80-85%",
    description: "Tổng hợp từ vựng Collocation, Idioms thông dụng của ban học viên 7.5 IELTS đóng đóng quyển sành điệu, in ấn sắc nét dễ theo dõi nhanh qua kẹp thẻ.",
    images: ["https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80"],
    school: "Đại học Mỹ thuật Công nghiệp",
    author: "Hoàng Ngân Hà",
    authorId: "user_student_ha",
    isStudentVerified: false,
    views: 48,
    likes: 7,
    status: "Đang bán",
    suitabilityScore: 85,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

let wants = [
  {
    id: "want_1",
    title: "Tìm mua Giáo trình Kinh tế lượng",
    category: "Sách & Giáo trình",
    budget: "50,000 VND - 80,000 VND",
    schoolFilter: "Đại học Ngoại Thương",
    description: "Cần tìm giáo trình Kinh tế lượng FTU xuất bản năm 2022 trở lại đây, có viết nháp cũng được miễn là không rách trang.",
    buyer: "Trần Anh Quân",
    buyerSchool: "Đại học Ngoại Thương",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "want_2",
    title: "Tìm loa Bluetooth Bass mạnh phòng trọ",
    category: "Thiết bị công nghệ",
    budget: "200,000 VND - 400,000 VND",
    schoolFilter: "Bách Khoa / Xây Dựng",
    description: "Phòng trọ 15m2 muốn mua một chiếc loa nghe nhạc cũ loại JBL Go, Sony Extra Bass cũ hoặc hàng Hoco, âm thanh không rè, pin cầm lâu chút.",
    buyer: "Vũ Hoàng Lâm",
    buyerSchool: "Đại học Bách Khoa Hà Nội",
    createdAt: new Date().toISOString(),
  },
  {
    id: "want_3",
    title: "Mua Quạt tích điện gấp gọn cũ",
    category: "Đồ dùng phòng trọ",
    budget: "100,000 VND - 150,000 VND",
    schoolFilter: "Mọi trường",
    description: "Phòng hay bị mất điện đột ngột mùa hè, cần mua quạt tích điện cũ xài chống cháy qua đêm.",
    buyer: "Nguyễn Thu Hà",
    buyerSchool: "Đại học Sư phạm Hà Nội",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

let forumPosts = [
  {
    id: "forum_1",
    title: "Gom mua chung túi nước giặt Omo 3.6kg Coopmart giảm 40%",
    tag: "Gom mua chung",
    author: "Nguyễn Thùy Dung",
    school: "Đại học Ngoại Thương",
    content: "Chào mọi người, Coopmart gần trường đang có deal mua 2 túi nước giặt OMO Matic giảm sâu, tính ra chỉ 110k/túi 3.6kg (giá gốc 170k). Mình chỉ xài một túi nên muốn gom chung với 1 bạn khác lấy chung cho rẻ. Nhận hàng tại cổng trường FTU chiều mai nhé!",
    upvotes: 24,
    commentsCount: 2,
    comments: [
      { id: "comment_1", author: "Lê Minh Tuấn", school: "Đại học Bách Khoa Hà Nội", content: "Kèo thơm quá bạn ơi! Mình đăng ký chung 1 túi với nhé.", createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
      { id: "comment_2", author: "Đỗ Thùy Linh", school: "Đại học Ngoại Thương", content: "Nếu còn suất thì mình cũng muốn mua chung nha, nước giặt Omo xài rất thơm.", createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() }
    ],
    joinedUsers: ["user_student_linh"],
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "forum_2",
    title: "Tìm bạn nam ở ghép KTX Mỹ Đình - phòng sạch sẽ văn minh",
    tag: "Phòng trọ & Ở ghép",
    author: "Lý Quốc Khánh",
    school: "Đại học Quốc Gia Hà Nội",
    content: "Mình cần tìm 1 bạn nam ở ghép phòng KTX Mỹ Đình, phòng hiện tại có 2 người, rộng rãi, đầy đủ điều hòa tủ lạnh nước nóng. Chi phí chia đôi tầm 400k/tháng cả điện nước. Ưu tiên các bạn không hút thuốc, giữ gìn vệ sinh và tôn trọng giờ giấc sinh hoạt chung.",
    upvotes: 18,
    commentsCount: 1,
    comments: [
      { id: "comment_3", author: "Nguyễn Anh Minh", school: "Đại học Kinh tế Quốc dân", content: "Phòng còn trống không bạn? Mình khóa K62 vừa lên Hà Nội học muốn qua xem phòng.", createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    joinedUsers: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "forum_3",
    title: "Tìm nhóm đăng ký giải chạy Uni-Run 2024 nhận Discount 20%",
    tag: "Hoạt động & Sự kiện",
    author: "Đoàn Văn Nam",
    school: "Đại học Bách Khoa Hà Nội",
    content: "Giải chạy sinh viên Uni-Run sắp tới có chính sách đăng ký nhóm từ 10 người trở lên giảm 20% giá vé BIB. Hiện tại nhóm mình có 6 bạn rồi, cần thêm 4 bạn nữa đóng tiền mua chung cho rẻ. Cự ly chạy 5km và 10km quanh Hồ Tây nha mọi người ơi!",
    upvotes: 35,
    commentsCount: 0,
    comments: [],
    joinedUsers: ["user_client_default"],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "forum_4",
    title: "Pass lại tài khoản ôn thi IELTS xịn sò - còn lẻ 3 tháng",
    tag: "Học tập & Tài liệu",
    author: "Hồ Anh Thư",
    school: "Đại học Ngoại Thương",
    content: "Pass lại tài khoản học từ vựng và luyện đề Prep.vn còn hạn sử dụng 3 tháng rưỡi. Có cam kết chấm chữa bài IELTS Writing & Speaking bằng AI. Thích hợp cho bạn nào đang ôn thi gấp đợt tháng 8 này.",
    upvotes: 12,
    commentsCount: 1,
    comments: [
      { id: "comment_4", author: "Cao Đình Hùng", school: "Học viện Bưu chính Viễn thông", content: "Tài khoản có được đổi mật khẩu không bạn? Giá pass lại nhiêu á?", createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    joinedUsers: [],
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

let chatRooms = [
  {
    roomId: "room_1",
    product: {
      id: "prod_1",
      name: "Sách Giáo Trình Kinh Tế Vĩ Mô - FTU",
      price: 45000,
      image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
      school: "Đại học Ngoại Thương"
    },
    buyer: {
      id: "user_client_default",
      name: "Sinh viên Nguyễn Thu Hạ (Bạn)",
      school: "Đại học Mở Hà Nội",
    },
    seller: {
      id: "user_student_hung",
      name: "Nguyễn Văn Hùng",
      school: "Đại học Ngoại Thương",
      isStudentVerified: true
    },
    messages: [
      {
        id: "msg_1",
        senderId: "user_student_hung",
        text: "Chào bạn, mình thấy bạn quan tâm đến sách Giáo trình Kinh tế vĩ mô của mình.",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: "msg_2",
        senderId: "user_client_default",
        text: "Dạ vâng ạ, sách còn mới không bạn ơi? Có nhiều nét gạch vẽ bút mực trong đó không ạ?",
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        id: "msg_3",
        senderId: "user_student_hung",
        text: "Yên tâm nha, chỉ có highlight vài trang đầu bằng bút dạ thôi, không bị vẽ bậy đâu. Sách này mình giữ kỹ lắm.",
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      }
    ]
  },
  {
    roomId: "room_2",
    product: {
      id: "prod_3",
      name: "Ấm Siêu Tốc Điện Sunhouse 1.8L",
      price: 90000,
      image: "https://images.unsplash.com/photo-1594212699903-ec8a3cee50f6?w=600&auto=format&fit=crop&q=80",
      school: "Đại học Quốc Gia Hà Nội"
    },
    buyer: {
      id: "user_client_default",
      name: "Sinh viên Nguyễn Thu Hạ (Bạn)",
      school: "Đại học Mở Hà Nội",
    },
    seller: {
      id: "user_student_lan",
      name: "Trần Thị Lan",
      school: "Đại học Quốc Gia Hà Nội",
      isStudentVerified: true
    },
    messages: [
      {
        id: "msg_1_2",
        senderId: "user_client_default",
        text: "Chào bạn Lan, ấm siêu tốc còn đun nước bình thường không ạ? Cho mình bớt xăng xe chút đỉnh nha.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "msg_2_2",
        senderId: "user_student_lan",
        text: "Đun tốt lắm bạn, sôi rất nhanh. Giá 90k là rẻ lắm rồi ấy, nhưng nếu bạn qua tận nơi ở Ký túc xá Ngoại ngữ lấy mình bớt 10k còn 80k nha.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      }
    ]
  }
];

// Seeding helper to seed Supabase database if empty
async function seedSupabaseIfNeeded() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.from("products").select("id").limit(1);
    if (error) {
      console.log("Supabase connected, but failed to fetch products (maybe tables are not created yet?):", error.message);
      return;
    }
    if (!data || data.length === 0) {
      console.log("Supabase table 'products' is empty. Seeding initial data rows...");
      
      // 1. Seed Products
      const dbProds = products.map(mapProductToDB);
      await supabase.from("products").insert(dbProds);

      // 2. Seed Wants
      const dbWants = wants.map(mapWantToDB);
      await supabase.from("wants").insert(dbWants);

      // 3. Seed Forum Posts
      const dbPosts = forumPosts.map(mapForumPostToDB);
      await supabase.from("forum_posts").insert(dbPosts);

      // 4. Seed Forum Comments
      const dbComments: any[] = [];
      forumPosts.forEach((p) => {
        if (p.comments) {
          p.comments.forEach((c) => {
            dbComments.push({
              id: c.id,
              post_id: p.id,
              author: c.author,
              school: c.school,
              content: c.content,
              created_at: c.createdAt
            });
          });
        }
      });
      if (dbComments.length > 0) {
        await supabase.from("forum_comments").insert(dbComments);
      }

      // 5 & 6. Không seed chat_rooms/messages giả — tạo on demand theo từng user
      
      console.log("Supabase database successfully pre-seeded with initial data!");
    } else {
      console.log("Supabase contains existing data, skipping pre-seeding.");
    }
  } catch (err: any) {
    console.error("Error during Supabase pre-seeding:", err.message);
  }
}

async function cleanupLegacyHardcodedChats() {
  if (!supabase) return;
  try {
    const { data: legacyRooms } = await supabase
      .from("chat_rooms").select("id").eq("buyer_id", "user_client_default");
    if (legacyRooms && legacyRooms.length > 0) {
      const ids = legacyRooms.map((r: any) => r.id);
      console.log(`[CLEANUP] Xóa ${ids.length} chat rooms cũ hardcode...`);
      await supabase.from("messages").delete().in("room_id", ids);
      await supabase.from("chat_rooms").delete().in("id", ids);
      console.log("[CLEANUP] Xong.");
    }
  } catch (err: any) { console.error("[CLEANUP] Lỗi:", err.message); }
}

// Mount Authentication & Verification Sub-routers
app.use("/api/auth", authRouter);

// Frontend exact mapping for university detection
app.get("/api/universities/detect", (req, res) => {
  const email = req.query.email as string;
  if (!email) {
    res.status(400).json({ success: false, message: "Email query parameter is required" });
    return;
  }
  const detected = detectUniversityFromEmail(email);
  if (detected) {
    res.json({
      success: true,
      found: true,
      university: {
        name: detected.name,
        shortName: detected.shortName,
        city: detected.city
      }
    });
  } else {
    res.json({
      success: true,
      found: false,
      suggestion: "Nếu trường bạn chưa có trong danh sách, hãy phản hồi về admin@uni-share.app để chúng mình cập nhật kịp thời nhé!"
    });
  }
});

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer memory storage config
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// API: Upload image to Cloudinary
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Không tìm thấy file!" });
  }

  try {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "uni-share/products",
          resource_type: "image",
          transformation: [{ width: 1200, crop: "limit" }, { quality: "auto" }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file!.buffer);
    });

    return res.json({ success: true, url: result.secure_url });
  } catch (err: any) {
    console.error("Cloudinary Upload Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 1. API: Get all products
app.get("/api/products", async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        const mapped = data.map(mapProductFromDB);
        return res.json({ success: true, products: mapped });
      }
      console.error("Supabase products fetch failed:", error);
    } catch (err) {
      console.error("Products GET Error:", err);
    }
  }
  res.json({ success: true, products });
});

// 2. API: Post new product
app.post("/api/products", async (req, res) => {
  const { name, category, price, originalPrice, condition, description, images, author, school, tags, suitabilityScore } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ success: false, message: "Thiếu dữ liệu sản phẩm!" });
  }

  // authorId phải lấy từ JWT — không lấy từ body (bảo mật)
  const authorIdFromToken = getUserIdFromReq(req);
  if (!authorIdFromToken) {
    return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập để đăng sản phẩm!" });
  }

  // Lấy display_name từ bảng users để làm author name
  let authorName = author || "Sinh viên";
  if (supabase) {
    const { data: userRecord } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", authorIdFromToken)
      .single();
    if (userRecord?.display_name) authorName = userRecord.display_name;
  }

  const newProduct: any = {
    id: "prod_" + Date.now(),
    name,
    category,
    price: Number(price),
    originalPrice: originalPrice ? Number(originalPrice) : Number(price) * 2,
    condition: condition || "Còn mới 90%",
    description: description || "",
    images: images && images.length > 0 ? images : ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600"],
    school: school || "Học viện Ngoại giao",
    author: authorName,
    authorId: authorIdFromToken,  // userId thật từ JWT
    isStudentVerified: true,
    views: 1,
    likes: 0,
    status: "Đang bán",
    suitabilityScore: suitabilityScore || Math.floor(Math.random() * 15) + 85,
    tags: tags || [],
    createdAt: new Date().toISOString()
  };

  if (supabase) {
    try {
      const dbPayload = mapProductToDB(newProduct);
      console.log("[POST /api/products] Inserting:", JSON.stringify(dbPayload).substring(0, 300));
      const { error } = await supabase.from("products").insert(dbPayload);
      if (!error) {
        console.log("[POST /api/products] Insert OK, id:", newProduct.id);
        return res.json({ success: true, product: newProduct });
      }
      console.error("[POST /api/products] Supabase FAILED:", JSON.stringify(error));
      return res.status(500).json({
        success: false,
        message: `Loi luu database: ${error.message || error.code || JSON.stringify(error)}`
      });
    } catch (err: any) {
      console.error("[POST /api/products] Exception:", err);
      return res.status(500).json({ success: false, message: err.message || "Loi server" });
    }
  }

  // No Supabase — fallback in-memory
  products.unshift(newProduct);
  res.json({ success: true, product: newProduct });
});

// Edit Product Status
app.patch("/api/products/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();
      if (!error && data) {
        return res.json({ success: true, product: mapProductFromDB(data) });
      }
      console.error("Supabase patch product status failed:", error);
    } catch (err) {
      console.error("Products PATCH Error:", err);
    }
  }

  const product = products.find(p => p.id === id);
  if (product) {
    product.status = status;
    return res.json({ success: true, product });
  }
  res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
});

// Rate seller endpoint
app.post("/api/sellers/rate", async (req, res) => {
  const { authorId, rating, review } = req.body;
  if (!authorId || !rating) {
    return res.status(400).json({ success: false, message: "Thiếu thông tin đánh giá!" });
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .or(`author_id.eq.${authorId},author.eq.${authorId}`);
      if (!error && data) {
        let countUpdated = 0;
        for (const p of data) {
          const currentRating = p.seller_rating !== null && p.seller_rating !== undefined ? Number(p.seller_rating) : 4.8;
          const currentCount = p.seller_review_count !== null && p.seller_review_count !== undefined ? Number(p.seller_review_count) : 8;
          const newCount = currentCount + 1;
          const newRating = Number(((currentRating * currentCount + Number(rating)) / newCount).toFixed(1));
          
          await supabase
            .from("products")
            .update({ seller_rating: newRating, seller_review_count: newCount })
            .eq("id", p.id);
          countUpdated++;
        }
        return res.json({ success: true, countUpdated });
      }
      console.error("Supabase rate seller failed:", error);
    } catch (err) {
      console.error("Sellers RATE Error:", err);
    }
  }

  // Fallback
  let countUpdated = 0;
  products.forEach(p => {
    const isMatch = p.authorId === authorId || p.author === authorId;
    if (isMatch) {
      const currentRating = p.hasOwnProperty("sellerRating") && (p as any).sellerRating !== undefined ? (p as any).sellerRating : 4.8;
      const currentCount = p.hasOwnProperty("sellerReviewCount") && (p as any).sellerReviewCount !== undefined ? (p as any).sellerReviewCount : 8;
      const newCount = currentCount + 1;
      const newRating = Number(((currentRating * currentCount + Number(rating)) / newCount).toFixed(1));
      (p as any).sellerRating = newRating;
      (p as any).sellerReviewCount = newCount;
      countUpdated++;
    }
  });

  res.json({ success: true, countUpdated });
});

// Delete product
app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category, price, originalPrice, condition, description, images, tags, suitabilityScore } = req.body;

  if (supabase) {
    try {
      const updatePayload: any = {};
      if (name) updatePayload.name = name;
      if (category) updatePayload.category = category;
      if (price) updatePayload.price = Number(price);
      if (originalPrice) updatePayload.original_price = Number(originalPrice);
      if (condition) updatePayload.condition = condition;
      if (description) updatePayload.description = description;
      if (images) updatePayload.images = images;
      if (tags) updatePayload.tags = tags;
      if (suitabilityScore) updatePayload.suitability_score = suitabilityScore;

      const { data, error } = await supabase
        .from("products")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .single();
      if (!error && data) {
        return res.json({ success: true, product: mapProductFromDB(data) });
      }
      console.error("Supabase put product failed:", error);
    } catch (err) {
      console.error("Products PUT Error:", err);
    }
  }

  // Fallback memory logic
  const pIndex = products.findIndex(p => p.id === id);
  if (pIndex >= 0) {
    if (name) products[pIndex].name = name;
    if (category) products[pIndex].category = category;
    if (price) products[pIndex].price = Number(price);
    if (originalPrice) products[pIndex].originalPrice = Number(originalPrice);
    if (condition) products[pIndex].condition = condition;
    if (description) products[pIndex].description = description;
    if (images) products[pIndex].images = images;
    if (tags) (products[pIndex] as any).tags = tags;
    if (suitabilityScore) (products[pIndex] as any).suitabilityScore = suitabilityScore;
    return res.json({ success: true, product: products[pIndex] });
  }
  return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm." });
});

app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (!error) {
        return res.json({ success: true, message: "Xóa sản phẩm thành công" });
      }
      console.error("Supabase delete product failed:", error);
    } catch (err) {
      console.error("Products DELETE Error:", err);
    }
  }

  products = products.filter(p => p.id !== id);
  res.json({ success: true, message: "Xóa sản phẩm thành công" });
});

// 3. API: Get all Wants
app.get("/api/wants", async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("wants").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        return res.json({ success: true, wants: data.map(mapWantFromDB) });
      }
      console.error("Supabase wants fetch failed:", error);
    } catch (err) {
      console.error("Wants GET Error:", err);
    }
  }
  res.json({ success: true, wants });
});

// 4. API: Post a Want listing
app.post("/api/wants", async (req, res) => {
  const { title, category, budget, schoolFilter, description, buyer, buyerSchool } = req.body;
  if (!title || !category || !budget) {
    return res.status(400).json({ success: false, message: "Thiếu thông tin nhu cầu mua!" });
  }

  const newWant = {
    id: "want_" + Date.now(),
    title,
    category,
    budget,
    schoolFilter: schoolFilter || "Mọi trường",
    description: description || "",
    buyer: buyer || "Sinh viên Nguyễn Thu Hạ",
    buyerSchool: buyerSchool || "Đại học Sư phạm Hà Nội",
    createdAt: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { error } = await supabase.from("wants").insert(mapWantToDB(newWant));
      if (!error) {
        return res.json({ success: true, want: newWant });
      }
      console.error("Supabase insertion of wants failed:", error);
    } catch (err) {
      console.error("Wants POST Error:", err);
    }
  }

  wants.unshift(newWant);
  res.json({ success: true, want: newWant });
});

// 5. API: Get Forum posts
app.get("/api/forum", async (req, res) => {
  if (supabase) {
    try {
      const { data: posts, error: postsError } = await supabase.from("forum_posts").select("*").order("created_at", { ascending: false });
      const { data: comments, error: commentsError } = await supabase.from("forum_comments").select("*").order("created_at", { ascending: true });
      if (!postsError && posts) {
        const postsMapped = posts.map((p) => {
          const postComments = (comments || [])
            .filter((c) => c.post_id === p.id)
            .map(mapCommentFromDB);
          return mapForumPostFromDB(p, postComments);
        });
        return res.json({ success: true, forumPosts: postsMapped });
      }
      console.error("Supabase forum fetch failed:", postsError);
    } catch (err) {
      console.error("Forum GET Error:", err);
    }
  }
  res.json({ success: true, forumPosts });
});

// 6. API: Join or Post to Forum
app.post("/api/forum", async (req, res) => {
  const { title, tag, content, author, school } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, message: "Thiếu nội dung bài đăng!" });
  }

  const newPost = {
    id: "forum_" + Date.now(),
    title,
    tag: tag || "Thảo luận",
    author: author || "Sinh viên Nguyễn Thu Hạ",
    school: school || "Đại học Mở Hà Nội",
    content,
    upvotes: 1,
    commentsCount: 0,
    comments: [],
    joinedUsers: [],
    createdAt: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { error } = await supabase.from("forum_posts").insert(mapForumPostToDB(newPost));
      if (!error) {
        io.emit("forum_new_post", newPost);
        return res.json({ success: true, post: newPost });
      }
      console.error("Supabase forum post insertion failed:", error);
    } catch (err) {
      console.error("Forum POST Error:", err);
    }
  }

  forumPosts.unshift(newPost);
  io.emit("forum_new_post", newPost);
  res.json({ success: true, post: newPost });
});

// Upvote forum post
app.post("/api/forum/:id/upvote", async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("upvotes")
        .eq("id", id)
        .single();
      if (!error && data) {
        const newUpvotes = Number(data.upvotes) + 1;
        const { error: updateError } = await supabase
          .from("forum_posts")
          .update({ upvotes: newUpvotes })
          .eq("id", id);
        if (!updateError) {
          return res.json({ success: true, upvotes: newUpvotes });
        }
      }
      console.error("Supabase upvote post failed:", error);
    } catch (err) {
      console.error("Forum UPVOTE Error:", err);
    }
  }

  const post = forumPosts.find(p => p.id === id);
  if (post) {
    post.upvotes += 1;
    return res.json({ success: true, upvotes: post.upvotes });
  }
  res.status(404).json({ success: false, message: "Không tìm thấy bài viết" });
});

// Join Group Buy or Event on Forum
app.post("/api/forum/:id/join", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (supabase) {
    try {
      const { data, error } = await supabase.from("forum_posts").select("joined_users").eq("id", id).single();
      if (!error && data) {
        let joined = Array.isArray(data.joined_users) ? data.joined_users : JSON.parse(data.joined_users || "[]");
        if (!joined.includes(userId)) {
          joined.push(userId);
        } else {
          joined = joined.filter((u: any) => u !== userId);
        }
        const { error: updateError } = await supabase
          .from("forum_posts")
          .update({ joined_users: joined })
          .eq("id", id);
        if (!updateError) {
          return res.json({ success: true, joinedUsers: joined });
        }
      }
      console.error("Supabase join event failed:", error);
    } catch (err) {
      console.error("Forum JOIN Error:", err);
    }
  }

  const post = forumPosts.find(p => p.id === id);
  if (post) {
    if (!post.joinedUsers.includes(userId)) {
      post.joinedUsers.push(userId);
    } else {
      post.joinedUsers = post.joinedUsers.filter(u => u !== userId); // Leave join
    }
    return res.json({ success: true, joinedUsers: post.joinedUsers });
  }
  res.status(404).json({ success: false, message: "Không tìm thấy bài viết" });
});

// Post a comment to a forum post
app.post("/api/forum/:id/comments", async (req, res) => {
  const { id } = req.params;
  const { author, school, content } = req.body;
  if (!content) {
    return res.status(400).json({ success: false, message: "Nội dung bình luận không được để trống!" });
  }

  if (supabase) {
    try {
      const commentId = "comment_" + Date.now();
      const newComment = {
        id: commentId,
        post_id: id,
        author: author || "Sinh viên Nguyễn Thu Hạ",
        school: school || "Đại học Mở Hà Nội",
        content,
        created_at: new Date().toISOString()
      };
      const { error: commentErr } = await supabase.from("forum_comments").insert(newComment);
      if (!commentErr) {
        // Fetch update of comments count
        const { data: postData } = await supabase.from("forum_posts").select("comments_count").eq("id", id).single();
        const newCount = (postData ? postData.comments_count : 0) + 1;
        await supabase.from("forum_posts").update({ comments_count: newCount }).eq("id", id);
        
        // Re-fetch post with all comments to match the return structure
        const { data: updatedPost } = await supabase.from("forum_posts").select("*").eq("id", id).single();
        const { data: allComments } = await supabase.from("forum_comments").select("*").eq("post_id", id);
        const mappedComments = (allComments || []).map(mapCommentFromDB);
        const responsePayload = {
          success: true,
          comment: mapCommentFromDB(newComment),
          commentsCount: newCount,
          post: mapForumPostFromDB(updatedPost, mappedComments)
        };
        io.emit("forum_new_comment", { postId: id, post: responsePayload.post });
        return res.json(responsePayload);
      }
      console.error("Supabase post comment failed:", commentErr);
    } catch (err) {
      console.error("Forum COMMENT Error:", err);
    }
  }

  const post = forumPosts.find(p => p.id === id);
  if (post) {
    if (!post.comments) {
      post.comments = [];
    }
    const newComment = {
      id: "comment_" + Date.now(),
      author: author || "Sinh viên Nguyễn Thu Hạ",
      school: school || "Đại học Mở Hà Nội",
      content,
      createdAt: new Date().toISOString()
    };
    post.comments.push(newComment);
    post.commentsCount = post.comments.length;
    io.emit("forum_new_comment", { postId: id, post });
    return res.json({ success: true, comment: newComment, commentsCount: post.commentsCount, post });
  }
  res.status(404).json({ success: false, message: "Không tìm thấy bài viết để thảo luận!" });
});

// 7. API: Get Chat Rooms
app.get("/api/chats", async (req, res) => {
  const userId = getUserIdFromReq(req);
  if (!userId) return res.json({ success: true, chatRooms: [] });

  if (supabase) {
    try {
      // Lấy cả rooms mà user là BUYER hoặc SELLER
      const { data: buyerRooms } = await supabase
        .from("chat_rooms").select("*").eq("buyer_id", userId);
      const { data: sellerRooms } = await supabase
        .from("chat_rooms").select("*").eq("seller_id", userId);

      // Gộp và loại duplicate
      const allRooms = [...(buyerRooms || []), ...(sellerRooms || [])];
      const uniqueRooms = allRooms.filter(
        (r, i, self) => self.findIndex((x) => x.id === r.id) === i
      );

      const { data: prods } = await supabase.from("products").select("*");
      const { data: msgs } = await supabase.from("messages").select("*").order("timestamp", { ascending: true });
      const { data: users } = await supabase.from("users").select("id, display_name, university_short_name, university_name");

      const allProductsMapped = (prods || []).map(mapProductFromDB);
      const allUsers = users || [];
      const roomList = [];
      for (const r of uniqueRooms) {
        const assembled = await assembleChatRoom(r, allProductsMapped, msgs || [], allUsers, userId);
        if (assembled) roomList.push(assembled);
      }
      return res.json({ success: true, chatRooms: roomList });
    } catch (err) {
      console.error("Chats GET Error:", err);
    }
  }
  res.json({ success: true, chatRooms: [] });
});

// 8. API: Post message in Room
app.post("/api/chats/:roomId/messages", async (req, res) => {
  const { roomId } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, message: "Nội dung tin nhắn trống!" });

  const senderId = getUserIdFromReq(req);
  if (!senderId) return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập!" });

  if (supabase) {
    try {
      const newMsg = {
        id: "msg_" + Date.now(),
        room_id: roomId,
        sender_id: senderId,
        text,
        timestamp: new Date().toISOString()
      };
      const { error } = await supabase.from("messages").insert(newMsg);
      if (!error) {
        const { data: rData } = await supabase.from("chat_rooms").select("*").eq("id", roomId).single();
        const { data: prods } = await supabase.from("products").select("*");
        const { data: msgs } = await supabase.from("messages").select("*").order("timestamp", { ascending: true });
        const { data: users } = await supabase.from("users").select("id, display_name, university_short_name, university_name");
        const allProductsMapped = (prods || []).map(mapProductFromDB);
        const assembledRoom = await assembleChatRoom(rData, allProductsMapped, msgs || [], users || [], senderId);

        const finalMsg = { id: newMsg.id, senderId: newMsg.sender_id, text: newMsg.text, timestamp: newMsg.timestamp };
        io.to(roomId).emit("new_message", { roomId, message: finalMsg });
        return res.json({ success: true, message: finalMsg, room: assembledRoom });
      }
      console.error("Supabase message insertion failed:", error);
    } catch (err) {
      console.error("Messages POST Error:", err);
    }
  }
  res.status(503).json({ success: false, message: "Không thể lưu tin nhắn, vui lòng thử lại!" });
});

// Create/obtain Chat Room
app.post("/api/chats/find-or-create", async (req, res) => {
  const { productId } = req.body;
  const buyerId = getUserIdFromReq(req);

  if (!buyerId) return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập!" });
  if (!productId) return res.status(400).json({ success: false, message: "Thiếu productId!" });

  if (supabase) {
    try {
      const { data: prods } = await supabase.from("products").select("*");
      const { data: users } = await supabase.from("users").select("id, display_name, university_short_name, university_name");
      const allProductsMapped = (prods || []).map(mapProductFromDB);
      const allUsers = users || [];

      // Tìm room theo đúng cặp (product + buyer) — mỗi user có phòng riêng
      const { data: existingRooms, error: fetchErr } = await supabase
        .from("chat_rooms").select("*")
        .eq("product_id", productId).eq("buyer_id", buyerId).limit(1);

      if (!fetchErr && existingRooms && existingRooms.length > 0) {
        const { data: msgs } = await supabase.from("messages").select("*").order("timestamp", { ascending: true });
        const assembled = await assembleChatRoom(existingRooms[0], allProductsMapped, msgs || [], allUsers, buyerId);
        return res.json({ success: true, room: assembled });
      }

      const prod = allProductsMapped.find((p: any) => p.id === productId);
      if (!prod) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });

      // Chặn người đăng sản phẩm tự mua chính sản phẩm của mình
      if (prod.authorId === buyerId) {
        return res.status(400).json({ success: false, message: "Bạn không thể nhắn tin hỏi mua sản phẩm của chính mình!" });
      }

      const newRoomId = "room_" + Date.now();
      const newRoomRecord = {
        id: newRoomId,
        product_id: productId,
        buyer_id: buyerId,           // userId thật từ JWT
        seller_id: prod.authorId,
        created_at: new Date().toISOString()
      };

      const { error: insertRoomErr } = await supabase.from("chat_rooms").insert(newRoomRecord);
      if (!insertRoomErr) {
        const initMsg = {
          id: "msg_init_" + Date.now(),
          room_id: newRoomId,
          sender_id: "system",
          text: `Kết nối thành công! Bạn đang hỏi mua sản phẩm "${prod.name}" từ ${prod.author}. Hãy trao đổi lịch hẹn văn minh tại trường học!`,
          timestamp: new Date().toISOString()
        };
        await supabase.from("messages").insert(initMsg);
        const { data: msgsUpdated } = await supabase.from("messages").select("*").order("timestamp", { ascending: true });
        const assembled = await assembleChatRoom(newRoomRecord, allProductsMapped, msgsUpdated || [], allUsers, buyerId);
        return res.json({ success: true, room: assembled });
      }
      console.error("Supabase room creation failed:", insertRoomErr);
    } catch (err) {
      console.error("Room FIND-OR-CREATE Error:", err);
    }
  }
  res.status(503).json({ success: false, message: "Không thể tạo phòng thương lượng, vui lòng thử lại!" });
});



app.post("/api/reports", async (req, res) => {
  const { productId, productName, reporterId, reporterName, sellerId, sellerName, reason } = req.body || {};
  if (!productId || !reason) {
    return res.status(400).json({ success: false, message: "Missing productId or reason." });
  }
  const report = {
    id: `report_${Date.now()}`,
    product_id: productId,
    product_name: productName || "",
    reporter_id: reporterId || "guest",
    reporter_name: reporterName || "Anonymous",
    seller_id: sellerId || "",
    seller_name: sellerName || "",
    reason,
    status: "pending",
    created_at: new Date().toISOString()
  };
  if (supabase) {
    const { error } = await supabase.from("listing_reports").insert(report);
    if (error) return res.status(500).json({ success: false, message: error.message });
  } else {
    listingReports.unshift(report);
  }
  res.json({ success: true, report });
});

app.get("/api/admin/reports", async (_req, res) => {
  if (supabase) {
    const { data, error } = await supabase.from("listing_reports").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, reports: data || [] });
  }
  res.json({ success: true, reports: listingReports });
});

app.patch("/api/admin/reports/:id", async (req, res) => {
  const { id } = req.params;
  const { status, adminNote } = req.body || {};
  const patch = { status: status || "reviewed", admin_note: adminNote || "", reviewed_at: new Date().toISOString() };
  if (supabase) {
    const { data, error } = await supabase.from("listing_reports").update(patch).eq("id", id).select("*").single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, report: data });
  }
  listingReports = listingReports.map((r) => r.id === id ? { ...r, ...patch } : r);
  res.json({ success: true, report: listingReports.find((r) => r.id === id) });
});

app.post("/api/reviews", async (req, res) => {
  const { productId, sellerId, sellerName, reviewerId, reviewerName, score, comment } = req.body || {};
  const normalizedScore = Number(score);
  if (!sellerName || normalizedScore < 1 || normalizedScore > 5) {
    return res.status(400).json({ success: false, message: "Invalid review payload." });
  }
  const review = {
    id: `review_${Date.now()}`,
    product_id: productId || "",
    seller_id: sellerId || "",
    seller_name: sellerName,
    reviewer_id: reviewerId || "guest",
    reviewer_name: reviewerName || "Anonymous",
    score: normalizedScore,
    comment: comment || "",
    created_at: new Date().toISOString()
  };
  if (supabase) {
    const { error } = await supabase.from("seller_reviews").insert(review);
    if (error) return res.status(500).json({ success: false, message: error.message });
  } else {
    sellerReviews.unshift(review);
  }
  res.json({ success: true, review });
});

app.get("/api/reviews/seller/:sellerId", async (req, res) => {
  const { sellerId } = req.params;
  if (supabase) {
    const { data, error } = await supabase.from("seller_reviews").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, reviews: data || [] });
  }
  res.json({ success: true, reviews: sellerReviews.filter((r) => r.seller_id === sellerId) });
});

app.get("/api/notifications/:userId", async (req, res) => {
  const { userId } = req.params;
  if (supabase) {
    const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, notifications: data || [] });
  }
  res.json({ success: true, notifications: notificationsStore.filter((n) => n.user_id === userId) });
});

app.post("/api/transactions", async (req, res) => {
  const { productId, buyerId, sellerId, amount, depositAmount } = req.body || {};
  if (!productId || !buyerId || !sellerId) {
    return res.status(400).json({ success: false, message: "Missing transaction parties." });
  }
  const now = new Date().toISOString();
  const transaction = {
    id: `txn_${Date.now()}`,
    product_id: productId,
    buyer_id: buyerId,
    seller_id: sellerId,
    amount: Number(amount || 0),
    deposit_amount: Number(depositAmount || 0),
    provider: "escrow-lite",
    status: "pending",
    history: [{ status: "pending", timestamp: now }],
    created_at: now,
    updated_at: now
  };
  if (supabase) {
    const { error } = await supabase.from("transactions").insert(transaction);
    if (error) return res.status(500).json({ success: false, message: error.message });
  } else {
    transactionsStore.unshift(transaction);
  }
  res.json({ success: true, transaction });
});

app.get("/api/analytics/seller/:sellerId", async (req, res) => {
  const { sellerId } = req.params;
  if (supabase) {
    const { data, error } = await supabase.from("listing_analytics").select("*").eq("seller_id", sellerId).order("day", { ascending: false }).limit(30);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, analytics: data || [] });
  }
  res.json({ success: true, analytics: listingAnalyticsStore.filter((a) => a.seller_id === sellerId) });
});

// ============================================
// GEMINI AI INTEGRATION PROXIES (SERVER-SIDE)
// ============================================

function robustParseJSON(text: string): any {
  let cleanText = (text || "{}").trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return JSON.parse(cleanText);
}

// A. Gemini Pricing Recommendation Analysis
app.post("/api/gemini/analyze-pricing", async (req, res) => {
  const { name, condition, originalPrice, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Tên sản phẩm trống!" });

  if (!ai) {
    // Return high quality simulated data if API key is not ready
    return res.json({
      success: true,
      simulated: true,
      analysis: {
        suggestedLowerLimit: Math.floor((originalPrice || 200000) * 0.35),
        suggestedUpperLimit: Math.floor((originalPrice || 200000) * 0.55),
        recommendedPrice: Math.floor((originalPrice || 200000) * 0.45),
        confidence: "Cao (92%)",
        schoolSuitabilityScore: Math.floor(Math.random() * 15) + 85, // 85-99
        suggestedTags: ["Tiết kiệm", "Giá tốt sinh viên", "Xài bền"],
        reasoning: `Dựa vào dữ liệu thị trường sinh viên, sản phẩm "${name}" có tình trạng "${condition || "Cũ"}" thường có mức khấu hao 50-60% giá trị gốc. Mức giá đề xuất là tối ưu nhất giúp tiếp cận khách hàng nhanh chóng trong 48h tại khu vực trường học của bạn.`
      }
    });
  }

  try {
    const prompt = `Bạn là một trợ lý AI định giá đồ cũ thông minh dành riêng cho sinh viên Việt Nam tại sàn giao dịch UNI-SHARE.
Hãy phân tích sản phẩm sau đây và đưa ra lời khuyên định giá hợp lý nhất dưới dạng JSON:
Tên sản phẩm: "${name}"
Tình trạng: "${condition || "Bình thường"}"
Giá mua mới gốc: ${originalPrice || "Chưa rõ"} VND
Mô tả chi tiết: "${description || "Không có mô tả"}"

Yêu cầu trả về cấu trúc JSON duy nhất:
{
  "suggestedLowerLimit": number, // Giới hạn dưới của khoảng giá đề xuất (VND)
  "suggestedUpperLimit": number, // Giới hạn trên của khoảng giá đề xuất (VND)
  "recommendedPrice": number,     // Mức giá đề xuất khuyên dùng cụ thể (VND)
  "confidence": string,           // Độ tin cậy (ví dụ "Cao (90%)", "Trung bình (75%)")
  "schoolSuitabilityScore": number, // Điểm số phù hợp học đường (từ 0 đến 100, ưu tiên đồ dùng học tập, sách, điện tử)
  "suggestedTags": string[],      // Danh sách từ 3 đến 5 thẻ từ khóa (tags) tối ưu SEO trong trường học (vd "đại cương", "học tốt", "ktx")
  "reasoning": string             // Lời giải thích ngắn gọn, khuyên dùng lý do tại sao đặt mức giá này bằng tiếng Việt, thân thiện dễ học hỏi.
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
      },
    });

    const rawText = response.text || "{}";
    console.log("[analyze-pricing] Gemini raw response:", rawText.substring(0, 200));

    const data = robustParseJSON(rawText);
    res.json({ success: true, analysis: data });
  } catch (error: any) {
    console.error("[analyze-pricing] Gemini Error:", error?.message || error);
    res.status(500).json({
      success: false,
      error: error?.message || "Lỗi không xác định từ Gemini API"
    });
  }
});

// B. Gemini Matchmaking Evaluation Reasoning
app.post("/api/gemini/match-reasoning", async (req, res) => {
  const { want, product } = req.body;
  if (!want || !product) {
    return res.status(400).json({ success: false, message: "Thiếu dữ liệu so khớp!" });
  }

  if (!ai) {
    return res.json({
      success: true,
      simulated: true,
      match: {
        score: Math.floor(Math.random() * 10) + 85, // 85 -> 95
        reason: `Mức độ phù hợp cực cao! Sản phẩm "${product.name}" đáp ứng hoàn hảo tiêu chí danh mục "${want.category}" của bạn. Giá bán ${product.price.toLocaleString()} VND nằm hoàn hảo trong giới hạn ngân sách ${want.budget} đề xuất.`
      }
    });
  }

  try {
    const prompt = `So sánh nhu cầu mua của người mua (Lực lượng Cần mua) và tin đăng bán của người bán (Lực lượng Bán) trên Uni-Share.
Hãy đánh giá mức độ tương thích của hai bài đăng sau dưới dạng JSON:

Ý NUỐN NGƯỜI MUA:
- Tên nhu cầu: "${want.title}"
- Ngân sách: "${want.budget}"
- Danh mục: "${want.category}"
- Chi tiết: "${want.description}"

SẢN PHẨM CỦA NGƯỜI BÁN:
- Tên món đồ: "${product.name}"
- Chi tiết: "${product.description}"
- Giá bán: ${product.price} VND
- Trường học: "${product.school}"
- Tình trạng: "${product.condition}"

Hãy trả về chuỗi JSON duy nhất sau:
{
  "score": number,  // Điểm số tương thích từ 0 đến 100 dựa trên tiện ích, ngân sách, vị trí trường, chất lượng và danh mục. Hoàn toàn phù hợp tầm 90-95.
  "reason": string  // Đoạn phân tích dí hỏm ngắn gọn bằng tiếng Việt (khoảng 3-4 câu) giải thích tại sao khớp và có những điểm tối ưu nào (vị trí gần trường hay tiết kiệm ngân sách).
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = robustParseJSON(response.text || "{}");
    res.json({ success: true, match: parsed });
  } catch (error: any) {
    console.error("Gemini Matchmaking Error:", error);
    res.json({
      success: true,
      simulated: true,
      match: {
        score: Math.floor(Math.random() * 12) + 84,
        reason: `Mặt hàng "${product.name}" có thể giao dịch nhanh chóng tại ${product.school}. Đáp ứng tiêu chuẩn "${want.category}" với mức chi phí tiết kiệm tối ưu.`
      }
    });
  }
});

// C. Gemini AI Smart Lens Search (Image search helper)
app.post("/api/gemini/smart-lens", async (req, res) => {
  const { imageBase64, sampleId } = req.body;

  // Dictionary of known sample images to facilitate fast mock/real detection
  const sampleData: Record<string, any> = {
    lenses_1: {
      name: "Sách Kinh tế vĩ mô Ngoại Thương",
      category: "Sách & Giáo trình",
      condition: "Còn mới 90%",
      suggestedPrice: 45000,
      tags: ["kinh té vĩ mô", "giáo trình ftu", "sách ftu", "kinh tế học"]
    },
    lenses_2: {
      name: "Tai nghe Sony WH-1000XM4 Chống ỒN",
      category: "Thiết bị công nghệ",
      condition: "Còn mới 85%",
      suggestedPrice: 3200000,
      tags: ["sony xl4", "tai nghe bluetooth", "tai nghe chống ồn", "sony wh"]
    },
    lenses_3: {
      name: "Bàn học gấp gọn đa năng",
      category: "Đồ dùng phòng trọ",
      condition: "Còn mới 95%",
      suggestedPrice: 35000,
      tags: ["bàn gấp", "bàn học sinh", "bàn ktx", "bàn phòng trọ"]
    }
  };

  // If a sample preset is chosen and no base64 provided
  if (sampleId && sampleData[sampleId] && !imageBase64) {
    return res.json({ success: true, results: sampleData[sampleId] });
  }

  // If no API key or image is missing
  if (!imageBase64) {
    return res.status(400).json({ success: false, message: "Thiếu dữ liệu hình ảnh!" });
  }

  if (!ai) {
    // AI not initialized, return fake prediction
    return res.json({
      success: true,
      simulated: true,
      results: {
        name: "Sách ôn thi Toeic / Tiếng anh học thuật",
        category: "Sách & Giáo trình",
        condition: "Mới khoảng 90%",
        suggestedPrice: 65000,
        tags: ["sách ngữ pháp", "toeic cũ", "ôn thi tieng anh"]
      }
    });
  }

  try {
    // Process image base64 robustly
    let cleanBase64 = imageBase64;
    let mimeType = "image/jpeg";
    if (imageBase64.includes(";base64,")) {
      const parts = imageBase64.split(";base64,");
      const header = parts[0];
      cleanBase64 = parts[1];
      if (header.startsWith("data:")) {
        mimeType = header.substring(5);
      }
    }

    // Strip whitespaces or newlines
    cleanBase64 = cleanBase64.replace(/\s/g, "");

    const imgPart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64
      }
    };

    const textPart = {
      text: `Bạn là trợ lý AI chuyên nhận diện ảnh sản phẩm thanh lý trên sàn sinh viên UNI-SHARE.
Hãy phân tích hình ảnh này và đưa ra kết quả phân loại chuẩn dưới dạng JSON:
{
  "name": string,              // Dự đoán tên chính xác của vật thể hoặc nhãn hiệu bằng tiếng Việt (ví dụ: "Bình giữ nhiệt Lock&Lock", "Giáo trình Toán cao cấp")
  "category": string,          // Phải thuộc 1 trong 4 nhóm: "Sách & Giáo trình", "Thiết bị công nghệ", "Đồ dùng phòng trọ", "Đồ dùng cá nhân khác"
  "condition": string,         // Tình trạng trực quan ước tính (ví dụ: "Còn mới khoảng 90%", "Cũ xước nhẹ")
  "suggestedPrice": number,    // Giá trị ước lượng thanh lý phù hợp với sinh viên (VND)
  "description": string,       // Mô tả ngắn gọn về sản phẩm, đặc điểm nhận dạng và công năng bằng tiếng Việt (2-3 câu).
  "tags": [string, string...]  // 4 từ khóa tìm kiếm liên quan không dấu và có dấu viết thường để nhập vào ô tìm kiếm sản phẩm.
}`
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [imgPart, textPart] }],
      config: {
        temperature: 0.2
      }
    });

    const rawText = response.text || "{}";
    console.log("[smart-lens] Gemini raw response:", rawText.substring(0, 200));

    const parsed = robustParseJSON(rawText);

    // Validate required fields
    if (!parsed.name || !parsed.category) {
      throw new Error("Gemini trả về JSON thiếu trường bắt buộc: " + rawText.substring(0, 100));
    }

    res.json({ success: true, results: parsed });
  } catch (error: any) {
    console.error("[smart-lens] Gemini Error:", error?.message || error);
    res.status(500).json({
      success: false,
      error: error?.message || "Lỗi không xác định từ Gemini API"
    });
  }
});


import next from "next";

async function startServer() {
  // Pre-seed Supabase database if tables exist and are empty
  await seedSupabaseIfNeeded().then(() => cleanupLegacyHardcodedChats());

  const dev = process.env.NODE_ENV !== "production";
  const nextApp = next({ dev: dev, dir: process.cwd() });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  // Route everything except /api to Next.js
  app.all("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).end();
    }
    return handle(req, res);
  });

  // Listen for socket connections
  io.on("connection", (socket) => {
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
    });
  });

  // Bind to port and host
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();