"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { CleanerDashboard } from "@/components/cleaner-dashboard";
import { getCleanerRooms, updateRoomStatus, getErrorMessage } from "@/lib/api-client";
import { type Room, type RoomStatus } from "@/lib/validators";
import { UserRole } from "@/lib/validators";

export default function CleanerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

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
    queryKey: ["cleaner-rooms"],
    queryFn: async () => {
      // FIX: Fetch ALL statuses to get a complete view of the hotel
      const [dirty, cleaning, available, occupied, maintenance] = await Promise.all([
        getCleanerRooms("dirty"),
        getCleanerRooms("cleaning"),
        getCleanerRooms("available"),
        getCleanerRooms("occupied"),
        getCleanerRooms("maintenance"),
      ]);

      const allRooms = [
        ...dirty, 
        ...cleaning, 
        ...available, 
        ...occupied, 
        ...maintenance
      ];

      // Sort rooms by room number (e.g., 101, 102, 201) so the view is organized
      return allRooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    },
    enabled: isAuthenticated && user?.role === UserRole.enum.cleaner,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ roomId, status }: { roomId: string; status: RoomStatus }) =>
      updateRoomStatus(roomId, status),
    onSuccess: () => {
      // Refetch rooms after successful update and sync all room queries
      queryClient.invalidateQueries({ queryKey: ["cleaner-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      // Invalidate all availableRooms queries regardless of parameters
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "availableRooms" 
      });
    },
  });

  const handleStatusUpdate = (roomId: string, status: RoomStatus) => {
    updateStatusMutation.mutate({ roomId, status });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== UserRole.enum.cleaner) {
    return null;
  }

  return (
    <RouteGuard requiredRole={UserRole.enum.cleaner}>
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-100">Cleaner Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Overview of all rooms and their current status
            </p>
          </div>

          <CleanerDashboard
            rooms={rooms || []}
            isLoading={isLoading}
            error={error ? new Error(getErrorMessage(error)) : null}
            onStatusUpdate={handleStatusUpdate}
            isUpdating={updateStatusMutation.isPending}
          />
        </div>
      </div>
    </RouteGuard>
  );
}