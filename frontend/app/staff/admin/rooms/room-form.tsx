"use client";

import { useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { apiClient, getErrorMessage } from "@/lib/api-client";
import { type RoomType, type RoomStatus, type Room } from "@/lib/validators";

const createRoomSchema = z.object({
  number: z
    .string()
    .min(1, "Room number is required")
    .max(10, "Room number too long"),
  room_type: z.enum(["single", "double", "suite"], {
    required_error: "Please select a room type",
  }),
});

const updateRoomSchema = z.object({
  room_type: z.enum(["single", "double", "suite"]).optional(),
  status: z.enum(["available", "occupied", "maintenance", "dirty", "cleaning"]).optional(),
});

type CreateRoomData = z.infer<typeof createRoomSchema>;
type UpdateRoomData = z.infer<typeof updateRoomSchema>;

interface RoomFormProps {
  room?: Room;
  onSuccess: (room: Room) => void;
  onCancel?: () => void;
}

export function RoomForm({ room, onSuccess, onCancel }: RoomFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = !!room;

  // Use separate forms for create and edit modes
  const createForm = useForm<CreateRoomData>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: { number: "", room_type: undefined },
  });

  const updateForm = useForm<UpdateRoomData>({
    resolver: zodResolver(updateRoomSchema),
    defaultValues: room
      ? { room_type: room.room_type, status: room.status }
      : {},
  });

  const form = isEditMode ? updateForm : createForm;
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form as UseFormReturn<CreateRoomData | UpdateRoomData>;

  const selectedRoomType = watch("room_type");
  const selectedStatus = watch("status");

  const onSubmit = async (data: CreateRoomData | UpdateRoomData) => {
    setIsLoading(true);
    setError(null);

    try {
      let response;
      if (isEditMode) {
        response = await apiClient.patch<Room>(`/rooms/${room.id}`, data);
      } else {
        response = await apiClient.post<Room>("/rooms", data);
      }
      onSuccess(response.data);
    } catch (err: unknown) {
      setError(
        getErrorMessage(err) ||
          `Failed to ${isEditMode ? "update" : "create"} room`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-slate-800/80 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100">
          {isEditMode ? `Edit Room ${room.number}` : "Add New Room"}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {isEditMode
            ? "Update room details and status"
            : "Create a new room in the hotel"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          {/* Room Number (only for create mode) */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="number" className="text-slate-300">
                Room Number
              </Label>
              <Input
                id="number"
                placeholder="e.g., 101, A12"
                className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
                {...register("number")}
              />
              {"number" in errors && (
                <p className="text-sm text-red-400">
                  {errors.number?.message as string}
                </p>
              )}
            </div>
          )}

          {/* Room Type */}
          <div className="space-y-2">
            <Label className="text-slate-300">Room Type</Label>
            <Select
              value={selectedRoomType}
              onValueChange={(value) =>
                setValue("room_type", value as RoomType)
              }
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
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
            {errors.room_type && (
              <p className="text-sm text-red-400">
                {errors.room_type.message as string}
              </p>
            )}
          </div>

          {/* Room Status (only for edit mode) */}
          {isEditMode && (
            <div className="space-y-2">
              <Label className="text-slate-300">Status</Label>
              <Select
                value={selectedStatus as string}
                onValueChange={(value) =>
                  setValue("status", value as RoomStatus)
                }
              >
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem
                    value="available"
                    className="text-slate-100"
                  >
                    Available
                  </SelectItem>
                  <SelectItem
                    value="occupied"
                    className="text-slate-100"
                  >
                    Occupied
                  </SelectItem>
                  <SelectItem
                    value="maintenance"
                    className="text-slate-100"
                  >
                    Maintenance
                  </SelectItem>
                  <SelectItem
                    value="dirty"
                    className="text-slate-100"
                  >
                    Dirty
                  </SelectItem>
                  <SelectItem
                    value="cleaning"
                    className="text-slate-100"
                  >
                    Cleaning
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Note: Status transitions must follow valid business rules. The backend will validate the transition.
              </p>
            </div>
          )}

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
              disabled={isLoading}
              className="flex-1 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold"
            >
              {isLoading
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                  ? "Update Room"
                  : "Create Room"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

