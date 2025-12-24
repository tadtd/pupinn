"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  CreateBookingRequestSchema,
  type CreateBookingRequest,
  type Room,
  type RoomType,
} from "@/lib/validators";
import { apiClient, getErrorMessage } from "@/lib/api-client";

interface AvailableRoom extends Room {
  is_available: boolean;
}

interface BookingFormProps {
  onSuccess: (booking: { reference: string }) => void;
  onCancel?: () => void;
}

export function BookingForm({ onSuccess, onCancel }: BookingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateBookingRequest>({
    resolver: zodResolver(CreateBookingRequestSchema),
    defaultValues: {
      guest_name: "",
      room_id: "",
      check_in_date: today,
      check_out_date: tomorrow,
    },
  });

  const checkInDate = watch("check_in_date");
  const checkOutDate = watch("check_out_date");
  const selectedRoomId = watch("room_id");

  // Fetch available rooms when dates change
  useEffect(() => {
    const fetchAvailableRooms = async () => {
      if (!checkInDate || !checkOutDate) return;

      // Validate dates before fetching
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      if (checkOut <= checkIn) return;

      setRoomsLoading(true);
      try {
        const response = await apiClient.get<AvailableRoom[]>(
          "/rooms/available",
          {
            params: {
              check_in_date: checkInDate,
              check_out_date: checkOutDate,
            },
          }
        );
        setAvailableRooms(response.data);
      } catch (err) {
        console.error("Failed to fetch available rooms:", err);
        setAvailableRooms([]);
      } finally {
        setRoomsLoading(false);
      }
    };

    fetchAvailableRooms();
  }, [checkInDate, checkOutDate]);

  const onSubmit = async (data: CreateBookingRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ reference: string }>(
        "/bookings",
        data
      );
      onSuccess(response.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to create booking");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoomTypeLabel = (type: RoomType) => {
    const labels: Record<RoomType, string> = {
      single: "Single",
      double: "Double",
      suite: "Suite",
    };
    return labels[type];
  };

  const getStatusBadge = (isAvailable: boolean) => {
    return isAvailable ? (
      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
        Available
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-slate-500">
        Unavailable
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-slate-800/80 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100">New Booking</CardTitle>
        <CardDescription className="text-slate-400">
          Create a new reservation for a guest
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          {/* Guest Name */}
          <div className="space-y-2">
            <Label htmlFor="guest_name" className="text-slate-300">
              Guest Name
            </Label>
            <Input
              id="guest_name"
              placeholder="Enter guest's full name"
              className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
              {...register("guest_name")}
            />
            {errors.guest_name && (
              <p className="text-sm text-red-400">
                {errors.guest_name.message}
              </p>
            )}
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_in_date" className="text-slate-300">
                Check-in Date
              </Label>
              <div className="relative">
                <Input
                  id="check_in_date"
                  type="date"
                  min={today}
                  className="pr-10 bg-slate-700/50 border-slate-600 text-slate-100 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  {...register("check_in_date")}
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.check_in_date && (
                <p className="text-sm text-red-400">
                  {errors.check_in_date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_out_date" className="text-slate-300">
                Check-out Date
              </Label>
              <div className="relative">
                <Input
                  id="check_out_date"
                  type="date"
                  min={checkInDate || today}
                  className="pr-10 bg-slate-700/50 border-slate-600 text-slate-100 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  {...register("check_out_date")}
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.check_out_date && (
                <p className="text-sm text-red-400">
                  {errors.check_out_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Room Selection */}
          <div className="space-y-2">
            <Label className="text-slate-300">Select Room</Label>
            {roomsLoading ? (
              <div className="p-4 text-center text-slate-400 bg-slate-700/30 rounded-lg">
                Loading available rooms...
              </div>
            ) : availableRooms.filter(r => r.is_available).length === 0 ? (
              <div className="p-4 text-center text-slate-400 bg-slate-700/30 rounded-lg">
                <p className="mb-2">No rooms available for selected dates</p>
                {availableRooms.some(r => !r.is_available) && (
                  <p className="text-xs text-slate-500">
                    Some rooms are unavailable (Occupied, Dirty, Maintenance, or Cleaning)
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                {availableRooms.map((room) => {
                  // Show actual room status for ALL unavailable rooms (not just occupied/dirty/maintenance)
                  const isUnavailable = !room.is_available;
                  
                  return (
                    <div
                      key={room.id}
                      onClick={() =>
                        room.is_available && setValue("room_id", room.id)
                      }
                      className={`p-4 rounded-lg border transition-all ${
                        selectedRoomId === room.id
                          ? "border-amber-500 bg-amber-500/10"
                          : room.is_available
                            ? "border-slate-600 bg-slate-700/30 hover:border-slate-500 cursor-pointer"
                            : "border-slate-700 bg-slate-800/50 cursor-not-allowed opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-semibold text-slate-100">
                              Room {room.number}
                            </span>
                            <span className="text-slate-400">
                              ({getRoomTypeLabel(room.room_type)})
                            </span>
                            {/* Show actual room status for ALL unavailable rooms */}
                            {isUnavailable && room.status && room.status.toLowerCase() !== "available" && (
                              <Badge variant="outline" className="text-xs border-red-500/30 text-red-400 capitalize">
                                {room.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(room.is_available)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <input type="hidden" {...register("room_id")} />
            {errors.room_id && (
              <p className="text-sm text-red-400">{errors.room_id.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading || !selectedRoomId}
              className="flex-1 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold"
            >
              {isLoading ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
