"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Send, Image as ImageIcon, MessageCircle, Loader2, Check, X, Calendar } from "lucide-react";
import { format } from "date-fns";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  unread_count: number;
}

interface ChatInterfaceProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
  token: string;
}

interface BookingProposal {
  room_id: string;
  room_number: string;
  room_type: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  price_per_night: string;
  total_price: string;
}

export function ChatInterface({ currentUser, token }: ChatInterfaceProps) {
  const router = useRouter();
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [bookingStatuses, setBookingStatuses] = useState<Map<string, 'booked' | 'cancelled'>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch contacts
  const { data: contacts = [], refetch: refetchContacts } = useQuery<Contact[]>({
    queryKey: ["chat", "contacts", currentUser.id],
    queryFn: async () => {
      const response = await apiClient.get<Contact[]>("/chat/contacts");
      return response.data;
    },
    enabled: !!currentUser.id,
  });

  // Fetch user's bookings to check if proposals have been booked
  const { data: userBookings = [], refetch: refetchBookings } = useQuery<any[]>({
    queryKey: ["guest", "bookings", currentUser.id],
    queryFn: async () => {
      try {
        const response = await apiClient.get<any[]>("/guest/bookings");
        return response.data;
      } catch (error) {
        // If user is not a guest or endpoint doesn't exist, return empty array
        console.log("Could not fetch bookings:", error);
        return [];
      }
    },
    enabled: !!currentUser.id && currentUser.role === "guest",
  });

  // Fetch message history when active contact changes
  const { data: historyMessages = [] } = useQuery<Message[]>({
    queryKey: ["chat", "history", activeContact?.id],
    queryFn: async () => {
      if (!activeContact) return [];
      const response = await apiClient.get<Message[]>("/chat/history", {
        params: { other_user_id: activeContact.id },
      });
      return response.data;
    },
    enabled: !!activeContact && !!currentUser.id,
  });

  // Clear messages when switching contacts and refetch contacts to update unread counts
  useEffect(() => {
    setMessages([]);
    if (activeContact) {
      // Refetch contacts after a short delay to allow backend to mark messages as read
      setTimeout(() => {
        refetchContacts();
      }, 300);
    }
  }, [activeContact?.id, refetchContacts]);

  // Update messages when history changes
  useEffect(() => {
    setMessages(historyMessages);
  }, [historyMessages]);

  // WebSocket connection
  useEffect(() => {
    if (!currentUser.id || !token) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
    const socket = new WebSocket(
      `${wsUrl}/api/chat/ws?token=${encodeURIComponent(token)}`
    );

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as Message;
        // Only append if it belongs to current active conversation
        if (
          activeContact &&
          (msg.sender_id === activeContact.id || msg.receiver_id === activeContact.id)
        ) {
          setMessages((prev) => {
            // Check if message already exists
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Refetch contacts to update unread counts
          refetchContacts();
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [currentUser.id, activeContact, refetchContacts, token]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeContact]);

  // Image Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiClient.post<{ url: string }>("/chat/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const imageUrl = res.data.url;
      sendMessage(imageUrl);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = (imageUrl?: string) => {
    if (
      (!inputText.trim() && !imageUrl) ||
      !activeContact ||
      !ws ||
      ws.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      const payload = {
        receiver_id: activeContact.id,
        content: imageUrl ? "Sent an image" : inputText,
        image_url: imageUrl || null,
      };
      ws.send(JSON.stringify(payload));

      // Optimistic Update
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender_id: currentUser.id || "",
          receiver_id: activeContact.id,
          content: payload.content,
          image_url: payload.image_url || undefined,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);

      if (!imageUrl) setInputText("");
    }
  };

  // Parse booking proposal from message content
  const parseBookingProposal = (content: string): BookingProposal | null => {
    if (content.startsWith("BOOKING_PROPOSAL:")) {
      try {
        const jsonStr = content.substring("BOOKING_PROPOSAL:".length);
        return JSON.parse(jsonStr) as BookingProposal;
      } catch (e) {
        console.error("Failed to parse booking proposal:", e);
        return null;
      }
    }
    return null;
  };

  // Handle booking confirmation
  const handleBookRoom = async (proposal: BookingProposal) => {
    const bookingKey = `${proposal.room_id}-${proposal.check_in_date}-${proposal.check_out_date}`;
    setIsBooking(true);
    try {
      await apiClient.post("/guest/bookings", {
        room_id: proposal.room_id,
        check_in_date: proposal.check_in_date,
        check_out_date: proposal.check_out_date,
      });

      // Update booking status
      setBookingStatuses(prev => new Map(prev).set(bookingKey, 'booked'));
      
      // Refetch bookings to update the list
      refetchBookings();

      // Send success message
      if (ws && ws.readyState === WebSocket.OPEN && activeContact) {
        ws.send(JSON.stringify({
          receiver_id: activeContact.id,
          content: "I've confirmed the booking!",
          image_url: null,
        }));
      }

      // Show success notification
      toast({
        variant: "default",
        title: "Success",
        description: "Booking confirmed successfully! Redirecting to your bookings...",
      });
      setTimeout(() => {
        router.push("/guest/bookings");
      }, 1500);
    } catch (error) {
      console.error("Booking failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create booking. Please try again.",
      });
    } finally {
      setIsBooking(false);
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = (proposal: BookingProposal) => {
    const bookingKey = `${proposal.room_id}-${proposal.check_in_date}-${proposal.check_out_date}`;
    
    // Update booking status
    setBookingStatuses(prev => new Map(prev).set(bookingKey, 'cancelled'));
    
    if (ws && ws.readyState === WebSocket.OPEN && activeContact) {
      ws.send(JSON.stringify({
        receiver_id: activeContact.id,
        content: "I'd like to cancel this booking proposal. Can you suggest other options?",
        image_url: null,
      }));
    }
  };

  // Render booking proposal card
  const renderBookingCard = (proposal: BookingProposal) => {
    const bookingKey = `${proposal.room_id}-${proposal.check_in_date}-${proposal.check_out_date}`;
    
    // Check local state first (for immediate feedback)
    let bookingStatus = bookingStatuses.get(bookingKey);
    
    // If not in local state, check if booking exists in user's actual bookings
    if (!bookingStatus && userBookings.length > 0) {
      const existingBooking = userBookings.find((booking: any) => 
        booking.room_id === proposal.room_id &&
        booking.check_in_date === proposal.check_in_date &&
        booking.check_out_date === proposal.check_out_date
      );
      
      if (existingBooking) {
        // Check if the booking is cancelled or active
        if (existingBooking.status === 'cancelled') {
          bookingStatus = 'cancelled';
        } else {
          bookingStatus = 'booked';
        }
      }
    }

    return (
      <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-2xl p-4 max-w-md">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <h4 className="font-semibold text-amber-50">Booking Proposal</h4>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Room:</span>
            <span className="text-slate-200 font-medium">
              {proposal.room_number} ({proposal.room_type})
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Check-in:</span>
            <span className="text-slate-200">{proposal.check_in_date}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Check-out:</span>
            <span className="text-slate-200">{proposal.check_out_date}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Nights:</span>
            <span className="text-slate-200">{proposal.nights}</span>
          </div>
          <div className="border-t border-amber-500/20 pt-2 mt-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-amber-300">Total Price:</span>
              <span className="text-amber-200">{proposal.total_price} VND</span>
            </div>
          </div>
        </div>

        {bookingStatus ? (
          <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl ${
            bookingStatus === 'booked' 
              ? 'bg-green-500/20 border border-green-500/30' 
              : 'bg-slate-700/50 border border-slate-600/50'
          }`}>
            {bookingStatus === 'booked' ? (
              <>
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-green-300 font-medium">Booking Successful</span>
              </>
            ) : (
              <>
                <X className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300 font-medium">Booking Cancelled</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => handleBookRoom(proposal)}
              disabled={isBooking}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {isBooking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Book Now
                </>
              )}
            </Button>
            <Button
              onClick={() => handleCancelBooking(proposal)}
              disabled={isBooking}
              variant="outline"
              className="flex-1 border-slate-600 hover:bg-slate-800 text-slate-300"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-linear-to-br from-slate-950 via-slate-900 to-slate-950/90 text-slate-100">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {activeContact ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center px-6 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-300 font-medium">
                  {activeContact.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-lg leading-none text-white">
                    {activeContact.name}
                  </h3>
                  <span className="text-xs text-slate-400 capitalize">
                    {activeContact.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Feed */}
            <div
              className="flex-1 overflow-y-auto p-4 scroll-smooth"
              ref={scrollRef}
            >
              <div className="flex flex-col gap-4 max-w-5xl mx-auto pb-4 pt-4">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser.id;
                  const bookingProposal = !isMe ? parseBookingProposal(msg.content) : null;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-1
                        ${
                          isMe
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-slate-800 text-slate-300"
                        }
                      `}
                      >
                        {isMe ? "Me" : activeContact.name[0].toUpperCase()}
                      </div>

                      <div
                        className={`flex flex-col gap-1 max-w-[70%] ${
                          isMe ? "items-end" : "items-start"
                        }`}
                      >
                        {/* Booking Card or Regular Message */}
                        {bookingProposal ? (
                          renderBookingCard(bookingProposal)
                        ) : (
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                            ${
                              isMe
                                ? "bg-amber-500/20 text-amber-50 border border-amber-500/30 rounded-tr-sm"
                                : "bg-slate-800/80 border border-white/10 text-slate-100 rounded-tl-sm"
                            }
                          `}
                          >
                            {msg.image_url && (
                              <img
                                src={msg.image_url}
                                alt="attachment"
                                className="mb-2 rounded-lg max-h-60 object-cover border border-white/10"
                              />
                            )}
                            <p>{msg.content}</p>
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500 px-1">
                          {format(new Date(msg.created_at), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 md:pb-6 w-full border-t border-white/10 bg-slate-950/80">
              <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-slate-900/50 p-2 rounded-[24px] border border-white/10 focus-within:border-amber-500/30 transition-all">
                {/* Image Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full h-9 w-9 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 shrink-0"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </Button>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Message..."
                  className="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-2 max-h-32 min-h-[40px] text-sm text-slate-100 placeholder:text-slate-500 outline-none"
                  rows={1}
                />

                <Button
                  onClick={() => sendMessage()}
                  disabled={!inputText.trim()}
                  size="icon"
                  className={`rounded-full h-9 w-9 shrink-0 transition-all ${
                    inputText.trim()
                      ? "bg-amber-500 text-slate-900 hover:bg-amber-400"
                      : "bg-transparent text-slate-600 hover:bg-transparent cursor-default"
                  }`}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-900/50 flex items-center justify-center border border-white/10">
              <MessageCircle className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-slate-400">Select a contact to start chatting</p>
          </div>
        )}
      </div>

      {/* Sidebar - Contacts on Right */}
      <div className="w-80 border-l border-white/10 p-4 flex flex-col gap-2 bg-slate-950/50">
        <h2 className="font-semibold text-lg mb-4 px-2 text-slate-100">Chats</h2>
        <div className="flex flex-col gap-2">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setActiveContact(contact)}
              className={`p-3 rounded-xl flex items-center gap-3 transition-all text-left group
                ${
                  activeContact?.id === contact.id
                    ? "bg-amber-500/20 border border-amber-500/30 text-amber-50"
                    : "hover:bg-slate-800/50 border border-transparent text-slate-300"
                }
              `}
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shadow-sm
                ${
                  activeContact?.id === contact.id
                    ? "bg-amber-500/30"
                    : "bg-slate-800"
                }
              `}
              >
                {contact.name[0].toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden min-w-0">
                <p className="font-medium truncate text-sm">{contact.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-slate-400 capitalize">{contact.role}</p>
                  {contact.unread_count > 0 && (
                    <span className="bg-amber-500 text-slate-900 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {contact.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        {contacts.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-8">
            No contacts available
          </div>
        )}
      </div>
    </div>
  );
}
