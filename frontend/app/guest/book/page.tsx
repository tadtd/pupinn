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
  price?: string;
}

interface BookingResponse {
  booking: GuestBooking;
  room: Room | null;
}

export default function GuestBookPage() {
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
            price: room.price ?? undefined,
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
        <Button variant="ghost" size="icon" asChild>
          <Link href="/guest/bookings">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Bookings</span>
          </Link>
        </Button>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-slate-400" />
          New Booking
        </h1>
      </div>

      <Card>
        <CardContent className="py-6">
          <GuestBookingForm
            isLoadingRooms={isLoadingRooms}
            availableRooms={availableRooms}
            onSearch={handleSearch}
            onBook={handleBook}
            isBooking={bookingMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-6 h-6" /> Booking Confirmed!
            </DialogTitle>
            <DialogDescription>
              Thank you for booking with PupInn.
            </DialogDescription>
          </DialogHeader>
          {bookingResult && (
            <div className="space-y-2 py-2">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span>Room: <b>{bookingResult.room?.number}</b> — {bookingResult.room?.room_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(bookingResult.booking.check_in_date), "PPP")} {"→"} {format(new Date(bookingResult.booking.check_out_date), "PPP")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Copy
                  className="w-4 h-4 cursor-pointer text-muted-foreground hover:text-slate-800"
                  onClick={handleCopyReference}
                  aria-label="Copy booking reference"
                  tabIndex={0}
                />
                <span>
                  Reference: <b className="font-mono">{bookingResult.booking.reference}</b>
                </span>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button onClick={handleCloseConfirmation}>
              View My Bookings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
