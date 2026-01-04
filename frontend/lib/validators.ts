import { z } from "zod";

// === Enums ===
export const UserRole = z.enum(["admin", "receptionist", "guest", "cleaner"]);
export type UserRole = z.infer<typeof UserRole>;

export const RoomType = z.enum(["single", "double", "suite"]);
export type RoomType = z.infer<typeof RoomType>;

export const RoomStatus = z.enum(["available", "occupied", "maintenance", "dirty", "cleaning"]);
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
    username: z.string().nullable().optional(),
    role: UserRole,
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const UserInfoSchema = z.object({
  id: z.string().uuid(),
  username: z.string().nullable().optional(),
  role: UserRole,
});
export type UserInfo = z.infer<typeof UserInfoSchema>;

export const CreateUserRequestSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  role: UserRole,
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// === Guest Auth Schemas ===
export const GuestUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string(),
  role: z.literal("guest"),
});
export type GuestUser = z.infer<typeof GuestUserSchema>;

export const GuestRegisterRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  full_name: z.string().min(1, "Full name is required").max(100),
});
export type GuestRegisterRequest = z.infer<typeof GuestRegisterRequestSchema>;

export const GuestLoginRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type GuestLoginRequest = z.infer<typeof GuestLoginRequestSchema>;

export const GuestAuthResponseSchema = z.object({
  token: z.string(),
  user: GuestUserSchema,
});
export type GuestAuthResponse = z.infer<typeof GuestAuthResponseSchema>;

// === Room Schemas ===
export const RoomSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  room_type: RoomType,
  status: RoomStatus,
  price: z.union([z.string(), z.number()]).optional(),
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
  created_by_user_id: z.string().uuid().nullable().optional(),
  creation_source: z.string().optional(),
});
export type Booking = z.infer<typeof BookingSchema>;

// Guest-specific booking schema for API responses
export const GuestBookingSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  guest_name: z.string(),
  room: z.object({
    id: z.string().uuid(),
    number: z.string(),
    room_type: RoomType,
  }),
  check_in_date: z.string(),
  check_out_date: z.string(),
  status: BookingStatus,
  created_at: z.string().datetime(),
});
export type GuestBooking = z.infer<typeof GuestBookingSchema>;

// Guest booking creation request
export const GuestBookingRequestSchema = z.object({
  room_id: z.string().uuid("Please select a room"),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
}).refine(
  (data) => {
    const checkIn = new Date(data.check_in_date);
    const checkOut = new Date(data.check_out_date);
    return checkOut > checkIn;
  },
  {
    message: "Check-out date must be after check-in date",
    path: ["check_out_date"],
  }
).refine(
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
export type GuestBookingRequest = z.infer<typeof GuestBookingRequestSchema>;

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

// === Employee Schemas ===
export const EmployeeSchema = z.object({
  id: z.string().uuid(),
  username: z.string().nullable().optional(),
  role: UserRole,
  email: z.string().email().nullable().optional(),
  full_name: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  deactivated_at: z.string().datetime().nullable().optional(),
});
export type Employee = z.infer<typeof EmployeeSchema>;

export const EmployeeListResponseSchema = z.object({
  employees: z.array(EmployeeSchema),
  total: z.number(),
  page: z.number(),
  per_page: z.number(),
});
export type EmployeeListResponse = z.infer<typeof EmployeeListResponseSchema>;

export const CreateEmployeeRequestSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: UserRole.refine((role) => role !== "guest", {
    message: "Cannot create guest accounts through employee management",
  }),
  email: z.string().email("Invalid email format").optional().nullable(),
  full_name: z.string().max(100, "Full name must be 100 characters or less").optional().nullable(),
});
export type CreateEmployeeRequest = z.infer<typeof CreateEmployeeRequestSchema>;

export const UpdateEmployeeRequestSchema = z.object({
  username: z.string().min(3).max(50).optional().nullable(),
  role: UserRole.refine((role) => role !== "guest", {
    message: "Cannot change employee to guest role",
  }).optional().nullable(),
  email: z.string().email().optional().nullable(),
  full_name: z.string().max(100).optional().nullable(),
});
export type UpdateEmployeeRequest = z.infer<typeof UpdateEmployeeRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters"),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const EmployeeFiltersSchema = z.object({
  page: z.number().min(1).optional(),
  per_page: z.number().min(1).max(100).optional(),
  role: UserRole.optional(),
  search: z.string().optional(),
  include_deactivated: z.boolean().optional(),
});
export type EmployeeFilters = z.infer<typeof EmployeeFiltersSchema>;

// === Financial Reporting Schemas ===
export const RoomFinancialsResponseSchema = z.object({
  total_revenue: z.string(),
  booking_count: z.number(),
  average_revenue: z.string().nullable().optional(),
  occupancy_rate: z.number(),
});
export type RoomFinancialsResponse = z.infer<typeof RoomFinancialsResponseSchema>;

export const RoomSummarySchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  room_type: z.string(),
  status: z.string(),
});
export type RoomSummary = z.infer<typeof RoomSummarySchema>;

export const RoomFinancialSummarySchema = z.object({
  room: RoomSummarySchema,
  financials: RoomFinancialsResponseSchema,
});
export type RoomFinancialSummary = z.infer<typeof RoomFinancialSummarySchema>;

export const CompareRoomsRequestSchema = z.object({
  room_ids: z.array(z.string().uuid()),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});
export type CompareRoomsRequest = z.infer<typeof CompareRoomsRequestSchema>;

export const CompareRoomsResponseSchema = z.object({
  rooms: z.array(RoomFinancialSummarySchema),
});
export type CompareRoomsResponse = z.infer<typeof CompareRoomsResponseSchema>;

// === Guest CRM Schemas ===
export const GuestResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  full_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  id_number: z.string().nullable().optional(),
  created_at: z.string().datetime(),
});
export type GuestResponse = z.infer<typeof GuestResponseSchema>;

export const GuestSearchResponseSchema = z.object({
  guests: z.array(GuestResponseSchema),
});
export type GuestSearchResponse = z.infer<typeof GuestSearchResponseSchema>;

export const GuestProfileResponseSchema = z.object({
  guest: GuestResponseSchema,
  booking_history: z.array(BookingSchema),
});
export type GuestProfileResponse = z.infer<typeof GuestProfileResponseSchema>;

export const UpdateGuestRequestSchema = z.object({
  email: z.string().email().optional().nullable(),
  full_name: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  id_number: z.string().max(50).optional().nullable(),
});
export type UpdateGuestRequest = z.infer<typeof UpdateGuestRequestSchema>;

export const GuestNoteResponseSchema = z.object({
  id: z.string().uuid(),
  guest_id: z.string().uuid(),
  admin_id: z.string().uuid(),
  note: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type GuestNoteResponse = z.infer<typeof GuestNoteResponseSchema>;

export const AddGuestNoteRequestSchema = z.object({
  note: z.string().min(1, "Note cannot be empty").max(10000, "Note must be 10,000 characters or less"),
});
export type AddGuestNoteRequest = z.infer<typeof AddGuestNoteRequestSchema>;

