"use client";

import { useState } from "react";
import { format } from "date-fns";
import { DollarSign, Calendar, TrendingUp, BarChart3, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { type RoomFinancialSummary } from "@/lib/validators";
import {
  getRevenueTimeSeries,
  getRoomRevenueTimeSeries,
  getRoomBookingHistory,
  type BookingWithRoom,
} from "@/lib/api/financial";

interface FinancialReportProps {
  data: RoomFinancialSummary[];
  isLoading: boolean;
  error: Error | null;
  startDate: string;
  endDate: string;
  usePayments?: boolean;
  onDateRangeChange: (start: string, end: string) => void;
}

export function FinancialReport({
  data,
  isLoading,
  error,
  startDate,
  endDate,
  usePayments,
  onDateRangeChange,
}: FinancialReportProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleApplyDateRange = () => {
    onDateRangeChange(localStartDate, localEndDate);
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Fetch total revenue time-series
  const {
    data: revenueTimeSeries,
    isLoading: isLoadingRevenue,
  } = useQuery({
    queryKey: ["revenue-time-series", startDate, endDate],
    queryFn: () => getRevenueTimeSeries(startDate, endDate),
    enabled: !isLoading && !error,
  });

  // Fetch room-specific data when details dialog is open
  const {
    data: roomRevenueTimeSeries,
    isLoading: isLoadingRoomRevenue,
  } = useQuery({
    queryKey: ["room-revenue-time-series", selectedRoomId, startDate, endDate],
    queryFn: () =>
      getRoomRevenueTimeSeries(selectedRoomId!, startDate, endDate),
    enabled: isDetailsOpen && selectedRoomId !== null,
  });

  const {
    data: roomBookingHistory,
    isLoading: isLoadingBookingHistory,
  } = useQuery({
    queryKey: ["room-booking-history", selectedRoomId, startDate, endDate],
    queryFn: () => getRoomBookingHistory(selectedRoomId!, startDate, endDate),
    enabled: isDetailsOpen && selectedRoomId !== null,
  });

  const handleDetailsClick = (roomId: string) => {
    setSelectedRoomId(roomId);
    setIsDetailsOpen(true);
  };

  const selectedRoom = data.find((item) => item.room.id === selectedRoomId);

  if (isLoading) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-8 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
          Loading financial data...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-8 text-center text-red-400">
          <p>Failed to load financial data. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = data.reduce(
    (sum, item) => sum + parseFloat(item.financials.total_revenue),
    0
  );
  const totalBookings = data.reduce(
    (sum, item) => sum + item.financials.booking_count,
    0
  );
  const avgOccupancy =
    data.length > 0
      ? data.reduce((sum, item) => sum + item.financials.occupancy_rate, 0) /
        data.length
      : 0;

  // Prepare chart data
  const chartData =
    revenueTimeSeries?.data.map((point) => ({
      date: format(new Date(point.date), "MMM dd"),
      revenue: parseFloat(point.revenue),
    })) || [];

  const roomChartData =
    roomRevenueTimeSeries?.data.map((point) => ({
      date: format(new Date(point.date), "MMM dd"),
      revenue: parseFloat(point.revenue),
    })) || [];

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="start-date" className="text-slate-300">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={localStartDate}
                  onChange={(e) => setLocalStartDate(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end-date" className="text-slate-300">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={localEndDate}
                  onChange={(e) => setLocalEndDate(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 mt-1"
                />
              </div>
              <Button
                onClick={handleApplyDateRange}
                className="bg-amber-500 text-slate-900 hover:bg-amber-400"
              >
                Apply Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/80 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-slate-100">
                  {formatCurrency(totalRevenue.toFixed(0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/80 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Bookings</p>
                <p className="text-2xl font-bold text-slate-100">
                  {totalBookings}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/80 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">
                  Average Occupancy
                </p>
                <p className="text-2xl font-bold text-slate-100">
                  {avgOccupancy.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Revenue Line Graph */}
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Total Revenue Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRevenue ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Loading chart data...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No revenue data available for the selected date range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) {
                      return `${(value / 1000000).toFixed(1)}M`;
                    }
                    if (value >= 1000) {
                      return `${(value / 1000).toFixed(0)}K`;
                    }
                    return value.toString();
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                  }}
                  formatter={(value: number | undefined) => 
                    value !== undefined ? formatCurrency(value.toFixed(0)) : ""
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: "#f59e0b", r: 4 }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Room Financials Table */}
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Room Financial Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-800/50">
                <TableHead className="text-slate-300">Room</TableHead>
                <TableHead className="text-slate-300">Type</TableHead>
                <TableHead className="text-slate-300 text-right">
                  Revenue
                </TableHead>
                <TableHead className="text-slate-300 text-right">
                  Bookings
                </TableHead>
                <TableHead className="text-slate-300 text-right">
                  Avg Revenue
                </TableHead>
                <TableHead className="text-slate-300 text-right">
                  Occupancy
                </TableHead>
                <TableHead className="text-slate-300 text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                    No financial data available for the selected date range
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow
                    key={item.room.id}
                    className="border-slate-700 hover:bg-slate-800/50"
                  >
                    <TableCell className="text-slate-100 font-medium">
                      {item.room.number}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-slate-600 hover:bg-slate-600">
                        {item.room.room_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-100 text-right font-semibold">
                      {formatCurrency(item.financials.total_revenue)}
                    </TableCell>
                    <TableCell className="text-slate-300 text-right">
                      {item.financials.booking_count}
                    </TableCell>
                    <TableCell className="text-slate-300 text-right">
                      {item.financials.average_revenue
                        ? formatCurrency(item.financials.average_revenue)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-slate-300 text-right">
                      {item.financials.occupancy_rate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        onClick={() => handleDetailsClick(item.room.id)}
                        size="sm"
                        className="bg-amber-500 text-slate-900 hover:bg-amber-400"
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Room Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              Room Details - {selectedRoom?.room.number}
            </DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {/* Left: Revenue Line Graph */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">
                  Revenue Over Time
                </h3>
                {isLoadingRoomRevenue ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    Loading chart data...
                  </div>
                ) : roomChartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    No revenue data available for this room
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={roomChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        style={{ fontSize: "12px" }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        style={{ fontSize: "12px" }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) {
                            return `${(value / 1000000).toFixed(1)}M`;
                          }
                          if (value >= 1000) {
                            return `${(value / 1000).toFixed(0)}K`;
                          }
                          return value.toString();
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          color: "#f1f5f9",
                        }}
                        formatter={(value: number | undefined) =>
                          value !== undefined ? formatCurrency(value.toFixed(0)) : ""
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ fill: "#f59e0b", r: 4 }}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Right: Booking History Table */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">
                  Booking History
                </h3>
                {isLoadingBookingHistory ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    Loading booking history...
                  </div>
                ) : !roomBookingHistory || roomBookingHistory.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    No booking history available for this room
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Guest</TableHead>
                          <TableHead className="text-slate-300">Check In</TableHead>
                          <TableHead className="text-slate-300">Check Out</TableHead>
                          <TableHead className="text-slate-300 text-right">
                            Revenue
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roomBookingHistory.map((booking) => (
                          <TableRow
                            key={booking.id}
                            className="border-slate-700 hover:bg-slate-800/50"
                          >
                            <TableCell className="text-slate-100">
                              {booking.guest_name}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {format(new Date(booking.check_in_date), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {format(new Date(booking.check_out_date), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="text-slate-100 text-right font-semibold">
                              {formatCurrency(booking.price)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
