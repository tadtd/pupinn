"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Home,
  LogOut,
  LogIn,
  ArrowRight,
  User,
  BedDouble,
  DoorOpen,
  NotebookPen,
  ListChecks,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/components/auth-provider";
import { apiClient } from "@/lib/api-client";
import { type Room, type BookingStatus } from "@/lib/validators";

interface BookingWithRoom {
  id: string;
  reference: string;
  guest_name: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  status: BookingStatus;
  room: {
    id: string;
    number: string;
    room_type: string;
  } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to guest login by default
      router.push("/guest/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch today's arrivals (upcoming bookings with check_in_date = today)
  const { data: todayArrivals, isLoading: arrivalsLoading } = useQuery({
    queryKey: ["bookings", "arrivals", today],
    queryFn: async () => {
      const response = await apiClient.get<BookingWithRoom[]>("/bookings", {
        params: { status: "upcoming", from_date: today, to_date: today },
      });
      return response.data;
    },
    enabled: isAuthenticated,
  });

  // Fetch today's departures (checked_in bookings with check_out_date = today)
  const { data: todayDepartures, isLoading: departuresLoading } = useQuery({
    queryKey: ["bookings", "departures", today],
    queryFn: async () => {
      const response = await apiClient.get<BookingWithRoom[]>("/bookings", {
        params: { status: "checked_in" },
      });
      // Filter to only those checking out today
      return response.data.filter((b) => b.check_out_date === today);
    },
    enabled: isAuthenticated,
  });

  // Fetch all rooms for stats
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await apiClient.get<Room[]>("/rooms");
      return response.data;
    },
    enabled: isAuthenticated,
  });

  // Calculate room stats
  const roomStats = {
    total: rooms?.length || 0,
    available: rooms?.filter((r) => r.status === "available").length || 0,
    occupied: rooms?.filter((r) => r.status === "occupied").length || 0,
    maintenance: rooms?.filter((r) => r.status === "maintenance").length || 0,
  };

  if (isLoading) {
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
    <div className="space-y-8 px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-slate-400 mt-1">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {arrivalsLoading ? "..." : todayArrivals?.length || 0}
                </div>
                <div className="text-sm text-slate-400">
                  Today&apos;s Arrivals
                </div>
              </div>
              <LogIn className="h-8 w-8 text-blue-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-400">
                  {departuresLoading ? "..." : todayDepartures?.length || 0}
                </div>
                <div className="text-sm text-slate-400">
                  Today&apos;s Departures
                </div>
              </div>
              <LogOut className="h-8 w-8 text-amber-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-400">
                  {roomsLoading ? "..." : roomStats.occupied}
                </div>
                <div className="text-sm text-slate-400">Occupied Rooms</div>
              </div>
              <BedDouble className="h-8 w-8 text-red-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-400">
                  {roomsLoading ? "..." : roomStats.available}
                </div>
                <div className="text-sm text-slate-400">Available Rooms</div>
              </div>
              <DoorOpen className="h-8 w-8 text-emerald-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Today's Arrivals */}
        <Card className="bg-slate-800/80 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <LogIn className="h-5 w-5 text-blue-400" />
                Today&apos;s Arrivals
              </CardTitle>
              <CardDescription className="text-slate-400">
                Guests checking in today
              </CardDescription>
            </div>
            <Link href="/bookings?status=upcoming">
              <Button variant="ghost" size="sm" className="text-slate-400">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {arrivalsLoading ? (
              <div className="text-center text-slate-400 py-4">Loading...</div>
            ) : !todayArrivals || todayArrivals.length === 0 ? (
              <div className="text-center text-slate-500 py-4">
                No arrivals scheduled for today
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Guest</TableHead>
                    <TableHead className="text-slate-400">Room</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayArrivals.slice(0, 5).map((booking) => (
                    <TableRow key={booking.id} className="border-slate-700">
                      <TableCell className="text-slate-100">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          {booking.guest_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {booking.room?.number || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500">Upcoming</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Today's Departures */}
        <Card className="bg-slate-800/80 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <LogOut className="h-5 w-5 text-amber-400" />
                Today&apos;s Departures
              </CardTitle>
              <CardDescription className="text-slate-400">
                Guests checking out today
              </CardDescription>
            </div>
            <Link href="/bookings?status=checked_in">
              <Button variant="ghost" size="sm" className="text-slate-400">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {departuresLoading ? (
              <div className="text-center text-slate-400 py-4">Loading...</div>
            ) : !todayDepartures || todayDepartures.length === 0 ? (
              <div className="text-center text-slate-500 py-4">
                No departures scheduled for today
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Guest</TableHead>
                    <TableHead className="text-slate-400">Room</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayDepartures.slice(0, 5).map((booking) => (
                    <TableRow key={booking.id} className="border-slate-700">
                      <TableCell className="text-slate-100">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          {booking.guest_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {booking.room?.number || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500">Checked In</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold text-slate-100 mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {user?.role === "admin" && (
          <>
            <Link href="/staff/admin/bookings/new">
              <Card className="bg-slate-800/80 border-slate-700 hover:border-amber-500/50 transition-colors cursor-pointer group">
                <CardHeader>
                  <div className="w-12 h-12 bg-linear-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <NotebookPen className="h-6 w-6 text-slate-900" />
                  </div>
                  <CardTitle className="text-slate-100">New Booking</CardTitle>
                  <CardDescription className="text-slate-400">
                    Create a new guest reservation
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/staff/admin/bookings">
              <Card className="bg-slate-800/80 border-slate-700 hover:border-blue-500/50 transition-colors cursor-pointer group">
                <CardHeader>
                  <div className="w-12 h-12 bg-linear-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ListChecks className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-slate-100">View Bookings</CardTitle>
                  <CardDescription className="text-slate-400">
                    Manage existing reservations
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/staff/admin/rooms">
              <Card className="bg-slate-800/80 border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer group">
                <CardHeader>
                  <div className="w-12 h-12 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Home className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-slate-100">Room Management</CardTitle>
                  <CardDescription className="text-slate-400">
                    View and manage room inventory
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </>
        )}
        {user?.role === "receptionist" && (
          <>
            <Link href="/staff/receptionist/bookings/new">
              <Card className="bg-slate-800/80 border-slate-700 hover:border-amber-500/50 transition-colors cursor-pointer group">
                <CardHeader>
                  <div className="w-12 h-12 bg-linear-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <NotebookPen className="h-6 w-6 text-slate-900" />
                  </div>
                  <CardTitle className="text-slate-100">New Booking</CardTitle>
                  <CardDescription className="text-slate-400">
                    Create a new guest reservation
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/staff/receptionist/bookings">
              <Card className="bg-slate-800/80 border-slate-700 hover:border-blue-500/50 transition-colors cursor-pointer group">
                <CardHeader>
                  <div className="w-12 h-12 bg-linear-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ListChecks className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-slate-100">View Bookings</CardTitle>
                  <CardDescription className="text-slate-400">
                    Manage existing reservations
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
