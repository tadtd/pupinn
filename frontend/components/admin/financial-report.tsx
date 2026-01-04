"use client";

import { useState } from "react";
import { format } from "date-fns";
import { DollarSign, Calendar, TrendingUp, BarChart3 } from "lucide-react";

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

import { type RoomFinancialSummary } from "@/lib/validators";

interface FinancialReportProps {
  data: RoomFinancialSummary[];
  isLoading: boolean;
  error: Error | null;
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
}

export function FinancialReport({
  data,
  isLoading,
  error,
  startDate,
  endDate,
  onDateRangeChange,
}: FinancialReportProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

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

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/80 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Revenue</p>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

