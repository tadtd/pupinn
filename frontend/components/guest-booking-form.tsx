"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GuestBookingRequestSchema,
  type GuestBookingRequest,
  type Room,
} from "@/lib/validators";
import { CalendarDays, BedDouble, Check, Loader2 } from "lucide-react";

interface GuestBookingFormProps {
  availableRooms: Room[];
  isLoadingRooms: boolean;
  onSearch: (checkIn: string, checkOut: string) => void;
  onBook: (data: GuestBookingRequest) => Promise<void>;
  isBooking: boolean;
}

export function GuestBookingForm({
  availableRooms,
  isLoadingRooms,
  onSearch,
  onBook,
  isBooking,
}: GuestBookingFormProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Default to tomorrow for check-in and day after for check-out
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const dayAfter = format(addDays(new Date(), 2), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GuestBookingRequest>({
    resolver: zodResolver(GuestBookingRequestSchema),
    defaultValues: {
      check_in_date: tomorrow,
      check_out_date: dayAfter,
      room_id: "",
    },
  });

  const checkInDate = watch("check_in_date");
  const checkOutDate = watch("check_out_date");

  const handleSearch = () => {
    if (checkInDate && checkOutDate) {
      setHasSearched(true);
      setSelectedRoomId(null);
      setValue("room_id", "");
      onSearch(checkInDate, checkOutDate);
    }
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setValue("room_id", roomId);
  };

  const onSubmit = async (data: GuestBookingRequest) => {
    await onBook(data);
  };

  const selectedRoom = availableRooms.find((r) => r.id === selectedRoomId) ?? null;
  const nights = (() => {
    if (!checkInDate || !checkOutDate) return 0;
    const d1 = new Date(checkInDate + "T00:00:00");
    const d2 = new Date(checkOutDate + "T00:00:00");
    const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.round(diff));
  })();

  const pricePerNight = selectedRoom?.price ? parseFloat(String(selectedRoom.price)) : null;
  const totalPrice = pricePerNight != null ? pricePerNight * nights : null;
  const currencyFormat = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

  const getRoomTypeBadgeColor = (roomType: string) => {
    switch (roomType) {
      case "single":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "double":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "suite":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Date Selection */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-amber-400" />
            Select Your Dates
          </CardTitle>
          <CardDescription className="text-slate-400">
            Choose your check-in and check-out dates to see available rooms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_in_date" className="text-slate-300">
                Check-in Date
              </Label>
              <div className="relative">
                <Input
                  id="check_in_date"
                  type="date"
                  min={tomorrow}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 focus:border-amber-500 [color-scheme:dark]"
                  {...register("check_in_date")}
                />
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
                  min={checkInDate || tomorrow}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 focus:border-amber-500 [color-scheme:dark]"
                  {...register("check_out_date")}
                />
              </div>
              {errors.check_out_date && (
                <p className="text-sm text-red-400">
                  {errors.check_out_date.message}
                </p>
              )}
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSearch}
            disabled={!checkInDate || !checkOutDate || isLoadingRooms}
            className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-slate-900"
          >
            {isLoadingRooms ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              "Search Available Rooms"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Room Selection */}
      {hasSearched && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-amber-400" />
              Available Rooms
            </CardTitle>
            <CardDescription className="text-slate-400">
              {availableRooms.length > 0
                ? `${availableRooms.length} room${availableRooms.length > 1 ? "s" : ""} available for your dates`
                : "No rooms available for the selected dates"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRooms ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              </div>
            ) : availableRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleRoomSelect(room.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedRoomId === room.id
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-slate-600 bg-slate-700/30 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-100 text-lg">
                          Room {room.number}
                        </div>
                        <Badge
                          variant="outline"
                          className={`mt-2 capitalize ${getRoomTypeBadgeColor(room.room_type)}`}
                        >
                          {room.room_type}
                        </Badge>
                        {room.price && (
                          <div className="mt-2 text-sm text-emerald-400 font-medium">
                            {currencyFormat.format(Number(room.price))}
                            <span className="text-slate-500 text-xs ml-2">/ night</span>
                          </div>
                        )}
                      </div>
                      {selectedRoomId === room.id && (
                        <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
                          <Check className="h-4 w-4 text-slate-900" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <BedDouble className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No rooms available for the selected dates.</p>
                <p className="text-sm mt-1">Try different dates.</p>
              </div>
            )}

            {errors.room_id && (
              <p className="text-sm text-red-400 mt-4">
                {errors.room_id.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hidden room_id field */}
      <input type="hidden" {...register("room_id")} />

      {/* Booking Summary & Submit */}
      {selectedRoomId && (
        <Card className="bg-linear-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-slate-100">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Check-in:</span>
                <span className="ml-2 text-slate-100">
                  {checkInDate &&
                    format(new Date(checkInDate + "T00:00:00"), "MMMM d, yyyy")}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Check-out:</span>
                <span className="ml-2 text-slate-100">
                  {checkOutDate &&
                    format(new Date(checkOutDate + "T00:00:00"), "MMMM d, yyyy")}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Room:</span>
                <span className="ml-2 text-slate-100">
                  {availableRooms.find((r) => r.id === selectedRoomId)?.number} (
                  {availableRooms.find((r) => r.id === selectedRoomId)
                    ?.room_type}
                  )
                </span>
              </div>
            </div>

            {pricePerNight != null && (
              <div className="text-sm">
                <div>
                  <span className="text-slate-400">Price (per night):</span>
                  <span className="ml-2 text-slate-100">{currencyFormat.format(pricePerNight)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Total ({nights} night{nights !== 1 ? "s" : ""}):</span>
                  <span className="ml-2 text-slate-100">{currencyFormat.format(totalPrice ?? 0)}</span>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isBooking || !selectedRoomId}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {isBooking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Booking...
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </form>
  );
}

