//! Tests for cleaner role access control and status restrictions
//!
//! These tests are DB-free and only exercise pure helper functions / enums.

use hotel_management_backend::api::middleware::is_staff_role;
use hotel_management_backend::models::{RoomStatus, UserRole};

mod access_control_tests {
    use super::*;

    #[test]
    fn cleaner_is_not_treated_as_staff() {
        assert!(
            !is_staff_role(UserRole::Cleaner),
            "Cleaner should not be treated as staff (staff = admin or receptionist)"
        );
    }

    #[test]
    fn admin_and_receptionist_are_staff() {
        assert!(is_staff_role(UserRole::Admin), "Admin should be staff");
        assert!(
            is_staff_role(UserRole::Receptionist),
            "Receptionist should be staff"
        );
    }

    #[test]
    fn guest_is_not_staff() {
        assert!(
            !is_staff_role(UserRole::Guest),
            "Guest should never be treated as staff"
        );
    }
}

mod cleaner_status_permission_tests {
    use super::*;

    #[test]
    fn cleaner_cannot_set_occupied_or_maintenance() {
        assert!(
            !RoomStatus::Occupied.is_allowed_for_role(UserRole::Cleaner),
            "Cleaner must not set room status to occupied"
        );
        assert!(
            !RoomStatus::Maintenance.is_allowed_for_role(UserRole::Cleaner),
            "Cleaner must not set room status to maintenance"
        );
    }

    #[test]
    fn cleaner_can_set_cleaning_flow_statuses() {
        assert!(
            RoomStatus::Dirty.is_allowed_for_role(UserRole::Cleaner),
            "Cleaner should be allowed to set dirty"
        );
        assert!(
            RoomStatus::Cleaning.is_allowed_for_role(UserRole::Cleaner),
            "Cleaner should be allowed to set cleaning"
        );
        assert!(
            RoomStatus::Available.is_allowed_for_role(UserRole::Cleaner),
            "Cleaner should be allowed to set available after cleaning"
        );
    }

    #[test]
    fn occupied_to_dirty_transition_is_permitted_for_checkout() {
        assert!(
            RoomStatus::Occupied.can_transition_to(RoomStatus::Dirty),
            "Checkout path must allow occupied -> dirty"
        );
    }
}