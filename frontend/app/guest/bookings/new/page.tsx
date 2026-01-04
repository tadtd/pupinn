"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GuestBookingForm } from "@/components/guest-booking-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import type { Room, GuestBookingRequest, GuestBooking } from "@/lib/validators";
import { ArrowLeft, CheckCircle, Calendar, Home, Copy } from "lucide-react";
import { format } from "date-fns";

interface AvailableRoomsResponse {
  id: string;
  number: string;
  room_type: string;
  status: string;
  is_available: boolean;
}

interface BookingResponse {
  booking: GuestBooking;
  room: Room | null;
}

export default function GuestNewBookingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useState<{
    checkIn: string;
    checkOut: string;
  } | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResponse | null>(
    null
  );
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fetch available rooms
  const { data: availableRooms = [], isLoading: isLoadingRooms } =
    useQuery<Room[]>({
      queryKey: ["availableRooms", searchParams],
      queryFn: async () => {
        if (!searchParams) return [];
        const response = await apiClient.get<AvailableRoomsResponse[]>(
          "/rooms/available",
          {
            params: {
              check_in_date: searchParams.checkIn,
              check_out_date: searchParams.checkOut,
            },
          }
        );
        // Filter only available rooms and map to Room type (include price)
        return response.data
          .filter((room) => room.is_available)
          .map((room) => ({
            id: room.id,
            number: room.number,
            room_type: room.room_type as "single" | "double" | "suite",
            status: room.status as "available" | "occupied" | "maintenance",
            price: (room as any).price ?? undefined,
            created_at: "",
            updated_at: "",
          }));
      },
      enabled: !!searchParams,
    });

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (data: GuestBookingRequest) => {
      const response = await apiClient.post<BookingResponse>(
        "/guest/bookings",
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      setBookingResult(data);
      setShowConfirmation(true);
      queryClient.invalidateQueries({ queryKey: ["guestBookings"] });
      toast({
        title: "Booking Created!",
        description: `Your booking reference is ${data.booking?.reference || "confirmed"}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleSearch = (checkIn: string, checkOut: string) => {
    setSearchParams({ checkIn, checkOut });
  };

  const handleBook = async (data: GuestBookingRequest) => {
    await bookingMutation.mutateAsync(data);
  };

  const handleCopyReference = () => {
    if (bookingResult?.booking?.reference) {
      navigator.clipboard.writeText(bookingResult.booking.reference);
      toast({
        title: "Copied!",
        description: "Booking reference copied to clipboard",
      });
    }
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    router.push("/guest/bookings");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/guest">
          <Button variant="ghost" size="icon" className="text-slate-400">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Book a Room</h1>
          <p className="text-slate-400">
            Search available rooms and make a reservation
          </p>
        </div>
      </div>

      {/* Booking Form */}
      <GuestBookingForm
        availableRooms={availableRooms}
        isLoadingRooms={isLoadingRooms}
        onSearch={handleSearch}
        onBook={handleBook}
        isBooking={bookingMutation.isPending}
      />

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <DialogTitle className="text-xl text-center">
              Booking Confirmed!
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-center">
              Your reservation has been successfully created.
            </DialogDescription>
          </DialogHeader>

          {bookingResult?.booking && (
            <Card className="bg-slate-700/50 border-slate-600 mt-4">
              <CardContent className="pt-6 space-y-4">
                {/* Reference */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Reference</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400 text-lg">
                      {bookingResult.booking.reference}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-slate-100"
                      onClick={handleCopyReference}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Room */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Room</span>
                  <span className="text-slate-100">
                    <Home className="h-4 w-4 inline mr-1 text-slate-400" />
                    {bookingResult.room?.number} ({bookingResult.room?.room_type}
                    )
                  </span>
                </div>

                {/* Dates */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Check-in</span>
                  <span className="text-slate-100">
                    <Calendar className="h-4 w-4 inline mr-1 text-slate-400" />
                    {format(
                      new Date(bookingResult.booking.check_in_date + "T00:00:00"),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Check-out</span>
                  <span className="text-slate-100">
                    <Calendar className="h-4 w-4 inline mr-1 text-slate-400" />
                    {format(
                      new Date(bookingResult.booking.check_out_date + "T00:00:00"),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm capitalize">
                    {bookingResult.booking.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-slate-600 text-slate-100 hover:bg-slate-700"
              onClick={() => {
                setShowConfirmation(false);
                setSearchParams(null);
                setBookingResult(null);
              }}
            >
              Book Another
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900"
              onClick={handleCloseConfirmation}
            >
              View My Bookings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

