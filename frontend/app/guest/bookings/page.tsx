"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, isBefore } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import type { Room } from "@/lib/validators";
import {
  ArrowLeft,
  Calendar,
  Home,
  Hash,
  CalendarPlus,
  Loader2,
  X,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

// Backend returns flattened structure (booking fields at top level + room)
interface BookingWithRoom {
  id: string;
  reference: string;
  guest_name: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  room: {
    id: string;
    number: string;
    room_type: string;
    status: string;
    price: number | string; // <--- ADDED PRICE FIELD
  } | null;
}

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  checked_in: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  checked_out: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  upcoming: "Upcoming",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
};

// Helper function to get status badge for a booking
const getBookingStatusBadge = (booking: BookingWithRoom) => {
  const status = booking.status.toLowerCase();
  
  // Mapping that keeps it professional for the guest
  const guestConfig: Record<string, { label: string, className: string }> = {
    upcoming: { label: "Upcoming", className: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    checked_in: { label: "Checked In", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    checked_out: { label: "Checked Out", className: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
    cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-400 border-red-500/30" },
    overstay: { label: "Checked In", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" }, // Simple "Checked In" for guests
  };

  const config = guestConfig[status] || guestConfig.upcoming;

  return {
    className: config.className,
    label: config.label,
    showIcon: false, // No warning icons for guests
  };
};

export default function GuestBookingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingWithRoom | null>(
    null
  );

  // Fetch guest's bookings
  const {
    data: bookings = [],
    isLoading,
    error,
  } = useQuery<BookingWithRoom[]>({
    queryKey: ["guestBookings", statusFilter],
    queryFn: async () => {
      const params =
        statusFilter !== "all" ? { status: statusFilter } : undefined;
      const response = await apiClient.get<BookingWithRoom[]>(
        "/guest/bookings",
        { params }
      );
      return response.data;
    },
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.post(`/guest/bookings/${bookingId}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guestBookings"] });
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled successfully.",
      });
      setCancelDialogOpen(false);
      setBookingToCancel(null);
    },
    onError: (error) => {
      toast({
        title: "Cancellation Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleCancelClick = (booking: BookingWithRoom) => {
    // Only allow canceling upcoming bookings
    if (booking.status === "upcoming") {
      setBookingToCancel(booking);
      setCancelDialogOpen(true);
    } else {
      toast({
        title: "Cannot Cancel",
        description: "Only upcoming bookings can be cancelled. Completed bookings cannot be modified.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmCancel = () => {
    if (bookingToCancel) {
      cancelMutation.mutate(bookingToCancel.id);
    }
  };

  // Sort bookings: upcoming first, then by check-in date descending
  const sortedBookings = [...bookings].sort((a, b) => {
    // Upcoming bookings first
    if (a.status === "upcoming" && b.status !== "upcoming")
      return -1;
    if (a.status !== "upcoming" && b.status === "upcoming")
      return 1;

    // Then by check-in date (most recent first)
    return (
      new Date(b.check_in_date).getTime() -
      new Date(a.check_in_date).getTime()
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/guest">
            <Button variant="ghost" size="icon" className="text-slate-400">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">My Bookings</h1>
            <p className="text-slate-400">View and manage your reservations</p>
          </div>
        </div>

        {/* Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-100">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-slate-100">
              All Bookings
            </SelectItem>
            <SelectItem value="upcoming" className="text-slate-100">
              Upcoming
            </SelectItem>
            <SelectItem value="checked_in" className="text-slate-100">
              Checked In
            </SelectItem>
            <SelectItem value="checked_out" className="text-slate-100">
              Checked Out
            </SelectItem>
            <SelectItem value="cancelled" className="text-slate-100">
              Cancelled
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">{getErrorMessage(error)}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && sortedBookings.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">
              No bookings found
            </h3>
            <p className="text-slate-400 mb-6 max-w-sm">
              {statusFilter !== "all"
                ? `You don't have any ${statusLabels[statusFilter]?.toLowerCase()} bookings.`
                : "You haven't made any reservations yet. Book your first room to get started!"}
            </p>
            <Link href="/guest/bookings/new">
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900">
                <CalendarPlus className="h-4 w-4 mr-2" />
                Book a Room
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Bookings List */}
      {!isLoading && !error && sortedBookings.length > 0 && (
        <div className="grid gap-4">
          {sortedBookings.map((item) => (
            <Card
              key={item.id}
              className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Booking Info */}
                  <div className="space-y-3">
                    {/* Reference & Status */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Hash className="h-4 w-4" />
                        <span className="font-mono font-semibold">
                          {item.reference}
                        </span>
                      </div>
                      {(() => {
                        const badgeConfig = getBookingStatusBadge(item);
                        return (
                          <Badge
                            variant="outline"
                            className={badgeConfig.className}
                          >
                            {badgeConfig.showIcon && (
                              <AlertTriangle className="h-3 w-3 mr-1" />
                            )}
                            {badgeConfig.label}
                          </Badge>
                        );
                      })()}
                    </div>

                    {/* Room Info - UPDATED with Price */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Home className="h-4 w-4 text-slate-500" />
                        <span>
                          Room {item.room?.number || "N/A"}
                          {item.room?.room_type && (
                            <span className="text-slate-500 ml-1">
                              ({item.room.room_type})
                            </span>
                          )}
                        </span>
                      </div>
                        {/* Price Display */}
                         {item.room?.price && (
                           <div className="ml-6 text-sm text-emerald-400 font-medium">
                             {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(item.room.price))}
                             <span className="text-slate-500 text-xs ml-1 font-normal">/ night</span>
                           </div>
                         )}
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Check-in:</span>
                        <span className="text-slate-300">
                          {format(
                            new Date(item.check_in_date + "T00:00:00"),
                            "MMM d, yyyy"
                          )}
                        </span>
                      </div>
                      <span className="text-slate-600">→</span>
                      <div>
                        <span>Check-out:</span>
                        <span className="text-slate-300 ml-1">
                          {format(
                            new Date(item.check_out_date + "T00:00:00"),
                            "MMM d, yyyy"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Only allow canceling upcoming bookings (not history) */}
                    {item.status === "upcoming" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleCancelClick(item)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                    {/* Show message for history bookings */}
                    {(item.status === "checked_out" || item.status === "cancelled") && (
                      <span className="text-xs text-slate-500 italic">
                        Cannot cancel completed bookings
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription className="text-slate-400">
              {bookingToCancel?.status === "upcoming" 
                ? "Are you sure you want to cancel this upcoming booking? This action cannot be undone."
                : "Only upcoming bookings can be cancelled. Completed bookings (checked out or cancelled) cannot be modified."}
            </DialogDescription>
          </DialogHeader>

          {bookingToCancel && (
            <Card className="bg-slate-700/50 border-slate-600">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reference</span>
                  <span className="font-mono text-amber-400">
                    {bookingToCancel.reference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Room</span>
                  <span className="text-slate-100">
                    {bookingToCancel.room?.number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Check-in</span>
                  <span className="text-slate-100">
                    {format(
                      new Date(
                        bookingToCancel.check_in_date + "T00:00:00"
                      ),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="border-slate-600 text-slate-100"
            >
              {bookingToCancel?.status === "upcoming" ? "Keep Booking" : "Close"}
            </Button>
            {bookingToCancel?.status === "upcoming" && (
              <Button
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel Booking"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}