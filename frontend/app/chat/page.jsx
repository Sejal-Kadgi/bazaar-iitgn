"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, MessageCircle, ShoppingBag } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000";

export default function ChatPage() {
  const [conversationId, setConversationId] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const conversation = params.get("conversationId") || "";
      const seller = params.get("seller") || "";
      const buyer = params.get("sender") || localStorage.getItem("userEmail") || "";

      setConversationId(conversation);
      setSellerEmail(seller);
      setBuyerEmail(buyer);

      if (conversation && seller && buyer) {
        fetchMessages(conversation);
        connectWebSocket(conversation);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async (conversation) => {
    try {
      const res = await fetch(`${API_BASE}/chat/conversation/${conversation}/messages`);

      if (!res.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = useCallback((conversation) => {
    // Close old socket if already exists
    if (socketRef.current) {
      socketRef.current.close();
    }

    const socket = new WebSocket(`${WS_BASE}/chat/ws/${conversation}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    socket.onmessage = (event) => {
      const newMessage = JSON.parse(event.data);

      if (!newMessage.error) {
        setMessages((prev) => {
          const alreadyExists = prev.some(
            (msg) =>
              msg._id === newMessage._id ||
              (msg.content === newMessage.content &&
                msg.sender_email === newMessage.sender_email &&
                msg.timestamp === newMessage.timestamp)
          );

          if (alreadyExists) return prev;

          return [...prev, newMessage];
        });
      } else {
        console.error("WebSocket error:", newMessage.error);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket connection error:", err);
    };

    socket.onclose = () => {
      console.log("🔌 WebSocket disconnected");
    };
  }, []);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      alert("Chat connection not ready yet");
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        sender_email: buyerEmail,
        receiver_email: sellerEmail,
        content: messageText,
        message_type: "text",
      })
    );

    setMessageText("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Loading chat...</h2>
          <p className="text-slate-500 mt-2">Fetching messages from backend.</p>
        </div>
      </div>
    );
  }

  if (!conversationId || !sellerEmail || !buyerEmail) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Chat not available</h2>
          <p className="text-slate-500 mt-2">
            Missing conversation or seller information.
          </p>
          <Link
            href="/home"
            className="inline-block mt-5 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-medium"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/home"
            className="flex items-center gap-3 text-2xl font-bold text-slate-900"
          >
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <span>Bazaar@IITGN</span>
          </Link>

          <Link
            href="/home"
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-blue-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">Chat with Seller</h1>
              <p className="text-slate-500 text-sm">{sellerEmail}</p>
              <p className="text-slate-400 text-xs mt-1">Conversation ID: {conversationId}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 min-h-[420px] flex flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto mb-6">
            {messages.length > 0 ? (
              messages.map((msg, index) => {
                const isMine = msg.sender_email === buyerEmail;

                return (
                  <div
                    key={msg._id || `${msg.sender_email}-${msg.timestamp || index}`}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                        isMine
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`text-xs mt-2 ${
                          isMine ? "text-blue-100" : "text-slate-500"
                        }`}
                      >
                        {msg.sender_email}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">No messages yet</h3>
                  <p className="text-slate-500 mt-2">
                    Start the conversation with the seller.
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 pt-4 flex gap-3">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
            />

            <button
              onClick={handleSendMessage}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2 transition"
            >
              <Send className="w-5 h-5" />
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}