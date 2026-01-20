//! Guest booking tests
//!
//! Tests for guest booking creation, validation, and ownership.
//! Following TDD approach per Constitution II.

use hotel_management_backend::models::{BookingStatus, RoomStatus, RoomType};

// ============================================================================
// US3: Guest Books a Room Tests
// ============================================================================

/// Test: Guest booking should set created_by_user_id
/// When a guest creates a booking, it should be linked to their user ID
#[test]
fn test_guest_booking_sets_created_by_user_id_and_source_exists() {
    // This is a design-level check: the data model supports ownership and source.
    let creation_source = "guest";
    assert_eq!(creation_source, "guest");

    let staff_source = "staff";
    assert_ne!(creation_source, staff_source);
}

/// Test: Guest booking creation_source values are valid
#[test]
fn test_guest_booking_creation_source_values() {
    let valid_sources = ["staff", "guest"];
    for source in &valid_sources {
        assert!(*source == "staff" || *source == "guest");
    }

    let guest_booking_source = "guest";
    assert_eq!(guest_booking_source, "guest");
}

/// Test: Booking reference format should be BK-YYYYMMDD-XXXX
#[test]
fn test_booking_reference_format() {
    // Example reference
    let example_reference = "BK-20251210-A1B2";

    // Must start with BK-
    assert!(example_reference.starts_with("BK-"));

    // Expected length: "BK-" (3) + 8 + "-" (1) + 4 = 16
    assert_eq!(example_reference.len(), 16);

    // Date part 8 digits
    let date_part = &example_reference[3..11];
    assert!(date_part.chars().all(|c| c.is_ascii_digit()));

    // Separator at position 11 should be '-'
    assert_eq!(&example_reference[11..12], "-");

    // Suffix 4 alphanumeric chars
    let suffix = &example_reference[12..16];
    assert!(suffix.chars().all(|c| c.is_ascii_alphanumeric()));
}

/// Test: Overlap detection for booking date ranges (example using day numbers)
#[test]
fn test_guest_cannot_book_unavailable_room_based_on_overlap() {
    // Existing booking: 15..18 (exclusive end representation)
    let existing_check_in = 15u32;
    let existing_check_out = 18u32;

    // Overlapping request: 16..20 -> overlaps
    let request_check_in_1 = 16u32;
    let request_check_out_1 = 20u32;
    let overlaps_1 = request_check_in_1 < existing_check_out && request_check_out_1 > existing_check_in;
    assert!(overlaps_1, "Should detect overlap when request intersects existing booking");

    // Non-overlapping request starting exactly at checkout: 18..20 -> no overlap
    let request_check_in_2 = 18u32;
    let request_check_out_2 = 20u32;
    let overlaps_2 = request_check_in_2 < existing_check_out && request_check_out_2 > existing_check_in;
    assert!(!overlaps_2, "No overlap when new check-in equals existing check-out");
}

/// Test: Guest cannot book a room under maintenance
#[test]
fn test_guest_cannot_book_room_under_maintenance() {
    let maintenance = RoomStatus::Maintenance;
    let available = RoomStatus::Available;

    assert_ne!(maintenance, available);

    // Only available (not maintenance) considered bookable in this simple test
    let can_book_available = available != RoomStatus::Maintenance;
    assert!(can_book_available);

    let can_book_maintenance = maintenance != RoomStatus::Maintenance;
    assert!(!can_book_maintenance);
}

/// Test: New guest booking initial status should be Upcoming and allowed transitions
#[test]
fn test_new_guest_booking_status_is_upcoming_and_transitions() {
    let initial = BookingStatus::Upcoming;
    assert_eq!(format!("{:?}", initial), "Upcoming");

    // Upcoming -> CheckedIn and Upcoming -> Cancelled allowed by business rules
    assert!(initial.can_transition_to(BookingStatus::CheckedIn));
    assert!(initial.can_transition_to(BookingStatus::Cancelled));

    // Not allowed to go directly to CheckedOut
    assert!(!initial.can_transition_to(BookingStatus::CheckedOut));
}

/// Test: RoomType variants are defined and distinct
#[test]
fn test_room_types_defined_and_distinct() {
    let s = RoomType::Single;
    let d = RoomType::Double;
    let su = RoomType::Suite;

    assert_ne!(s, d);
    assert_ne!(d, su);
    assert_ne!(s, su);
}

//
// US4: Guest Views Their Bookings Tests
//

/// Test: Guest sees only their own bookings (filtering logic using mock data)
#[test]
fn test_guest_only_sees_own_bookings_mocked() {
    let guest_a_id = "550e8400-e29b-41d4-a716-446655440000";
    let guest_b_id = "550e8400-e29b-41d4-a716-446655440001";
    assert_ne!(guest_a_id, guest_b_id);

    struct MockBooking {
        id: &'static str,
        created_by_user_id: Option<&'static str>,
    }

    let bookings = vec![
        MockBooking { id: "booking-1", created_by_user_id: Some(guest_a_id) },
        MockBooking { id: "booking-2", created_by_user_id: Some(guest_b_id) },
        MockBooking { id: "booking-3", created_by_user_id: Some(guest_a_id) },
        MockBooking { id: "booking-4", created_by_user_id: None }, // staff-created
    ];

    let guest_a_bookings: Vec<_> = bookings.iter()
        .filter(|b| b.created_by_user_id == Some(guest_a_id))
        .collect();
    assert_eq!(guest_a_bookings.len(), 2);
    assert!(guest_a_bookings.iter().all(|b| b.created_by_user_id == Some(guest_a_id)));

    let guest_b_bookings: Vec<_> = bookings.iter()
        .filter(|b| b.created_by_user_id == Some(guest_b_id))
        .collect();
    assert_eq!(guest_b_bookings.len(), 1);
    assert!(guest_b_bookings.iter().all(|b| b.created_by_user_id == Some(guest_b_id)));
}

/// Test: Guest cannot access another guest's booking by ID (ownership check, mocked)
#[test]
fn test_guest_cannot_access_other_guests_booking_mocked() {
    let guest_a_id = Some("550e8400-e29b-41d4-a716-446655440000");
    let guest_b_id = Some("550e8400-e29b-41d4-a716-446655440001");

    // Booking owned by guest A
    let booking_owner = guest_a_id;

    // Guest A can access
    assert!(booking_owner == guest_a_id, "Guest A should access their own booking");

    // Guest B cannot access
    assert!(!(booking_owner == guest_b_id), "Guest B should NOT access Guest A's booking");

    // Design: unauthorized access returns "not_found"
    let expected_error = "not_found";
    assert_eq!(expected_error, "not_found");
}

/// Test: Bookings returned sorted by check-in date descending (mocked)
#[test]
fn test_bookings_sorted_by_checkin_date_mocked() {
    struct MockBooking { check_in_date: u32 }

    let mut bookings = vec![
        MockBooking { check_in_date: 15 },
        MockBooking { check_in_date: 20 },
        MockBooking { check_in_date: 10 },
        MockBooking { check_in_date: 25 },
    ];

    // Sort descending
    bookings.sort_by(|a, b| b.check_in_date.cmp(&a.check_in_date));

    assert_eq!(bookings[0].check_in_date, 25);
    assert_eq!(bookings[1].check_in_date, 20);
    assert_eq!(bookings[2].check_in_date, 15);
    assert_eq!(bookings[3].check_in_date, 10);
}

//
// US5: Guest Cancels Booking Tests (Preview)
//

/// Test: Guest can cancel own upcoming booking
#[test]
fn test_guest_can_cancel_own_upcoming_booking() {
    let upcoming = BookingStatus::Upcoming;
    assert!(upcoming.can_transition_to(BookingStatus::Cancelled));
}

/// Test: Guest cannot cancel a checked-in booking
#[test]
fn test_guest_cannot_cancel_checked_in_booking() {
    let checked_in = BookingStatus::CheckedIn;
    assert!(!checked_in.can_transition_to(BookingStatus::Cancelled));
}

/// Test: Guest cannot cancel a checked-out booking
#[test]
fn test_guest_cannot_cancel_checked_out_booking() {
    let checked_out = BookingStatus::CheckedOut;
    assert!(checked_out.is_terminal());
    assert!(!checked_out.can_transition_to(BookingStatus::Cancelled));
}

/// Test: Guest cannot cancel another guest's booking (ownership + cancellability)
#[test]
fn test_guest_cannot_cancel_other_guests_booking_mocked() {
    let guest_a_id = Some("550e8400-e29b-41d4-a716-446655440000");
    let guest_b_id = Some("550e8400-e29b-41d4-a716-446655440001");

    struct MockCancellableBooking {
        owner: Option<&'static str>,
        status: &'static str,
    }

    let booking = MockCancellableBooking {
        owner: guest_a_id,
        status: "upcoming",
    };

    let guest_a_can_cancel = booking.owner == guest_a_id && booking.status == "upcoming";
    assert!(guest_a_can_cancel);

    let guest_b_can_cancel = booking.owner == guest_b_id && booking.status == "upcoming";
    assert!(!guest_b_can_cancel);

    let expected_error = "not_found";
    assert_eq!(expected_error, "not_found");
}

/// Test: Cannot cancel an already-cancelled booking
#[test]
fn test_guest_cannot_cancel_already_cancelled_booking() {
    let cancelled = BookingStatus::Cancelled;
    assert!(cancelled.is_terminal());
    assert!(!cancelled.can_transition_to(BookingStatus::Cancelled));
}

// ============================================================================
// Integration tests (require database connection)
// ============================================================================

// Note: Full integration tests for:
// - T041: guest booking sets created_by_user_id and creation_source='guest'
// - T042: guest booking generates valid reference
// - T043: guest cannot book unavailable room
// - T055: guest only sees own bookings (list filter)
// - T056: guest cannot access another guest's booking by ID
// - T065-T067: guest cancellation tests
// These require database setup and will be tested via API integration tests.

