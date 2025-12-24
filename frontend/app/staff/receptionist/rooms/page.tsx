"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { RoomList } from "@/components/room-list";
import { apiClient } from "@/lib/api-client";
import { type Room } from "@/lib/validators";

export default function ReceptionistRoomsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/staff/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const {
    data: rooms,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["rooms", "receptionist", statusFilter, typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter && statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (typeFilter && typeFilter !== "all") {
        params.room_type = typeFilter;
      }
      const response = await apiClient.get<Room[]>("/rooms", { params });
      return response.data;
    },
    enabled: isAuthenticated,
  });

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

  // Calculate room stats
  const stats = {
    total: rooms?.length || 0,
    available: rooms?.filter((r) => r.status === "available").length || 0,
    occupied: rooms?.filter((r) => r.status === "occupied").length || 0,
    maintenance: rooms?.filter((r) => r.status === "maintenance").length || 0,
  };

  return (
    <RouteGuard requiredRole="receptionist">
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Rooms</h1>
              <p className="text-slate-400 mt-1">
                View current room status and availability
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-slate-100">
                  {stats.total}
                </div>
                <div className="text-sm text-slate-400">Total Rooms</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-emerald-400">
                  {stats.available}
                </div>
                <div className="text-sm text-slate-400">Available</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-400">
                  {stats.occupied}
                </div>
                <div className="text-sm text-slate-400">Occupied</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-400">
                  {stats.maintenance}
                </div>
                <div className="text-sm text-slate-400">Maintenance</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 bg-slate-800/80 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="w-[180px]">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all" className="text-slate-100">
                        All Statuses
                      </SelectItem>
                      <SelectItem value="available" className="text-slate-100">
                        Available
                      </SelectItem>
                      <SelectItem value="occupied" className="text-slate-100">
                        Occupied
                      </SelectItem>
                      <SelectItem value="maintenance" className="text-slate-100">
                        Maintenance
                      </SelectItem>
                      <SelectItem value="dirty" className="text-slate-100">
                        Dirty
                      </SelectItem>
                      <SelectItem value="cleaning" className="text-slate-100">
                        Cleaning
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[180px]">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all" className="text-slate-100">
                        All Types
                      </SelectItem>
                      <SelectItem value="single" className="text-slate-100">
                        Single
                      </SelectItem>
                      <SelectItem value="double" className="text-slate-100">
                        Double
                      </SelectItem>
                      <SelectItem value="suite" className="text-slate-100">
                        Suite
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room List (read-only for receptionist) */}
          <RoomList
            rooms={rooms || []}
            isLoading={isLoading}
            error={error as Error | null}
            onRoomUpdated={() => {
              // Receptionist has no edit actions, so this is effectively a no-op.
            }}
            isAdmin={false}
          />
        </div>
      </div>
    </RouteGuard>
  );
}


