"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { BookingList, type BookingWithRoom } from "@/components/booking-list";
import {
  BookingFilters,
  type BookingFiltersState,
} from "@/components/booking-filters";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

const defaultFilters: BookingFiltersState = {
  status: "all",
  guestName: "",
  fromDate: "",
  toDate: "",
};

export default function ReceptionistBookingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [filters, setFilters] = useState<BookingFiltersState>(defaultFilters);

  const [checkInDialog, setCheckInDialog] = useState<{
    open: boolean;
    bookingId: string | null;
    isEarly: boolean;
  }>({ open: false, bookingId: null, isEarly: false });
  const [checkOutDialog, setCheckOutDialog] = useState<{
    open: boolean;
    bookingId: string | null;
  }>({ open: false, bookingId: null });
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    bookingId: string | null;
  }>({ open: false, bookingId: null });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/staff/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const {
    data: bookings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bookings", filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.status && filters.status !== "all") {
        params.status = filters.status;
      }
      if (filters.guestName) {
        params.guest_name = filters.guestName;
      }
      if (filters.fromDate) {
        params.from_date = filters.fromDate;
      }
      if (filters.toDate) {
        params.to_date = filters.toDate;
      }
      const response = await apiClient.get<BookingWithRoom[]>("/bookings", {
        params,
      });
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const checkInMutation = useMutation({
    mutationFn: async ({
      bookingId,
      confirmEarly,
    }: {
      bookingId: string;
      confirmEarly: boolean;
    }) => {
      const response = await apiClient.post(`/bookings/${bookingId}/check-in`, {
        confirm_early: confirmEarly,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      // Invalidate all availableRooms queries for synchronization
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "availableRooms" 
      });
      toast({
        title: "Check-in Successful",
        description: "Guest has been checked in.",
      });
      setCheckInDialog({ open: false, bookingId: null, isEarly: false });
    },
    onError: (error: Error) => {
      const message = getErrorMessage(error);
      if (message.includes("Check-in date is")) {
        setCheckInDialog((prev) => ({ ...prev, isEarly: true }));
      } else {
        toast({
          title: "Check-in Failed",
          description: message,
          variant: "destructive",
        });
      }
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.post(`/bookings/${bookingId}/check-out`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      // Invalidate all availableRooms queries for synchronization
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "availableRooms" 
      });
      toast({
        title: "Check-out Successful",
        description: "Guest has been checked out. Room is now available.",
      });
      setCheckOutDialog({ open: false, bookingId: null });
    },
    onError: (error: Error) => {
      const message = getErrorMessage(error);
      if (message.includes("CheckOut")) {
        queryClient.invalidateQueries({ queryKey: ["bookings-rooms"] });
        toast({
          title: "Already Checked Out",
          description: "The guest has already been checked out.",
          className: "bg-blue-500 text-white border-none",
        });
        setCheckOutDialog({ open: false, bookingId: null });
      } else {
        toast({
          title: "Check-out Failed",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.post(`/bookings/${bookingId}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      // Invalidate all availableRooms queries for synchronization
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "availableRooms" 
      });
      toast({
        title: "Booking Cancelled",
        description: "The booking has been cancelled.",
      });
      setCancelDialog({ open: false, bookingId: null });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handleCheckIn = (bookingId: string) => {
    setCheckInDialog({ open: true, bookingId, isEarly: false });
  };

  const handleCheckOut = (bookingId: string) => {
    setCheckOutDialog({ open: true, bookingId });
  };

  const handleCancel = (bookingId: string) => {
    setCancelDialog({ open: true, bookingId });
  };

  const confirmCheckIn = (confirmEarly: boolean = false) => {
    if (checkInDialog.bookingId) {
      checkInMutation.mutate({
        bookingId: checkInDialog.bookingId,
        confirmEarly,
      });
    }
  };

  const confirmCheckOut = () => {
    if (checkOutDialog.bookingId) {
      checkOutMutation.mutate(checkOutDialog.bookingId);
    }
  };

  const confirmCancel = () => {
    if (cancelDialog.bookingId) {
      cancelMutation.mutate(cancelDialog.bookingId);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <RouteGuard requiredRole="receptionist">
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Bookings</h1>
            <p className="text-slate-400 mt-1">Manage guest reservations</p>
          </div>
          <Link href="/staff/receptionist/bookings/new">
            <Button className="bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </Link>
        </div>

        <BookingFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters(defaultFilters)}
        />

        <BookingList
          bookings={bookings || []}
          isLoading={isLoading}
          error={error as Error | null}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          onCancel={handleCancel}
          basePath="/staff/receptionist/bookings"
        />
      </div>

      <Dialog
        open={checkInDialog.open}
        onOpenChange={(open) =>
          setCheckInDialog({ open, bookingId: null, isEarly: false })
        }
      >
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {checkInDialog.isEarly ? "Early Check-in" : "Confirm Check-in"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {checkInDialog.isEarly
                ? "The check-in date for this booking is in the future. Do you want to proceed with early check-in?"
                : "Are you sure you want to check in this guest? The room status will be updated to occupied."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCheckInDialog({
                  open: false,
                  bookingId: null,
                  isEarly: false,
                })
              }
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmCheckIn(checkInDialog.isEarly)}
              disabled={checkInMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {checkInMutation.isPending
                ? "Processing..."
                : checkInDialog.isEarly
                  ? "Confirm Early Check-in"
                  : "Check In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={checkOutDialog.open}
        onOpenChange={(open) => setCheckOutDialog({ open, bookingId: null })}
      >
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              Confirm Check-out
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to check out this guest? The room will be
              marked as available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCheckOutDialog({ open: false, bookingId: null })
              }
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmCheckOut}
              disabled={checkOutMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {checkOutMutation.isPending ? "Processing..." : "Check Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelDialog.open}
        onOpenChange={(open) => setCancelDialog({ open, bookingId: null })}
      >
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Cancel Booking</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to cancel this booking? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialog({ open: false, bookingId: null })}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Keep Booking
            </Button>
            <Button
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RouteGuard>
  );
}

