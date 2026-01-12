"use client";

import { format, startOfDay, isBefore, parseISO } from "date-fns";
import { Calendar, User, LogIn, LogOut, X, AlertTriangle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { type BookingStatus } from "@/lib/validators";

export interface BookingWithRoom {
  id: string;
  reference: string;
  guest_name: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  creation_source?: string;
  created_by_user_id?: string | null;
  room: {
    id: string;
    number: string;
    room_type: string;
    status: string;
    price: string | number; // Ensure this matches your backend response
  } | null;
}

interface BookingListProps {
  bookings: BookingWithRoom[];
  isLoading: boolean;
  error: Error | null;
  onCheckIn?: (bookingId: string) => void;
  onCheckOut?: (bookingId: string) => void;
  onCancel?: (bookingId: string) => void;
  basePath?: string;
}

// --- NEW COMPONENT: Handles Dynamic Staff Alerts ---
const StaffStatusBadge = ({ booking }: { booking: BookingWithRoom }) => {
  const today = startOfDay(new Date());
  const checkInDate = startOfDay(parseISO(booking.check_in_date));
  const checkOutDate = startOfDay(parseISO(booking.check_out_date));
  
  // 1. Alert: Overstay 
  if (booking.status === "checked_in" && isBefore(checkOutDate, today)) {
    return (
      <Badge variant="destructive" className="bg-red-600 animate-pulse flex items-center gap-1 w-fit">
        <AlertTriangle className="h-3 w-3" />
        Overstay
      </Badge>
    );
  }

  // 2. Normal Status Mapping
  const variants: Record<string, { className: string; label: string }> = {
    upcoming: { className: "bg-blue-500 hover:bg-blue-600", label: "Upcoming" },
    checked_in: { className: "bg-emerald-500 hover:bg-emerald-600", label: "Checked In" },
    checked_out: { className: "bg-slate-500 hover:bg-slate-600", label: "Checked Out" },
    cancelled: { className: "bg-red-500 hover:bg-red-600", label: "Cancelled" },
    overstay: { className: "bg-red-600 hover:bg-red-700 animate-pulse", label: "Overstay" },
  };

  const variant = variants[booking.status] || { className: "bg-slate-500", label: booking.status };
  
  return <Badge className={`${variant.className} text-white`}>{variant.label}</Badge>;
};
// -------------------------------------------------

export function BookingList({
  bookings,
  isLoading,
  error,
  onCheckIn,
  onCheckOut,
  onCancel,
  basePath = "/bookings",
}: BookingListProps) {

  const currencyFormat = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

  if (isLoading) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-8 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
          Loading bookings...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-8 text-center text-red-400">
          Failed to load bookings. Please try again.
        </CardContent>
      </Card>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-8 text-center text-slate-400">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No bookings found</p>
          <p className="text-sm mt-1">
            Create a new booking or adjust your filters
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-slate-700/50">
              <TableHead className="text-slate-400">Reference</TableHead>
              <TableHead className="text-slate-400">Guest</TableHead>
              <TableHead className="text-slate-400">Room</TableHead>
              <TableHead className="text-slate-400">Check-in</TableHead>
              <TableHead className="text-slate-400">Check-out</TableHead>
              <TableHead className="text-slate-400">Source</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow
                key={booking.id}
                className="border-slate-700 hover:bg-slate-700/30"
              >
                <TableCell className="font-mono text-amber-400">
                  {booking.reference}
                </TableCell>
                <TableCell className="text-slate-100">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    {booking.guest_name}
                  </div>
                </TableCell>
                {/* --- UPDATED: Room Cell with Price --- */}
                <TableCell className="text-slate-100">
                  {booking.room ? (
                    <div className="flex flex-col">
                      <span className="font-medium">Room {booking.room.number}</span>
                      <span className="text-xs text-slate-400">
                        {currencyFormat.format(Number(booking.room.price))} <span className="opacity-50">/night</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                </TableCell>
                {/* ------------------------------------ */}
                <TableCell className="text-slate-300">
                  {format(new Date(booking.check_in_date), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-slate-300">
                  {format(new Date(booking.check_out_date), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      booking.creation_source === "guest"
                        ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        : "border-blue-500/30 text-blue-400 bg-blue-500/10"
                    }
                  >
                    {booking.creation_source === "guest" ? "Guest" : "Staff"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StaffStatusBadge booking={booking} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link href={`${basePath}/${booking.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-100"
                      >
                        View
                      </Button>
                    </Link>
                    {booking.status === "upcoming" && onCheckIn && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCheckIn(booking.id)}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                      >
                        <LogIn className="h-4 w-4 mr-1" />
                        Check In
                      </Button>
                    )}
                    {(booking.status === "checked_in" || booking.status === "overstay" as BookingStatus) && onCheckOut && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCheckOut(booking.id)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        <LogOut className="h-4 w-4 mr-1" />
                        Check Out
                      </Button>
                    )}
                    {booking.status === "upcoming" && onCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(booking.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}