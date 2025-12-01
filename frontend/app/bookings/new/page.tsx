"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { BookingForm } from "@/components/booking-form";
import { toast } from "@/hooks/use-toast";

export default function NewBookingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const handleSuccess = (booking: { reference: string }) => {
    // Invalidate the bookings query to trigger a refetch
    queryClient.invalidateQueries({ queryKey: ["bookings"] });

    toast({
      title: "Booking Created",
      description: `Booking reference: ${booking.reference}`,
    });
    router.push("/bookings");
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">
            Create New Booking
          </h1>
          <p className="text-slate-400 mt-2">
            Fill in the details below to create a new guest reservation
          </p>
        </div>

        <BookingForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}
