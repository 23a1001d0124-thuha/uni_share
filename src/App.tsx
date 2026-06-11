"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Sparkles,
  User,
  ShieldCheck,
  HeartHandshake,
  AlertCircle,
  MessageSquare,
  Settings,
  HelpCircle,
  Megaphone,
  Loader2,
  CreditCard,
  ChevronRight,
  Bell,
  Search,
} from "lucide-react";
import {
  Product,
  Want,
  ForumPost,
  ChatRoom,
  UserProfile,
  SystemNotification,
} from "./types";

// Seeded Local Fallbacks
import {
  INITIAL_PRODUCTS,
  INITIAL_WANTS,
  INITIAL_FORUM_POSTS,
  INITIAL_CHAT_ROOMS,
} from "./fallbackData";

// Modular Subspaces
import MarketplaceSpace from "./components/MarketplaceSpace";
import TinderMatchmaking from "./components/TinderMatchmaking";
import ChatWorkspace from "./components/ChatWorkspace";
import ForumBoard from "./components/ForumBoard";
import MyListings from "./components/MyListings";
import CheckoutWizard from "./components/CheckoutWizard";
import HelpCenter from "./components/HelpCenter";
import SettingsPanel from "./components/SettingsPanel";
import MobileBottomNav from "./components/MobileBottomNav";
import PostItemModal from "./components/PostItemModal";
import SearchOverlay from "./components/SearchOverlay";
import { useAuth } from "./components/auth/AuthContext";
import VerifyStudentModal from "./components/auth/VerifyStudentModal";
import LoginModal from "./components/auth/LoginModal";
import SellerProfileModal from "./components/SellerProfileModal";
import { io, Socket } from "socket.io-client";

export default function App() {
  // Navigation Tabs: marketplace | tinder | chat | forum | my-listings | checkout | help | settings
  const [activeTab, setActiveTab] = useState<string>("marketplace");
  const [isGlobalPostOpen, setIsGlobalPostOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<{
    name: string;
    school: string;
  } | null>(null);

  // Core Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [wants, setWants] = useState<Want[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<Product[]>([]);
  const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
    {
      id: "notif_1",
      type: "success",
      title: "Xác Thực Thẻ Sinh Viên [Tick Xanh] Uy Tín",
      message:
        "Quy chế kiểm định thành viên hoàn tất. Badge sinh viên chính thức giúp bạn được ưu ái hiển thị khi đăng tin rao thanh lý sản phẩm.",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      isRead: false,
    },
    {
      id: "notif_2",
      type: "warning",
      title: "Nhận Voucher Khớp Nhu Cầu 15%",
      message:
        "Dành riêng cho bạn từ hệ thống ghép đôi AI Matchmaking, bạn đã nhận Voucher **SIVIEN15** chiết khấu cao cho dụng cụ phòng trọ!",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: false,
    },
    {
      id: "notif_3",
      type: "info",
      title: "Kích Hoạt Hệ Thống Đánh Giá Người Bán!",
      message:
        "Giờ đây khi kết toán giao dịch, hệ thống sẽ đề hiển popup 5 sao cho bạn đánh giá người bán! Số sao này gắn liền bên cạnh thẻ sinh viên uy tín.",
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      isRead: false,
    },
  ];
  // Khởi tạo rỗng — chỉ load khi user đăng nhập (xem useEffect bên dưới)
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const unreadNotificationsCount = notifications.filter(
    (n) => !n.isRead,
  ).length;

  const pushNotification = (
    title: string,
    message: string,
    type: "success" | "warning" | "info" | "message" = "info",
  ) => {
    setNotifications((prev) => [
      {
        id: "notif_" + Date.now(),
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        isRead: false,
      },
      ...prev,
    ]);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const [savedProductIds, setSavedProductIds] = useState<
    Record<string, boolean>
  >({});

  const handleToggleSave = (pId: string) => {
    setSavedProductIds((prev) => ({
      ...prev,
      [pId]: !prev[pId],
    }));
  };

  const handleReportProduct = async (product: Product, reason: string) => {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        productName: product.name,
        sellerId: product.authorId,
        sellerName: product.author,
        reporterId: user?.id || "guest",
        reporterName: (user?.displayName || profile?.name) ?? "",
        reason,
      }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || "Cannot submit report");
    }
    pushNotification(
      "Da gui bao cao",
      "Cam on ban da giup UNI-SHARE an toan hon.",
      "success",
    );
  };

  // AuthContext and Verification modals bindings
  const { user, token } = useAuth();
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Selected Room ID
  const [activeRoomId, setActiveRoomId] = useState<string>("");

  // Network State
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("new_message", (data: { roomId: string; message: any }) => {
      setChatRooms((prevRooms) => {
        const updatedRooms = [...prevRooms];
        const roomIndex = updatedRooms.findIndex(
          (r) => r.roomId === data.roomId,
        );
        if (roomIndex > -1) {
          const exists = updatedRooms[roomIndex].messages.some(
            (m) => m.id === data.message.id,
          );
          if (!exists) {
            updatedRooms[roomIndex].messages.push(data.message);
            if (activeTab !== "chat" || activeRoomId !== data.roomId) {
              pushNotification(
                "Tin nhắn thương lượng mới",
                `Bạn có thông điệp mới từ phiên đàm phán đồ cũ: "${data.message.text.substring(0, 30)}..."`,
                "message",
              );
            }
          }
        }
        return updatedRooms;
      });
    });

    // Real-time: bình luận mới trên bất kỳ bài đăng forum nào
    newSocket.on(
      "forum_new_comment",
      (data: { postId: string; post: ForumPost }) => {
        setForumPosts((prev) =>
          prev.map((p) => (p.id === data.postId ? data.post : p)),
        );
      },
    );

    // Real-time: bài đăng mới từ sinh viên khác
    newSocket.on("forum_new_post", (newPost: ForumPost) => {
      setForumPosts((prev) => {
        // Tránh duplicate nếu chính mình vừa đăng
        if (prev.some((p) => p.id === newPost.id)) return prev;
        if (activeTab !== "forum") {
          pushNotification(
            "Bản tin mới 📣",
            `${newPost.author} vừa đăng: "${newPost.title}"`,
            "info",
          );
        }
        return [newPost, ...prev];
      });
    });

    return () => {
      newSocket.off("new_message");
      newSocket.off("forum_new_comment");
      newSocket.off("forum_new_post");
      newSocket.disconnect();
    };
  }, [activeTab, activeRoomId]);

  useEffect(() => {
    if (socket && chatRooms.length > 0) {
      chatRooms.forEach((room) => {
        socket.emit("join_room", room.roomId);
      });
    }
  }, [socket, chatRooms]);

  // Khởi tạo null — chỉ set sau khi user đăng nhập thành công
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Keep profile synchronized with credentials-driven AuthContext
  useEffect(() => {
    if (user) {
      // Đăng nhập: set profile từ user data
      setProfile({
        name: user.displayName,
        school:
          user.universityShortName ||
          user.universityName ||
          "Chưa xác thực trường",
        isVerified: user.isStudentVerified,
        studentId: user.studentEmail
          ? user.studentEmail.split("@")[0].toUpperCase()
          : "CHƯA_XÁC_THỰC",
        paymentLinked: false,
        notificationsEnabled: true,
      });
      // Load notifications sau khi đăng nhập
      setNotifications(DEFAULT_NOTIFICATIONS);
    } else {
      // Đăng xuất: reset về trạng thái khách
      setProfile(null);
      setNotifications([]);
    }
  }, [user]);

  // Fetch Database on startup
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch products
      const pRes = await fetch("/api/products");
      if (!pRes.ok)
        throw new Error("Product fetch failed status " + pRes.status);
      const pContentType = pRes.headers.get("content-type");
      if (!pContentType || !pContentType.includes("application/json")) {
        throw new Error("Returned non-JSON content type");
      }
      const pData = await pRes.json();
      if (pData.success) {
        setProducts(pData.products);
      }

      // 2. Fetch wants
      const wRes = await fetch("/api/wants");
      const wData = await wRes.json();
      if (wData.success) setWants(wData.wants);

      // 3. Fetch forum posts
      const fRes = await fetch("/api/forum");
      const fData = await fRes.json();
      if (fData.success) setForumPosts(fData.forumPosts);

      // 4. Fetch chats — gửi token để server filter đúng rooms của user
      const activeToken = token || localStorage.getItem("unishare_token");
      const cHeaders: HeadersInit = activeToken
        ? { Authorization: `Bearer ${activeToken}` }
        : {};
      const cRes = await fetch("/api/chats", { headers: cHeaders });
      const cData = await cRes.json();
      if (cData.success) {
        setChatRooms(cData.chatRooms);
        if (cData.chatRooms.length > 0 && !activeRoomId) {
          setActiveRoomId(cData.chatRooms[0].roomId);
        }
      }
    } catch (e) {
      console.warn(
        "Express API is unreachable or returned invalid non-JSON pages (e.g. static hosting Vercel fallback). Loading persistent offline sandbox databases...",
        e,
      );

      // Load products fallback
      const localProds = localStorage.getItem("uni_local_products");
      if (localProds) {
        setProducts(JSON.parse(localProds));
      } else {
        setProducts(INITIAL_PRODUCTS);
        localStorage.setItem(
          "uni_local_products",
          JSON.stringify(INITIAL_PRODUCTS),
        );
      }

      // Load wants fallback
      const localWants = localStorage.getItem("uni_local_wants");
      if (localWants) {
        setWants(JSON.parse(localWants));
      } else {
        setWants(INITIAL_WANTS);
        localStorage.setItem("uni_local_wants", JSON.stringify(INITIAL_WANTS));
      }

      // Load forum fallback
      const localForum = localStorage.getItem("uni_local_forum_posts");
      if (localForum) {
        setForumPosts(JSON.parse(localForum));
      } else {
        setForumPosts(INITIAL_FORUM_POSTS);
        localStorage.setItem(
          "uni_local_forum_posts",
          JSON.stringify(INITIAL_FORUM_POSTS),
        );
      }

      // Load chats fallback
      const localChats = localStorage.getItem("uni_local_chat_rooms");
      if (localChats) {
        const parsedChats = JSON.parse(localChats);
        setChatRooms(parsedChats);
        if (parsedChats.length > 0 && !activeRoomId) {
          setActiveRoomId(parsedChats[0].roomId);
        }
      } else {
        setChatRooms(INITIAL_CHAT_ROOMS);
        localStorage.setItem(
          "uni_local_chat_rooms",
          JSON.stringify(INITIAL_CHAT_ROOMS),
        );
        if (INITIAL_CHAT_ROOMS.length > 0 && !activeRoomId) {
          setActiveRoomId(INITIAL_CHAT_ROOMS[0].roomId);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    }
  }, []);

  // Post new product listing
  const handleAddNewProductListing = async (newProductPayload: any) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    const localNewProd: Product = {
      id: "prod_" + Date.now(),
      name: newProductPayload.name,
      category: newProductPayload.category,
      price: Number(newProductPayload.price),
      originalPrice: newProductPayload.originalPrice
        ? Number(newProductPayload.originalPrice)
        : Number(newProductPayload.price) * 1.8,
      condition: newProductPayload.condition || "Còn mới 90%",
      description:
        newProductPayload.description ||
        `Thanh lý ${newProductPayload.name} nội trú sinh viên học tập sinh hoạt tiện ích tốt chất lượng.`,
      images:
        newProductPayload.images && newProductPayload.images.length > 0
          ? newProductPayload.images
          : ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600"],
      school: (newProductPayload.school || profile?.school) ?? "",
      author: (newProductPayload.author || profile?.name) ?? "",
      authorId: user?.id || "unknown",
      isStudentVerified: true,
      views: 1,
      likes: 0,
      status: "Đang bán",
      suitabilityScore: Math.floor(Math.random() * 15) + 85,
      createdAt: new Date().toISOString(),
    };

    const activeToken = token || localStorage.getItem("unishare_token");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify(newProductPayload),
      });
      const data = await res.json();
      if (data.success) {
        // Re-fetch products to obtain sync
        await fetchAllData();
        return;
      }
      // Server returned success: false — show real error, do NOT fall through silently
      console.error("[handleAddNewProductListing] Server error:", data.message);
      alert(`Đăng tin thất bại: ${data.message || "Lỗi không xác định"}`);
      return;
    } catch (e) {
      console.warn("Backend unaccessible during new list publication:", e);
      alert("Không thể kết nối server. Kiểm tra console để xem lỗi chi tiết.");
    }
  };

  // Add Product to Cart
  const handleAddToCart = (product: Product) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    // Block seller from buying their own listing
    if (product.authorId && product.authorId === user.id) {
      alert("Bạn không thể mua sản phẩm do chính mình đăng bán!");
      return;
    }
    // Unique check
    if (cart.find((item) => item.id === product.id)) {
      alert("Sản phẩm đã có sẵn trong giỏ hàng!");
      return;
    }
    setCart((prev) => [...prev, product]);
  };

  // Remove product from Cart
  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Upvote forum bullet post
  const handleUpvotePost = async (postId: string) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    try {
      const res = await fetch(`/api/forum/${postId}/upvote`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setForumPosts((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, upvotes: data.upvotes } : post,
          ),
        );
        return;
      }
    } catch (e) {
      console.warn(
        "Backend upvote failed. Committing upvote action in client-side sandbox:",
        e,
      );
    }

    // Client-side local updater
    setForumPosts((prev) => {
      const updated = prev.map((post) =>
        post.id === postId ? { ...post, upvotes: post.upvotes + 1 } : post,
      );
      localStorage.setItem("uni_local_forum_posts", JSON.stringify(updated));
      return updated;
    });
  };

  // Join group buy / Event on forum
  const handleJoinGroupPost = async (postId: string) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    try {
      const res = await fetch(`/api/forum/${postId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user_client_default" }),
      });
      const data = await res.json();
      if (data.success) {
        setForumPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, joinedUsers: data.joinedUsers }
              : post,
          ),
        );
        return;
      }
    } catch (e) {
      console.warn("Backend forum group join failed. Applying locally:", e);
    }

    // Client-side local updater
    let groupJustCompleted = false;
    let completedPostTitle = "";

    setForumPosts((prev) => {
      const updated = prev.map((post) => {
        if (post.id === postId) {
          const joinedArray = post.joinedUsers || [];
          const currentUserId = user?.id || "user_client_default";
          const hasJoined = joinedArray.includes(currentUserId);
          const newJoinedUsers = hasJoined
            ? joinedArray.filter((u) => u !== currentUserId)
            : [...joinedArray, currentUserId];

          let completed = post.isGroupBuyCompleted;
          if (
            !hasJoined &&
            post.targetMembers &&
            newJoinedUsers.length + 1 >= post.targetMembers &&
            !post.isGroupBuyCompleted
          ) {
            completed = true;
            groupJustCompleted = true;
            completedPostTitle = post.title;
          }

          return {
            ...post,
            joinedUsers: newJoinedUsers,
            isGroupBuyCompleted: completed,
          };
        }
        return post;
      });
      localStorage.setItem("uni_local_forum_posts", JSON.stringify(updated));
      return updated;
    });

    if (groupJustCompleted) {
      pushNotification(
        "Gom sỉ thành công! 🎉",
        `Tuyệt vời! Nhóm gom sỉ "${completedPostTitle}" đã đủ thành viên. Tặng bạn mã Voucher GOMCHUNG20 giảm giá 20% đơn. Hãy nhắn tin cho Leader ngay!`,
        "success",
      );
    }
  };

  // Create forum post
  const handlePublishForumPost = async (newPost: any) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    const localPost: ForumPost = {
      id: "forum_" + Date.now(),
      title: newPost.title,
      tag: newPost.tag || "Thảo luận",
      author: (newPost.author || profile?.name) ?? "",
      school: (newPost.school || profile?.school) ?? "",
      content: newPost.content,
      upvotes: 1,
      commentsCount: 0,
      comments: [],
      joinedUsers: [],
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPost),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAllData();
        return;
      }
    } catch (e) {
      console.warn("Backend forum publication failed. Resolving locally:", e);
    }

    // Client-side local updater
    setForumPosts((prev) => {
      const updated = [localPost, ...prev];
      localStorage.setItem("uni_local_forum_posts", JSON.stringify(updated));
      return updated;
    });
  };

  // Add Comment on Forum Post
  const handleAddForumComment = async (postId: string, text: string) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    const localComment = {
      id: "comment_" + Date.now(),
      author: profile?.name ?? "",
      school: profile?.school ?? "",
      content: text,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`/api/forum/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: profile?.name ?? "",
          school: profile?.school ?? "",
          content: text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForumPosts((prev) =>
          prev.map((post) => (post.id === postId ? data.post : post)),
        );
        return;
      }
    } catch (e) {
      console.warn(
        "Backend comment addition failed. Saving comment locally:",
        e,
      );
    }

    // Client-side local updater
    setForumPosts((prev) => {
      const updated = prev.map((post) => {
        if (post.id === postId) {
          const nextComments = [...(post.comments || []), localComment];
          return {
            ...post,
            commentsCount: nextComments.length,
            comments: nextComments,
          };
        }
        return post;
      });
      localStorage.setItem("uni_local_forum_posts", JSON.stringify(updated));
      return updated;
    });
  };

  // Select item chat links
  const handleProductChatTrigger = async (productId: string) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    const activeToken = token || localStorage.getItem("unishare_token");

    try {
      const res = await fetch("/api/chats/find-or-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        // Upsert room vào state (thêm mới hoặc cập nhật nếu đã có)
        setChatRooms((prev) => {
          const idx = prev.findIndex((r) => r.roomId === data.room.roomId);
          if (idx > -1) {
            const updated = [...prev];
            updated[idx] = data.room;
            return updated;
          }
          return [data.room, ...prev];
        });
        setActiveRoomId(data.room.roomId);
        setActiveTab("chat");
        return;
      }
    } catch (e) {
      console.warn("Backend find-or-create failed:", e);
    }

    // Fallback client-side (khi server không khả dụng)
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const roomId = `room_local_${productId}_${user.id}`;
    setChatRooms((prev) => {
      const existingRoom = prev.find(
        (r) =>
          r.roomId === roomId ||
          (r.product.id === productId && r.buyer.id === user.id),
      );
      if (existingRoom) {
        setActiveRoomId(existingRoom.roomId);
        setActiveTab("chat");
        return prev;
      }

      const newRoom = {
        roomId,
        viewerRole: "buyer" as const,
        product: {
          id: targetProduct.id,
          name: targetProduct.name,
          price: targetProduct.price,
          image:
            targetProduct.images[0] ||
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600",
          school: targetProduct.school,
        },
        buyer: {
          id: user.id,
          name: user.displayName,
          school: user.universityShortName || user.universityName || "Chưa rõ",
        },
        seller: {
          id: targetProduct.authorId || "seller_id",
          name: targetProduct.author,
          school: targetProduct.school,
          isStudentVerified: targetProduct.isStudentVerified,
        },
        messages: [
          {
            id: "msg_init_" + Date.now(),
            senderId: targetProduct.authorId || "seller_id",
            text: `Chào bạn, mình thấy bạn quan tâm đến sản phẩm "${targetProduct.name}" của mình.`,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      setActiveRoomId(roomId);
      setActiveTab("chat");
      return [newRoom, ...prev];
    });
  };

  // Post chat message
  const handlePostChatMessage = async (roomId: string, text: string) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    const activeToken = token || localStorage.getItem("unishare_token");

    try {
      const res = await fetch(`/api/chats/${roomId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success) {
        setChatRooms((prev) =>
          prev.map((room) => (room.roomId === roomId ? data.room : room)),
        );
        return;
      }
    } catch (e) {
      console.warn("Backend message post failed:", e);
    }

    // Fallback: thêm tin nhắn trực tiếp vào local state
    const newMessage = {
      id: "msg_" + Date.now(),
      senderId: user.id,
      text,
      timestamp: new Date().toISOString(),
    };

    setChatRooms((prev) =>
      prev.map((room) => {
        if (room.roomId === roomId) {
          return { ...room, messages: [...(room.messages || []), newMessage] };
        }
        return room;
      }),
    );
  };

  // Mutate product sales status (Sold / Pending)
  const handlePostTransactionStatusNotice = async (
    productId: string,
    status: "Đang bán" | "Đang chờ" | "Đã bán",
  ) => {
    try {
      const res = await fetch(`/api/products/${productId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAllData();
        return;
      }
    } catch (e) {
      console.warn("Backend status PATCH failed. Applying status locally:", e);
    }

    setProducts((prev) => {
      const updated = prev.map((prod) =>
        prod.id === productId ? { ...prod, status } : prod,
      );
      localStorage.setItem("uni_local_products", JSON.stringify(updated));
      return updated;
    });
  };

  // Verify Student Toggle handler inside Einstellungen
  const handleVerifyStudentToggle = (school: string, mssv: string) => {
    setIsVerifyModalOpen(true);
  };

  const handleTogglePaymentLinked = () => {
    setProfile((prev) => ({ ...prev, paymentLinked: !prev.paymentLinked }));
  };

  const handleToggleNotifications = () => {
    setProfile((prev) => ({
      ...prev,
      notificationsEnabled: !prev.notificationsEnabled,
    }));
  };

  return (
    <div className="bg-[#FFF6F7] min-h-screen text-stone-800 font-sans flex flex-col justify-between selection:bg-rose-100 pb-20 md:pb-0">
      {/* A. Global hourly golden-deal warning banner */}
      <div className="hidden md:flex bg-gradient-to-r from-rose-600 to-pink-500 py-2.5 text-center text-white font-semibold text-xs shrink-0 items-center justify-center gap-1.5 shadow-sm px-2">
        <Sparkles className="w-4 h-4 fill-white animate-spin text-white" />
        <span>
          🔥 ƯU ĐÃI THÀNH VIÊN: Giao dịch nội khu bằng ví **StudentPay** nhượng
          thêm 15% tổng hóa đơn!
        </span>
      </div>

      {/* B. MAIN PLATFORM HEADER BAR */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shrink-0 shadow-2xs h-[56px] md:h-auto flex items-center">
        <div className="max-w-7xl mx-auto px-4 w-full flex items-center justify-between py-1.5 md:py-3.5 gap-4">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-rose-600 to-pink-500 rounded-xl flex items-center justify-center text-white scale-100 shadow-sm shrink-0">
              <HeartHandshake className="w-5 h-5 md:w-5.5 md:h-5.5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-stone-900 tracking-tight leading-none text-sm md:text-base font-display">
                UNI-SHARE
              </h1>
              <p className="text-[10px] text-stone-500 font-semibold tracking-wide hidden md:block mt-0.5">
                CHỢ CŨ & KẾT ĐÔI
              </p>
            </div>
          </div>

          {/* User state context panels */}
          <div className="flex items-center gap-1.5 md:gap-3 justify-end shrink-0">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-stone-500 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition relative flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
              title="Tìm kiếm"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Mobile/Desktop Notification Bell Button */}
            <button
              onClick={() => {
                setActiveTab("notifications");
                markAllNotificationsRead();
              }}
              className="text-stone-500 hover:text-stone-800 p-2 rounded-xl hover:bg-stone-50 transition relative flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
              title="Thông báo"
            >
              <Bell className="w-5 h-5 text-stone-500" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-2 bg-rose-600 text-white text-[9px] font-bold w-4 h-4 rounded-full border border-white flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setActiveTab("checkout")}
              className="bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl p-2 md:p-2.5 relative flex items-center justify-center transition cursor-pointer shadow-sm border border-stone-200 min-h-[44px] min-w-[44px]"
              title="Giỏ hàng thanh toán"
              aria-label="Xem giỏ hàng thanh toán"
            >
              <ShoppingBag className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 border border-white text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {cart.length}
                </span>
              )}
            </button>

            {!user ? (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="hidden md:flex ml-2 py-2 px-4 rounded-xl text-xs font-bold transition cursor-pointer items-center gap-1.5 border bg-rose-600 text-white border-rose-600 hover:bg-rose-700 shadow-sm"
              >
                <User className="w-4 h-4 text-white" />
                Đăng nhập / Đăng ký
              </button>
            ) : (
              <button
                onClick={() => setActiveTab("settings")}
                className={`hidden md:flex ml-2 p-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer items-center gap-1.5 border ${
                  (user as any)?.isTrustedVerified
                    ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-300 hover:from-amber-100 hover:to-orange-100"
                    : profile?.isVerified
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                }`}
              >
                {(user as any)?.isTrustedVerified ? (
                  <span className="text-amber-500 text-sm">✦</span>
                ) : profile?.isVerified ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-[10px]">
                    SV
                  </div>
                )}
                <span className="truncate max-w-[124px]">{profile?.name}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* C. MAIN CONTENT VIEW SPACE WITH NAVIGATION DRAWER */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full grid grid-cols-1 md:grid-cols-12 gap-5 items-start pb-20 md:pb-0">
        {/* Navigation Sidebar Drawer (3 Cols) - Hidden on mobile, shown on desktop */}
        <nav className="hidden md:flex md:flex-col md:col-span-3 bg-white border border-stone-200 p-5 rounded-2xl md:sticky md:top-22 md:min-h-[calc(100vh-140px)] justify-between shadow-xs transition-all">
          <div className="space-y-1.5 w-full">
            <span className="text-xs text-stone-400 font-extrabold tracking-wider uppercase block px-3.5 mb-3 select-none">
              ĐIỀU HƯỚNG UNI-SHARE
            </span>

            <button
              onClick={() => setActiveTab("marketplace")}
              className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === "marketplace"
                  ? "bg-rose-600 text-white shadow-sm font-black"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4" />
                Chợ Đồ Cũ Sinh Viên
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tinder")}
              className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === "tinder"
                  ? "bg-rose-600 text-white shadow-sm font-black"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4" />
                AI Tinder Match
              </span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === "chat"
                  ? "bg-rose-600 text-white shadow-sm font-black"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                Phòng Thương Lượng Chat
              </span>
              {chatRooms.length > 0 && (
                <span
                  className={`text-[11px] font-black px-1.5 rounded-md ${activeTab === "chat" ? "bg-rose-500 text-white" : "bg-rose-100 text-rose-700"}`}
                >
                  {chatRooms.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("forum")}
              className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === "forum"
                  ? "bg-rose-600 text-white shadow-sm font-black"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Megaphone className="w-4 h-4" />
                Bản Tin SV (Wanted Board)
              </span>
            </button>

            <button
              onClick={() => setActiveTab("my-listings")}
              className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === "my-listings"
                  ? "bg-rose-600 text-white shadow-sm font-black"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <User className="w-4 h-4" />
                Trang Cá Nhân
              </span>
            </button>

            <div className="pt-4 border-t border-stone-100 mt-4 space-y-1">
              <button
                onClick={() => setActiveTab("help")}
                className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  activeTab === "help"
                    ? "bg-rose-600 text-white shadow-sm font-black"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4" />
                  Trợ Giúp An Toàn
                </span>
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full text-left py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-rose-600 text-white shadow-sm font-black"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4" />
                  Cài Đặt Cá Nhân
                </span>
              </button>
            </div>
          </div>

          {/* Expanded Bottom Sidebar Content (User avatar card) */}
          <div className="mt-auto pt-5 border-t border-stone-200">
            {profile ? (
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white shrink-0 font-bold">
                  {profile?.name?.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-stone-900 truncate font-display flex items-center gap-1">
                    {profile?.name}
                    {profile?.isVerified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                    {(user as any)?.isTrustedVerified && (
                      <span className="text-amber-500 text-xs">✦</span>
                    )}
                  </h4>
                  <p className="text-[10px] text-stone-500 truncate mt-0.5">
                    {profile?.school}
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
              >
                <User className="w-4 h-4" />
                Đăng nhập ngay
              </button>
            )}
          </div>
        </nav>

        {/* Dynamic Display Panel column (9 Cols) */}
        <div className="md:col-span-9 h-full min-h-[500px]">
          {activeTab === "marketplace" ? (
            <MarketplaceSpace
              products={products}
              isLoading={isLoading}
              onAddProduct={handleAddNewProductListing}
              onAddToCart={handleAddToCart}
              onSelectProductForChat={handleProductChatTrigger}
              isStudentVerified={profile?.isVerified}
              onTriggerVerification={() => setActiveTab("settings")}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectSellerForProfile={(name, school) =>
                setSelectedSeller({ name, school })
              }
              savedProductIds={savedProductIds}
              onToggleSave={handleToggleSave}
              onReportProduct={handleReportProduct}
              onOpenPostModal={() => setIsGlobalPostOpen(true)}
            />
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white border rounded-2xl">
              <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
              <span className="text-xs text-stone-400 font-bold tracking-wide">
                ĐANG TẢI GIAO DIỆN HỘI THOẠI...
              </span>
            </div>
          ) : (
            <>
              {activeTab === "tinder" && (
                <TinderMatchmaking
                  wants={wants}
                  products={products}
                  onOpenMatchChat={handleProductChatTrigger}
                />
              )}

              {activeTab === "chat" && (
                <ChatWorkspace
                  rooms={chatRooms}
                  currentUserId={user?.id || ""}
                  activeRoomId={activeRoomId}
                  onSelectRoom={setActiveRoomId}
                  onPostMessage={handlePostChatMessage}
                  onLockInTransaction={handlePostTransactionStatusNotice}
                />
              )}

              {activeTab === "forum" && (
                <ForumBoard
                  posts={forumPosts}
                  onUpvotePost={handleUpvotePost}
                  onJoinGroupRequest={handleJoinGroupPost}
                  onPublishPost={handlePublishForumPost}
                  onAddComment={handleAddForumComment}
                />
              )}

              {activeTab === "my-listings" && (
                <MyListings
                  products={products}
                  onUpdateStatus={handlePostTransactionStatusNotice}
                  onDeleteListing={async (id) => {
                    const res = await fetch(`/api/products/${id}`, {
                      method: "DELETE",
                    });
                    const data = await res.json();
                    if (data.success) await fetchAllData();
                  }}
                  onAddProduct={handleAddNewProductListing}
                  isStudentVerified={profile?.isVerified}
                />
              )}

              {activeTab === "checkout" && (
                <CheckoutWizard
                  cart={cart}
                  onRemoveFromCart={handleRemoveFromCart}
                  onClearCart={handleClearCart}
                  isStudentVerified={profile?.isVerified}
                  currentUserId={user?.id}
                  onPostMessageMock={handlePostChatMessage}
                  onSubmitNewTransactionNotice={async (pId) => {
                    await handlePostTransactionStatusNotice(pId, "Đã bán");
                    pushNotification(
                      "Thanh Toán An Toàn",
                      `Sản phẩm giao dịch mã #${pId.substring(0, 8)} đã được ghi nhận hoàn tất và đang bảo vệ bằng Escrow-Lite.`,
                      "success",
                    );
                  }}
                />
              )}

              {activeTab === "help" && <HelpCenter />}

              {activeTab === "notifications" && (
                <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b pb-3 border-stone-150">
                    <h2 className="text-sm font-extrabold text-stone-900 tracking-tight font-display uppercase flex items-center gap-2">
                      <Bell className="w-4 h-4 text-rose-600" />
                      Hộp thư thông báo Uni-share
                    </h2>
                    {unreadNotificationsCount > 0 && (
                      <span className="text-[11px] bg-rose-50 border border-rose-100 text-rose-700 font-extrabold px-2 py-0.5 rounded-md">
                        {unreadNotificationsCount} thông báo chưa đọc
                      </span>
                    )}
                  </div>

                  <div className="space-y-3.5 pt-2">
                    {notifications.length === 0 ? (
                      <p className="text-center text-stone-400 text-xs py-8">
                        Bạn chưa có thông báo nào mới.
                      </p>
                    ) : (
                      notifications.map((n) => {
                        let icon = "🔔";
                        let bgStyle = "bg-stone-50 border-stone-200";
                        let iconStyle = "bg-stone-100 text-stone-600";

                        if (n.type === "success") {
                          icon = "✓";
                          bgStyle = "bg-white border-stone-200";
                          iconStyle = "bg-emerald-100 text-emerald-700";
                        } else if (n.type === "warning") {
                          icon = "💰";
                          bgStyle = "bg-white border-stone-200";
                          iconStyle = "bg-amber-100 text-amber-700";
                        } else if (n.type === "info") {
                          icon = "🎉";
                          bgStyle = "bg-rose-50/40 border-rose-100";
                          iconStyle = "bg-rose-100 text-rose-600";
                        } else if (n.type === "message") {
                          icon = "💬";
                          bgStyle = "bg-blue-50/40 border-blue-100";
                          iconStyle = "bg-blue-100 text-blue-600";
                        }

                        return (
                          <div
                            key={n.id}
                            className={`flex gap-3.5 items-start p-3.5 rounded-xl border ${bgStyle} ${!n.isRead ? "shadow-xs border-l-4 border-l-rose-500" : ""}`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${iconStyle}`}
                            >
                              {icon}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-stone-900 block font-display">
                                {n.title}
                              </span>
                              <p className="text-stone-600 text-[11px] leading-relaxed mt-0.5">
                                {n.message}
                              </p>
                              <span className="text-[10px] text-stone-400 block mt-1">
                                {new Date(n.timestamp).toLocaleTimeString(
                                  "vi-VN",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}{" "}
                                -{" "}
                                {new Date(n.timestamp).toLocaleDateString(
                                  "vi-VN",
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <SettingsPanel
                  profile={profile}
                  isStudentVerified={profile?.isVerified}
                  onVerifyStudentToggle={handleVerifyStudentToggle}
                  onTogglePaymentLinked={handleTogglePaymentLinked}
                  onToggleNotifications={handleToggleNotifications}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* D. VISUALLY POLISHED FOOTER ACCENT */}
      <footer className="bg-white border-t border-stone-200 py-6 px-4 mt-12 text-center text-xs text-stone-400 shrink-0">
        <p className="font-semibold uppercase tracking-wider text-xs text-stone-500 font-display">
          © 2026 UNI-SHARE Marketplace Project
        </p>
        <p className="mt-1 font-medium text-xs">
          Phát triển thân thiện, kết nối văn minh, định hướng an toàn tài chính
          đời sống sinh viên Việt Nam.
        </p>
      </footer>

      {/* Mobile Bottom Fixed Navigation bar (Modular Component) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        chatRoomsLength={chatRooms.length}
        onPostOpen={() => setIsGlobalPostOpen(true)}
        onSearchOpen={() => setIsSearchOpen(true)}
      />

      {/* Global Post Item Modal */}
      <PostItemModal
        isOpen={isGlobalPostOpen}
        onClose={() => setIsGlobalPostOpen(false)}
        onAddProduct={handleAddNewProductListing}
        isStudentVerified={profile?.isVerified}
        onTriggerVerification={() => setActiveTab("settings")}
      />

      {/* Full-Screen Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={(query) => {
          setSearchQuery(query);
          setActiveTab("marketplace");
        }}
        products={products}
      />

      {/* Verify Student Modal */}
      <VerifyStudentModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <SellerProfileModal
        isOpen={!!selectedSeller}
        onClose={() => setSelectedSeller(null)}
        sellerName={selectedSeller?.name || ""}
        sellerSchool={selectedSeller?.school}
        products={products}
        onSelectProductForChat={handleProductChatTrigger}
      />
    </div>
  );
}
