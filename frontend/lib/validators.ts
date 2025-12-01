import { z } from "zod";

// === Enums ===
export const UserRole = z.enum(["admin", "receptionist"]);
export type UserRole = z.infer<typeof UserRole>;

export const RoomType = z.enum(["single", "double", "suite"]);
export type RoomType = z.infer<typeof RoomType>;

export const RoomStatus = z.enum(["available", "occupied", "maintenance"]);
export type RoomStatus = z.infer<typeof RoomStatus>;

export const BookingStatus = z.enum(["upcoming", "checked_in", "checked_out", "cancelled"]);
export type BookingStatus = z.infer<typeof BookingStatus>;

// === Auth Schemas ===
export const LoginRequestSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string().uuid(),
    username: z.string(),
    role: UserRole,
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const UserInfoSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  role: UserRole,
});
export type UserInfo = z.infer<typeof UserInfoSchema>;

export const CreateUserRequestSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  role: UserRole,
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// === Room Schemas ===
export const RoomSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  room_type: RoomType,
  status: RoomStatus,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Room = z.infer<typeof RoomSchema>;

export const CreateRoomRequestSchema = z.object({
  number: z.string().min(1, "Room number is required").max(10),
  room_type: RoomType,
});
export type CreateRoomRequest = z.infer<typeof CreateRoomRequestSchema>;

export const UpdateRoomRequestSchema = z.object({
  room_type: RoomType.optional(),
  status: RoomStatus.optional(),
});
export type UpdateRoomRequest = z.infer<typeof UpdateRoomRequestSchema>;

export const RoomListResponseSchema = z.object({
  rooms: z.array(RoomSchema),
  total: z.number(),
});
export type RoomListResponse = z.infer<typeof RoomListResponseSchema>;

// === Booking Schemas ===
export const BookingSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  guest_name: z.string(),
  room_id: z.string().uuid(),
  room: RoomSchema.optional(),
  check_in_date: z.string(), // ISO date string YYYY-MM-DD
  check_out_date: z.string(),
  status: BookingStatus,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const CreateBookingRequestSchema = z
  .object({
    guest_name: z.string().min(1, "Guest name is required").max(100),
    room_id: z.string().uuid("Please select a room"),
    check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  })
  .refine(
    (data) => {
      const checkIn = new Date(data.check_in_date);
      const checkOut = new Date(data.check_out_date);
      return checkOut > checkIn;
    },
    {
      message: "Check-out date must be after check-in date",
      path: ["check_out_date"],
    }
  )
  .refine(
    (data) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkIn = new Date(data.check_in_date);
      return checkIn >= today;
    },
    {
      message: "Check-in date cannot be in the past",
      path: ["check_in_date"],
    }
  );
export type CreateBookingRequest = z.infer<typeof CreateBookingRequestSchema>;

export const UpdateBookingRequestSchema = z.object({
  guest_name: z.string().min(1).max(100).optional(),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type UpdateBookingRequest = z.infer<typeof UpdateBookingRequestSchema>;

export const BookingListResponseSchema = z.object({
  bookings: z.array(BookingSchema),
  total: z.number(),
});
export type BookingListResponse = z.infer<typeof BookingListResponseSchema>;

export const CheckInRequestSchema = z.object({
  confirm_early: z.boolean().optional(),
});
export type CheckInRequest = z.infer<typeof CheckInRequestSchema>;

// === Query Params ===
export const BookingFiltersSchema = z.object({
  status: BookingStatus.optional(),
  guest_name: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});
export type BookingFilters = z.infer<typeof BookingFiltersSchema>;

export const RoomFiltersSchema = z.object({
  status: RoomStatus.optional(),
  room_type: RoomType.optional(),
});
export type RoomFilters = z.infer<typeof RoomFiltersSchema>;

export const AvailabilityQuerySchema = z.object({
  check_in_date: z.string(),
  check_out_date: z.string(),
  room_type: RoomType.optional(),
});
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;

