"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { RoomForm } from "@/app/staff/admin/rooms/room-form";
import { toast } from "@/hooks/use-toast";
import { type Room } from "@/lib/validators";

export default function NewRoomPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  // Redirect to login if not authenticated, or to rooms if not admin
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/staff/login");
      } else if (!isAdmin) {
        router.push("/rooms");
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const handleSuccess = (room: Room) => {
    // Invalidate the rooms query to trigger a refetch
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    // Invalidate all availableRooms queries for synchronization
    queryClient.invalidateQueries({ predicate: (query) => 
      query.queryKey[0] === "availableRooms" 
    });

    toast({
      title: "Room Created",
      description: `Room ${room.number} has been added successfully.`,
    });
    router.push("/staff/admin/rooms");
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <RouteGuard requiredRole="admin">
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-100">Add New Room</h1>
            <p className="text-slate-400 mt-2">
              Add a new room to the hotel inventory
            </p>
          </div>

          <RoomForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </div>
    </RouteGuard>
  );
}

