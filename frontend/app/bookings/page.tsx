"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search, Calendar, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/components/auth-provider";
import { apiClient } from "@/lib/api-client";
import { type BookingStatus } from "@/lib/validators";

// The backend uses #[serde(flatten)] so booking fields are at the top level
interface BookingWithRoom {
  id: string;
  reference: string;
  guest_name: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  room: {
    id: string;
    number: string;
    room_type: string;
    status: string;
  } | null;
}

export default function BookingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [guestNameFilter, setGuestNameFilter] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const {
    data: bookings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["bookings", statusFilter, guestNameFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter && statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (guestNameFilter) {
        params.guest_name = guestNameFilter;
      }
      const response = await apiClient.get<BookingWithRoom[]>("/bookings", {
        params,
      });
      return response.data;
    },
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getStatusBadge = (status: BookingStatus) => {
    const variants: Record<
      BookingStatus,
      { className: string; label: string }
    > = {
      upcoming: {
        className: "bg-blue-500 hover:bg-blue-600",
        label: "Upcoming",
      },
      checked_in: {
        className: "bg-emerald-500 hover:bg-emerald-600",
        label: "Checked In",
      },
      checked_out: {
        className: "bg-slate-500 hover:bg-slate-600",
        label: "Checked Out",
      },
      cancelled: {
        className: "bg-red-500 hover:bg-red-600",
        label: "Cancelled",
      },
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Bookings</h1>
            <p className="text-slate-400 mt-1">Manage guest reservations</p>
          </div>
          <Link href="/bookings/new">
            <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-slate-800/80 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by guest name..."
                    value={guestNameFilter}
                    onChange={(e) => setGuestNameFilter(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              </div>
              <div className="w-[180px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-slate-100">
                      All Statuses
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
            </div>
          </CardContent>
        </Card>

        {/* Bookings Table */}
        <Card className="bg-slate-800/80 border-slate-700">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">
                Loading bookings...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-400">
                Failed to load bookings. Please try again.
              </div>
            ) : !bookings || bookings.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No bookings found</p>
                <p className="text-sm mt-1">
                  Create a new booking to get started
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-400">Reference</TableHead>
                    <TableHead className="text-slate-400">Guest</TableHead>
                    <TableHead className="text-slate-400">Room</TableHead>
                    <TableHead className="text-slate-400">Check-in</TableHead>
                    <TableHead className="text-slate-400">Check-out</TableHead>
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
                      <TableCell className="text-slate-100">
                        {booking.room ? `Room ${booking.room.number}` : "-"}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {format(new Date(booking.check_in_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {format(
                          new Date(booking.check_out_date),
                          "MMM d, yyyy"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>
                        <Link href={`/bookings/${booking.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-slate-100"
                          >
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
