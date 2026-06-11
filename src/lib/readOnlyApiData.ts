import { createClient } from "@supabase/supabase-js";
import {
  INITIAL_PRODUCTS,
  INITIAL_WANTS,
  INITIAL_FORUM_POSTS,
  INITIAL_CHAT_ROOMS,
} from "../fallbackData";

const createSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

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
    images: Array.isArray(p.images)
      ? p.images
      : typeof p.images === "string"
        ? JSON.parse(p.images)
        : [],
    school: p.school,
    author: p.author,
    // Normalize author id across possible DB column naming
    authorId:
      (p.author_id ?? p.authorId ?? p.seller_id ?? p.owner_id ?? "") ?? "",


    isStudentVerified: p.is_student_verified,
    views: Number(p.views),
    likes: Number(p.likes),
    status: p.status,
    suitabilityScore: Number(p.suitability_score),
    tags: Array.isArray(p.tags)
      ? p.tags
      : typeof p.tags === "string"
        ? JSON.parse(p.tags)
        : [],
    sellerRating:
      p.seller_rating !== null && p.seller_rating !== undefined
        ? Number(p.seller_rating)
        : 4.8,
    sellerReviewCount:
      p.seller_review_count !== null && p.seller_review_count !== undefined
        ? Number(p.seller_review_count)
        : 8,
    createdAt: p.created_at,
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
    createdAt: w.created_at,
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
    createdAt: c.created_at,
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
    joinedUsers: Array.isArray(f.joined_users)
      ? f.joined_users
      : typeof f.joined_users === "string"
        ? JSON.parse(f.joined_users)
        : [],
    targetMembers: f.target_members,
    currentPrice: f.current_price,
    originalPrice: f.original_price,
    productImage: f.product_image,
    isGroupBuyCompleted: f.is_group_buy_completed,
    createdAt: f.created_at,
  };
};

/**
 * Assemble a ChatRoom object from DB records.
 * Buyer info is loaded from the `users` table using room.buyer_id.
 * Pass `allUsers` (pre-fetched) to avoid N+1 queries.
 */
const assembleChatRoom = (
  room: any,
  allProducts: any[],
  messagesList: any[],
  allUsers: any[] = []
) => {
  if (!room) return null;

  const product = allProducts.find((p) => p.id === room.product_id);

  const roomMessages = messagesList
    .filter((m) => m.room_id === room.id)
    .map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      text: m.text,
      timestamp: m.timestamp,
    }));

  // Resolve buyer from users table (no more hardcode)
  const buyerRecord = allUsers.find((u) => u.id === room.buyer_id);
  const sellerRecord = allUsers.find(
    (u) => u.id === (room.seller_id || (product ? product.authorId : null))
  );

  return {
    roomId: room.id,
    product: {
      id: product ? product.id : room.product_id,
      name: product ? product.name : "Sản phẩm không hoạt động",
      price: product ? product.price : 0,
      image:
        product && product.images?.[0]
          ? product.images[0]
          : "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c",
      school: product ? product.school : "Chưa rõ",
    },
    buyer: {
      id: room.buyer_id || "unknown",
      name: buyerRecord?.display_name || buyerRecord?.displayName || "Người mua",
      school:
        buyerRecord?.university_short_name ||
        buyerRecord?.university_name ||
        buyerRecord?.universityName ||
        "Chưa rõ",
    },
    seller: {
      id: room.seller_id || (product ? product.authorId : "unknown"),
      name: product
        ? product.author
        : sellerRecord?.display_name || "Người bán ẩn danh",
      school: product ? product.school : "Chưa rõ",
      isStudentVerified: product ? product.isStudentVerified : true,
    },
    messages: roomMessages,
  };
};

export async function getProductsData() {
  const supabase = createSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return { success: true, products: data.map(mapProductFromDB) };
      }

      console.error("Supabase products fetch failed:", error);
    } catch (error) {
      console.error("Products GET Error:", error);
    }
  }

  return { success: true, products: INITIAL_PRODUCTS };
}

export async function getWantsData() {
  const supabase = createSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("wants")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return { success: true, wants: data.map(mapWantFromDB) };
      }

      console.error("Supabase wants fetch failed:", error);
    } catch (error) {
      console.error("Wants GET Error:", error);
    }
  }

  return { success: true, wants: INITIAL_WANTS };
}

export async function getForumData() {
  const supabase = createSupabaseClient();

  if (supabase) {
    try {
      const { data: posts, error: postsError } = await supabase
        .from("forum_posts")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: comments } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: true });

      if (!postsError && posts) {
        const mappedPosts = posts.map((post) => {
          const postComments = (comments || [])
            .filter((c) => c.post_id === post.id)
            .map(mapCommentFromDB);
          return mapForumPostFromDB(post, postComments);
        });
        return { success: true, forumPosts: mappedPosts };
      }

      console.error("Supabase forum fetch failed:", postsError);
    } catch (error) {
      console.error("Forum GET Error:", error);
    }
  }

  return { success: true, forumPosts: INITIAL_FORUM_POSTS };
}

/**
 * Fetch all chat rooms for a specific user (buyer).
 * Pass userId to filter only rooms belonging to that user.
 * If userId is omitted, returns all rooms (admin/fallback use only).
 */
export async function getChatsData(userId?: string) {
  const supabase = createSupabaseClient();

  if (supabase) {
    try {
      // Build query — filter by buyer_id when userId is provided
      let roomsQuery = supabase.from("chat_rooms").select("*");
      if (userId) {
        roomsQuery = roomsQuery.eq("buyer_id", userId);
      }

      const { data: rooms, error: roomsError } = await roomsQuery;
      const { data: products } = await supabase.from("products").select("*");
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .order("timestamp", { ascending: true });

      // Pre-fetch all users referenced in these rooms to resolve names
      const { data: users } = await supabase.from("users").select("*");

      if (!roomsError && rooms) {
        const allProducts = (products || []).map(mapProductFromDB);
        const allUsers = users || [];
        const chatRooms = rooms
          .map((room) =>
            assembleChatRoom(room, allProducts, messages || [], allUsers)
          )
          .filter(Boolean);

        return { success: true, chatRooms };
      }

      console.error("Supabase chats fetch failed:", roomsError);
    } catch (error) {
      console.error("Chats GET Error:", error);
    }
  }

  // Fallback: return hardcoded data filtered by userId if possible
  const fallback = userId
    ? INITIAL_CHAT_ROOMS.filter(
        (r: any) => r.buyer?.id === userId || r.buyer?.id === "user_client_default"
      )
    : INITIAL_CHAT_ROOMS;

  return { success: true, chatRooms: fallback };
}