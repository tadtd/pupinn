/**
 * Use Case Tests - Validators
 *
 * Tests verifying the data validation schemas for all actors:
 * - Admin: Room/Employee management
 * - Receptionist: Reservations
 * - Guest: Booking
 * - System: Authentication
 */

import { describe, it, expect } from "vitest";
import {
  // Enums
  UserRole,
  RoomType,
  RoomStatus,
  BookingStatus,
  // Auth schemas
  LoginRequestSchema,
  GuestRegisterRequestSchema,
  GuestLoginRequestSchema,
  // Room schemas
  CreateRoomRequestSchema,
  UpdateRoomRequestSchema,
  // Booking schemas
  CreateBookingRequestSchema,
  GuestBookingRequestSchema,
  CheckInRequestSchema,
  // Employee schemas
  CreateEmployeeRequestSchema,
  UpdateEmployeeRequestSchema,
  ResetPasswordRequestSchema,
  // Guest CRM schemas
  UpdateGuestRequestSchema,
  AddGuestNoteRequestSchema,
} from "../validators";

// ============================================================================
// ADMIN USE CASES
// ============================================================================

describe("Admin: Add / Remove Rooms", () => {
  it("should validate room creation with valid data", () => {
    const validRoom = {
      number: "101",
      room_type: "single",
    };

    const result = CreateRoomRequestSchema.safeParse(validRoom);
    expect(result.success).toBe(true);
  });

  it("should accept all room types", () => {
    const roomTypes = ["single", "double", "suite"];

    roomTypes.forEach((type) => {
      const result = RoomType.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid room type", () => {
    const result = RoomType.safeParse("penthouse");
    expect(result.success).toBe(false);
  });

  it("should reject empty room number", () => {
    const invalidRoom = {
      number: "",
      room_type: "single",
    };

    const result = CreateRoomRequestSchema.safeParse(invalidRoom);
    expect(result.success).toBe(false);
  });
});

describe("Admin: Modify Room Details", () => {
  it("should validate room status update", () => {
    const validUpdate = {
      status: "maintenance",
    };

    const result = UpdateRoomRequestSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("should accept all room statuses", () => {
    const statuses = ["available", "occupied", "maintenance", "dirty", "cleaning"];

    statuses.forEach((status) => {
      const result = RoomStatus.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it("should allow partial updates", () => {
    const partialUpdate = {
      room_type: "suite",
    };

    const result = UpdateRoomRequestSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });
});

describe("Admin: Add / Delete Employees", () => {
  it("should validate employee creation", () => {
    const validEmployee = {
      username: "john_doe",
      password: "password123",
      role: "receptionist",
    };

    const result = CreateEmployeeRequestSchema.safeParse(validEmployee);
    expect(result.success).toBe(true);
  });

  it("should accept admin, receptionist, and cleaner roles", () => {
    const staffRoles = ["admin", "receptionist", "cleaner"];

    staffRoles.forEach((role) => {
      const employee = {
        username: "testuser",
        password: "password123",
        role,
      };
      const result = CreateEmployeeRequestSchema.safeParse(employee);
      expect(result.success).toBe(true);
    });
  });

  it("should reject guest role for employee creation", () => {
    const guestEmployee = {
      username: "testuser",
      password: "password123",
      role: "guest",
    };

    const result = CreateEmployeeRequestSchema.safeParse(guestEmployee);
    expect(result.success).toBe(false);
  });

  it("should require minimum password length", () => {
    const shortPassword = {
      username: "testuser",
      password: "short",
      role: "receptionist",
    };

    const result = CreateEmployeeRequestSchema.safeParse(shortPassword);
    expect(result.success).toBe(false);
  });
});

describe("Admin: View Room Status", () => {
  it("should validate all room statuses", () => {
    const statuses = ["available", "occupied", "maintenance", "dirty", "cleaning"];
    expect(statuses.length).toBe(5);

    statuses.forEach((status) => {
      expect(RoomStatus.safeParse(status).success).toBe(true);
    });
  });
});

describe("Admin: View Bookings", () => {
  it("should validate all booking statuses", () => {
    const statuses = ["upcoming", "checked_in", "checked_out", "cancelled"];

    statuses.forEach((status) => {
      expect(BookingStatus.safeParse(status).success).toBe(true);
    });
  });
});

// ============================================================================
// RECEPTIONIST USE CASES
// ============================================================================

describe("Receptionist: Control Check-In / Check-Out", () => {
  it("should validate check-in request", () => {
    const checkInRequest = {
      confirm_early: false,
    };

    const result = CheckInRequestSchema.safeParse(checkInRequest);
    expect(result.success).toBe(true);
  });

  it("should allow empty check-in request", () => {
    const result = CheckInRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should allow early check-in confirmation", () => {
    const earlyCheckIn = {
      confirm_early: true,
    };

    const result = CheckInRequestSchema.safeParse(earlyCheckIn);
    expect(result.success).toBe(true);
  });
});

describe("Receptionist: Make Reservation (Walk-in)", () => {
  it("should validate booking creation", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const validBooking = {
      guest_name: "John Doe",
      room_id: "550e8400-e29b-41d4-a716-446655440000",
      check_in_date: tomorrow.toISOString().split("T")[0],
      check_out_date: dayAfter.toISOString().split("T")[0],
    };

    const result = CreateBookingRequestSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it("should reject empty guest name", () => {
    const invalidBooking = {
      guest_name: "",
      room_id: "550e8400-e29b-41d4-a716-446655440000",
      check_in_date: "2026-01-20",
      check_out_date: "2026-01-22",
    };

    const result = CreateBookingRequestSchema.safeParse(invalidBooking);
    expect(result.success).toBe(false);
  });

  it("should reject check-out before check-in", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const invalidBooking = {
      guest_name: "John Doe",
      room_id: "550e8400-e29b-41d4-a716-446655440000",
      check_in_date: dayAfter.toISOString().split("T")[0],
      check_out_date: tomorrow.toISOString().split("T")[0],
    };

    const result = CreateBookingRequestSchema.safeParse(invalidBooking);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// GUEST USE CASES
// ============================================================================

describe("Guest: Make Reservation", () => {
  it("should validate guest booking request", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const validBooking = {
      room_id: "550e8400-e29b-41d4-a716-446655440000",
      check_in_date: tomorrow.toISOString().split("T")[0],
      check_out_date: dayAfter.toISOString().split("T")[0],
    };

    const result = GuestBookingRequestSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it("should reject past check-in date", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const invalidBooking = {
      room_id: "550e8400-e29b-41d4-a716-446655440000",
      check_in_date: pastDate.toISOString().split("T")[0],
      check_out_date: "2026-12-25",
    };

    const result = GuestBookingRequestSchema.safeParse(invalidBooking);
    expect(result.success).toBe(false);
  });

  it("should reject same-day checkout", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sameDay = {
      room_id: "550e8400-e29b-41d4-a716-446655440000",
      check_in_date: tomorrow.toISOString().split("T")[0],
      check_out_date: tomorrow.toISOString().split("T")[0],
    };

    const result = GuestBookingRequestSchema.safeParse(sameDay);
    expect(result.success).toBe(false);
  });
});

describe("Guest: View Booking History", () => {
  it("should recognize all booking statuses", () => {
    const statuses = ["upcoming", "checked_in", "checked_out", "cancelled"];

    statuses.forEach((status) => {
      const result = BookingStatus.safeParse(status);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// CLEANER USE CASES
// ============================================================================

describe("Cleaner: Set Room Status", () => {
  it("should accept cleaning workflow statuses", () => {
    const cleaningStatuses = ["dirty", "cleaning", "available"];

    cleaningStatuses.forEach((status) => {
      const result = RoomStatus.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it("should have occupied status for post-checkout", () => {
    const result = RoomStatus.safeParse("occupied");
    expect(result.success).toBe(true);
  });
});

describe("Cleaner: Check Assigned Rooms", () => {
  it("should validate dirty status filter", () => {
    const result = RoomStatus.safeParse("dirty");
    expect(result.success).toBe(true);
  });

  it("should validate cleaning status filter", () => {
    const result = RoomStatus.safeParse("cleaning");
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// SYSTEM USE CASES
// ============================================================================

describe("System: Sign Up", () => {
  it("should validate guest registration", () => {
    const validRegistration = {
      email: "guest@example.com",
      password: "Password123",
      full_name: "John Doe",
    };

    const result = GuestRegisterRequestSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
  });

  it("should require valid email", () => {
    const invalidEmail = {
      email: "not-an-email",
      password: "Password123",
      full_name: "John Doe",
    };

    const result = GuestRegisterRequestSchema.safeParse(invalidEmail);
    expect(result.success).toBe(false);
  });

  it("should require password with letter and number", () => {
    const noNumber = {
      email: "guest@example.com",
      password: "PasswordOnly",
      full_name: "John Doe",
    };

    const result = GuestRegisterRequestSchema.safeParse(noNumber);
    expect(result.success).toBe(false);
  });

  it("should require minimum password length", () => {
    const shortPassword = {
      email: "guest@example.com",
      password: "Pass1",
      full_name: "John Doe",
    };

    const result = GuestRegisterRequestSchema.safeParse(shortPassword);
    expect(result.success).toBe(false);
  });

  it("should require full name", () => {
    const noName = {
      email: "guest@example.com",
      password: "Password123",
      full_name: "",
    };

    const result = GuestRegisterRequestSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });
});

describe("System: Login / Logout", () => {
  it("should validate staff login", () => {
    const validLogin = {
      username: "admin",
      password: "password123",
    };

    const result = LoginRequestSchema.safeParse(validLogin);
    expect(result.success).toBe(true);
  });

  it("should validate guest login", () => {
    const validLogin = {
      email: "guest@example.com",
      password: "password",
    };

    const result = GuestLoginRequestSchema.safeParse(validLogin);
    expect(result.success).toBe(true);
  });

  it("should require minimum username length", () => {
    const shortUsername = {
      username: "ab",
      password: "password123",
    };

    const result = LoginRequestSchema.safeParse(shortUsername);
    expect(result.success).toBe(false);
  });

  it("should require minimum password length for staff", () => {
    const shortPassword = {
      username: "admin",
      password: "short",
    };

    const result = LoginRequestSchema.safeParse(shortPassword);
    expect(result.success).toBe(false);
  });
});

describe("System: View Profile", () => {
  it("should recognize all user roles", () => {
    const roles = ["admin", "receptionist", "cleaner", "guest"];

    roles.forEach((role) => {
      const result = UserRole.safeParse(role);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid roles", () => {
    const result = UserRole.safeParse("manager");
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// ADMIN GUEST CRM (from completed features)
// ============================================================================

describe("Admin: Guest CRM", () => {
  it("should validate guest update request", () => {
    const validUpdate = {
      email: "newemail@example.com",
      full_name: "Updated Name",
      phone: "+1234567890",
    };

    const result = UpdateGuestRequestSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("should allow partial guest updates", () => {
    const partialUpdate = {
      phone: "+1234567890",
    };

    const result = UpdateGuestRequestSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it("should validate guest note", () => {
    const validNote = {
      note: "Guest prefers quiet room",
    };

    const result = AddGuestNoteRequestSchema.safeParse(validNote);
    expect(result.success).toBe(true);
  });

  it("should reject empty note", () => {
    const emptyNote = {
      note: "",
    };

    const result = AddGuestNoteRequestSchema.safeParse(emptyNote);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// EMPLOYEE MANAGEMENT (password reset)
// ============================================================================

describe("Admin: Employee Password Reset", () => {
  it("should validate password reset request", () => {
    const validReset = {
      new_password: "newPassword123",
    };

    const result = ResetPasswordRequestSchema.safeParse(validReset);
    expect(result.success).toBe(true);
  });

  it("should require minimum password length", () => {
    const shortPassword = {
      new_password: "short",
    };

    const result = ResetPasswordRequestSchema.safeParse(shortPassword);
    expect(result.success).toBe(false);
  });
});
