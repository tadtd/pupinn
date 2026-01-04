"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { FinancialReport } from "@/components/admin/financial-report";
import { listRoomsWithFinancials } from "@/lib/api/financial";
import { type RoomFinancialSummary } from "@/lib/validators";

export default function AdminFinancialPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/staff/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const {
    data: financialData,
    isLoading,
    error,
    refetch,
  } = useQuery<RoomFinancialSummary[]>({
    queryKey: ["financial", "rooms", startDate, endDate],
    queryFn: async () => {
      return await listRoomsWithFinancials(startDate, endDate);
    },
    enabled: isAuthenticated,
  });

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
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
    <RouteGuard requiredRole="admin">
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-100">
              Financial Reporting
            </h1>
            <p className="text-slate-400 mt-1">
              View revenue metrics and occupancy rates by room
            </p>
          </div>

          {/* Financial Report */}
          <FinancialReport
            data={financialData || []}
            isLoading={isLoading}
            error={error}
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      </div>
    </RouteGuard>
  );
}

