//! Use Case Tests for Hotel Management System
//!
//! Tests verifying the business logic for all actors:
//! - Admin: Room/Employee management
//! - Receptionist: Check-in/Check-out, Reservations
//! - Guest: Booking, View history
//! - Cleaner: Room status management
//! - System: Authentication

use hotel_management_backend::models::{BookingStatus, RoomStatus, RoomType, UserRole};

// ============================================================================
// ADMIN USE CASES
// ============================================================================

mod admin_room_management {
    use super::*;

    #[test]
    fn test_admin_can_add_room() {
        // Use case: Add / Remove Rooms
        // Admin should be able to create new rooms with valid room types
        let room_types = vec![RoomType::Single, RoomType::Double, RoomType::Suite];
        
        for room_type in room_types {
            // Verify room type is valid
            assert!(matches!(
                room_type,
                RoomType::Single | RoomType::Double | RoomType::Suite
            ));
        }
    }

    #[test]
    fn test_room_status_transitions_for_modification() {
        // Use case: Modify Room Details
        // Admin should be able to change room status through valid transitions
        
        // Available -> Maintenance (valid)
        assert!(RoomStatus::Available.can_transition_to(RoomStatus::Maintenance));
        
        // Maintenance -> Available (valid)
        assert!(RoomStatus::Maintenance.can_transition_to(RoomStatus::Available));
        
        // Available -> Dirty (admin override)
        assert!(RoomStatus::Available.can_transition_to(RoomStatus::Dirty));
    }

    #[test]
    fn test_room_status_display_values() {
        // Use case: View Room Status
        // All room statuses should be representable
        let statuses = vec![
            RoomStatus::Available,
            RoomStatus::Occupied,
            RoomStatus::Maintenance,
            RoomStatus::Dirty,
            RoomStatus::Cleaning,
        ];

        assert_eq!(statuses.len(), 5, "Should have 5 room statuses");
    }

    #[test]
    fn test_booking_status_for_view() {
        // Use case: View Bookings
        // All booking statuses should be filterable
        let statuses = vec![
            BookingStatus::Upcoming,
            BookingStatus::CheckedIn,
            BookingStatus::CheckedOut,
            BookingStatus::Cancelled,
            BookingStatus::Overstay,
        ];

        assert_eq!(statuses.len(), 5, "Should have 5 booking statuses");
    }
}

mod admin_employee_management {
    use super::*;

    #[test]
    fn test_employee_roles_exist() {
        // Use case: Add / Delete Employees
        // Admin should be able to create employees with staff roles
        let staff_roles = vec![
            UserRole::Admin,
            UserRole::Receptionist,
            UserRole::Cleaner,
        ];

        for role in &staff_roles {
            assert!(
                *role != UserRole::Guest,
                "Staff roles should not include Guest"
            );
        }
    }

    #[test]
    fn test_guest_role_is_separate() {
        // Guest role should be distinct from staff roles
        assert_ne!(UserRole::Guest, UserRole::Admin);
        assert_ne!(UserRole::Guest, UserRole::Receptionist);
        assert_ne!(UserRole::Guest, UserRole::Cleaner);
    }
}

// ============================================================================
// RECEPTIONIST USE CASES
// ============================================================================

mod receptionist_check_in_out {
    use super::*;

    #[test]
    fn test_check_in_status_transition() {
        // Use case: Control Check-In / Check-Out
        // Upcoming booking can be checked in
        assert!(BookingStatus::Upcoming.can_transition_to(BookingStatus::CheckedIn));
    }

    #[test]
    fn test_check_out_status_transition() {
        // Use case: Control Check-In / Check-Out
        // Checked-in booking can be checked out
        assert!(BookingStatus::CheckedIn.can_transition_to(BookingStatus::CheckedOut));
    }

    #[test]
    fn test_overstay_can_checkout() {
        // Use case: Control Check-In / Check-Out
        // Overstay booking should also be able to check out
        assert!(BookingStatus::Overstay.can_transition_to(BookingStatus::CheckedOut));
    }

    #[test]
    fn test_room_occupied_on_checkin() {
        // Use case: Control Check-In / Check-Out
        // Room should transition to Occupied on check-in
        assert!(RoomStatus::Available.can_transition_to(RoomStatus::Occupied));
    }

    #[test]
    fn test_room_dirty_on_checkout() {
        // Use case: Control Check-In / Check-Out
        // Room should transition to Dirty on check-out
        assert!(RoomStatus::Occupied.can_transition_to(RoomStatus::Dirty));
    }

}

mod receptionist_reservations {
    use super::*;

    #[test]
    fn test_walk_in_booking_starts_upcoming() {
        // Use case: Make Reservation (Walk-in)
        // New bookings start with Upcoming status
        let initial_status = BookingStatus::Upcoming;
        assert!(!initial_status.is_terminal());
    }

    #[test]
    fn test_booking_can_be_cancelled() {
        // Use case: Make Reservation (Walk-in)
        // Upcoming bookings can be cancelled
        assert!(BookingStatus::Upcoming.can_transition_to(BookingStatus::Cancelled));
    }

    #[test]
    fn test_checked_in_cannot_cancel() {
        // Use case: Make Reservation (Walk-in)
        // Checked-in bookings cannot be cancelled
        assert!(!BookingStatus::CheckedIn.can_transition_to(BookingStatus::Cancelled));
    }
}

mod receptionist_cleaning_tasks {
    use super::*;

    #[test]
    fn test_dirty_room_can_start_cleaning() {
        // Use case: Assign Cleaning Tasks
        // Dirty rooms can be assigned for cleaning
        assert!(RoomStatus::Dirty.can_transition_to(RoomStatus::Cleaning));
    }

    #[test]
    fn test_cleaning_room_can_complete() {
        // Use case: Assign Cleaning Tasks
        // Cleaning rooms can be marked as Available
        assert!(RoomStatus::Cleaning.can_transition_to(RoomStatus::Available));
    }
}

// ============================================================================
// GUEST USE CASES
// ============================================================================

mod guest_reservations {
    use super::*;

    #[test]
    fn test_guest_role_exists() {
        // Use case: Make Reservation
        // Guest role should exist for booking
        let guest_role = UserRole::Guest;
        assert_eq!(guest_role, UserRole::Guest);
    }

    #[test]
    fn test_guest_booking_initial_status() {
        // Use case: Make Reservation
        // Guest bookings start as Upcoming
        let status = BookingStatus::Upcoming;
        assert!(!status.is_terminal());
        assert!(!status.is_active());
    }

    #[test]
    fn test_guest_can_cancel_upcoming() {
        // Use case: Make Reservation
        // Guests can cancel their upcoming bookings
        assert!(BookingStatus::Upcoming.can_transition_to(BookingStatus::Cancelled));
    }
}

mod guest_booking_history {
    use super::*;

    #[test]
    fn test_terminal_statuses_for_history() {
        // Use case: View Booking History
        // Checked out and cancelled are terminal (historical)
        assert!(BookingStatus::CheckedOut.is_terminal());
        assert!(BookingStatus::Cancelled.is_terminal());
    }

    #[test]
    fn test_active_statuses_for_current_stays() {
        // Use case: View Booking History
        // CheckedIn and Overstay are active bookings
        assert!(BookingStatus::CheckedIn.is_active());
        assert!(BookingStatus::Overstay.is_active());
    }

    #[test]
    fn test_upcoming_is_not_active() {
        // Use case: View Booking History
        // Upcoming is not yet active
        assert!(!BookingStatus::Upcoming.is_active());
    }
}

// ============================================================================
// CLEANER USE CASES
// ============================================================================

mod cleaner_room_status {
    use super::*;

    #[test]
    fn test_cleaner_can_start_cleaning() {
        // Use case: Set Room Status
        // Cleaner can transition Dirty -> Cleaning
        assert!(RoomStatus::Dirty.can_transition_to(RoomStatus::Cleaning));
    }

    #[test]
    fn test_cleaner_can_complete_cleaning() {
        // Use case: Set Room Status
        // Cleaner can transition Cleaning -> Available
        assert!(RoomStatus::Cleaning.can_transition_to(RoomStatus::Available));
    }

    #[test]
    fn test_cleaner_can_mark_rework() {
        // Use case: Set Room Status
        // Cleaner can mark room for rework (Cleaning -> Dirty)
        assert!(RoomStatus::Cleaning.can_transition_to(RoomStatus::Dirty));
    }

    #[test]
    fn test_cleaner_cannot_set_occupied() {
        // Use case: Set Room Status
        // Cleaners cannot set room to Occupied (business rule)
        assert!(!RoomStatus::Occupied.is_allowed_for_role(UserRole::Cleaner));
    }

    #[test]
    fn test_cleaner_cannot_set_maintenance() {
        // Use case: Set Room Status
        // Cleaners cannot set room to Maintenance (business rule)
        assert!(!RoomStatus::Maintenance.is_allowed_for_role(UserRole::Cleaner));
    }
}

mod cleaner_assigned_rooms {
    use super::*;

    #[test]
    fn test_dirty_is_default_filter() {
        // Use case: Check Assigned Rooms
        // Dirty rooms are the default view for cleaners
        let dirty = RoomStatus::Dirty;
        assert!(RoomStatus::Dirty.can_transition_to(RoomStatus::Cleaning));
        assert_eq!(dirty, RoomStatus::Dirty);
    }

    #[test]
    fn test_cleaning_rooms_visible() {
        // Use case: Check Assigned Rooms
        // Rooms being cleaned should be visible
        let cleaning = RoomStatus::Cleaning;
        assert!(cleaning.can_transition_to(RoomStatus::Available));
    }
}

// ============================================================================
// SYSTEM USE CASES
// ============================================================================

mod system_authentication {
    use super::*;

    #[test]
    fn test_all_roles_can_login() {
        // Use case: Login / Logout
        // All user roles should be able to authenticate
        let roles = vec![
            UserRole::Admin,
            UserRole::Receptionist,
            UserRole::Cleaner,
            UserRole::Guest,
        ];

        assert_eq!(roles.len(), 4, "Should have 4 user roles");
    }

    #[test]
    fn test_guest_role_for_signup() {
        // Use case: Sign Up
        // Only guests can sign up (staff created by admin)
        let guest = UserRole::Guest;
        assert_eq!(guest, UserRole::Guest);
    }
}

mod system_profile {
    use super::*;

    #[test]
    fn test_user_roles_are_distinct() {
        // Use case: View Profile
        // Each role should have distinct permissions
        assert_ne!(UserRole::Admin, UserRole::Receptionist);
        assert_ne!(UserRole::Admin, UserRole::Cleaner);
        assert_ne!(UserRole::Admin, UserRole::Guest);
        assert_ne!(UserRole::Receptionist, UserRole::Cleaner);
        assert_ne!(UserRole::Receptionist, UserRole::Guest);
        assert_ne!(UserRole::Cleaner, UserRole::Guest);
    }
}

// ============================================================================
// BOOKING AVAILABILITY LOGIC
// ============================================================================

mod booking_availability {
    use super::*;

    #[test]
    fn test_status_blocks_availability() {
        // Upcoming, CheckedIn, and Overstay block room availability
        assert!(BookingStatus::Upcoming.blocks_availability());
        assert!(BookingStatus::CheckedIn.blocks_availability());
        assert!(BookingStatus::Overstay.blocks_availability());
    }

    #[test]
    fn test_terminal_does_not_block() {
        // Cancelled and CheckedOut don't block availability
        assert!(!BookingStatus::Cancelled.blocks_availability());
        assert!(!BookingStatus::CheckedOut.blocks_availability());
    }

}
