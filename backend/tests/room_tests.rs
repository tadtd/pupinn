//! Unit tests for RoomService
//!
//! These tests verify room-related business logic including status transitions.

mod room_status_transition_tests {
    use hotel_management_backend::models::RoomStatus;

    #[test]
    fn test_available_can_transition_to_occupied() {
        assert!(
            RoomStatus::Available.can_transition_to(RoomStatus::Occupied),
            "Available room should be able to transition to occupied (check-in)"
        );
    }

    #[test]
    fn test_available_can_transition_to_maintenance() {
        assert!(
            RoomStatus::Available.can_transition_to(RoomStatus::Maintenance),
            "Available room should be able to transition to maintenance"
        );
    }

    #[test]
    fn test_occupied_can_transition_to_available() {
        assert!(
            RoomStatus::Occupied.can_transition_to(RoomStatus::Available),
            "Occupied room should be able to transition to available (check-out)"
        );
    }

    #[test]
    fn test_occupied_cannot_transition_to_maintenance() {
        assert!(
            !RoomStatus::Occupied.can_transition_to(RoomStatus::Maintenance),
            "Occupied room should NOT be able to transition directly to maintenance"
        );
    }

    #[test]
    fn test_maintenance_can_transition_to_available() {
        assert!(
            RoomStatus::Maintenance.can_transition_to(RoomStatus::Available),
            "Maintenance room should be able to transition to available"
        );
    }

    #[test]
    fn test_maintenance_cannot_transition_to_occupied() {
        assert!(
            !RoomStatus::Maintenance.can_transition_to(RoomStatus::Occupied),
            "Maintenance room should NOT be able to transition directly to occupied"
        );
    }

    #[test]
    fn test_same_status_transition_is_valid() {
        // Transitioning to the same status should be allowed (no-op)
        assert!(
            RoomStatus::Available.can_transition_to(RoomStatus::Available),
            "Same status transition should be valid"
        );
        assert!(
            RoomStatus::Occupied.can_transition_to(RoomStatus::Occupied),
            "Same status transition should be valid"
        );
        assert!(
            RoomStatus::Maintenance.can_transition_to(RoomStatus::Maintenance),
            "Same status transition should be valid"
        );
    }
}

mod room_type_tests {
    use hotel_management_backend::models::RoomType;

    #[test]
    fn test_room_type_serialization() {
        let single = RoomType::Single;
        let double = RoomType::Double;
        let suite = RoomType::Suite;

        let single_json = serde_json::to_string(&single).unwrap();
        let double_json = serde_json::to_string(&double).unwrap();
        let suite_json = serde_json::to_string(&suite).unwrap();

        assert_eq!(single_json, "\"single\"");
        assert_eq!(double_json, "\"double\"");
        assert_eq!(suite_json, "\"suite\"");
    }

    #[test]
    fn test_room_type_deserialization() {
        let single: RoomType = serde_json::from_str("\"single\"").unwrap();
        let double: RoomType = serde_json::from_str("\"double\"").unwrap();
        let suite: RoomType = serde_json::from_str("\"suite\"").unwrap();

        assert_eq!(single, RoomType::Single);
        assert_eq!(double, RoomType::Double);
        assert_eq!(suite, RoomType::Suite);
    }
}

mod room_status_serialization_tests {
    use hotel_management_backend::models::RoomStatus;

    #[test]
    fn test_room_status_serialization() {
        let available = RoomStatus::Available;
        let occupied = RoomStatus::Occupied;
        let maintenance = RoomStatus::Maintenance;

        let available_json = serde_json::to_string(&available).unwrap();
        let occupied_json = serde_json::to_string(&occupied).unwrap();
        let maintenance_json = serde_json::to_string(&maintenance).unwrap();

        assert_eq!(available_json, "\"available\"");
        assert_eq!(occupied_json, "\"occupied\"");
        assert_eq!(maintenance_json, "\"maintenance\"");
    }

    #[test]
    fn test_room_status_deserialization() {
        let available: RoomStatus = serde_json::from_str("\"available\"").unwrap();
        let occupied: RoomStatus = serde_json::from_str("\"occupied\"").unwrap();
        let maintenance: RoomStatus = serde_json::from_str("\"maintenance\"").unwrap();

        assert_eq!(available, RoomStatus::Available);
        assert_eq!(occupied, RoomStatus::Occupied);
        assert_eq!(maintenance, RoomStatus::Maintenance);
    }
}
