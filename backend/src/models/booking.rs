use chrono::{DateTime, NaiveDate, Utc};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use bigdecimal::BigDecimal;
use crate::schema::bookings;

use super::Room;

/// Booking status enum matching PostgreSQL booking_status type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, DbEnum)]
#[ExistingTypePath = "crate::schema::sql_types::BookingStatus"]
#[serde(rename_all = "snake_case")]
#[DbValueStyle = "snake_case"]
pub enum BookingStatus {
    Upcoming,
    CheckedIn,
    CheckedOut,
    Cancelled,
    NoShow,
    Overstay,
}

/// Booking model representing a guest reservation
#[derive(Debug, Clone, Queryable, Identifiable, Associations, Serialize, Selectable)]
#[diesel(table_name = bookings)]
#[diesel(belongs_to(Room))]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Booking {
    pub id: Uuid,
    pub reference: String,
    pub guest_name: String,
    pub room_id: Uuid,
    pub check_in_date: NaiveDate,
    pub check_out_date: NaiveDate,
    pub status: BookingStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    /// User who created this booking (for guest-created bookings)
    pub created_by_user_id: Option<Uuid>,
    /// Source of booking creation: 'staff' or 'guest'
    pub creation_source: String,
    /// Booking price/revenue
    pub price: BigDecimal,
}

/// New booking for insertion
#[derive(Debug, Insertable)]
#[diesel(table_name = bookings)]
pub struct NewBooking<'a> {
    pub reference: &'a str,
    pub guest_name: &'a str,
    pub room_id: Uuid,
    pub check_in_date: NaiveDate,
    pub check_out_date: NaiveDate,
    pub created_by_user_id: Option<Uuid>,
    pub creation_source: &'a str,
    pub price: BigDecimal,
}

/// Booking update changeset
#[derive(Debug, AsChangeset, Default)]
#[diesel(table_name = bookings)]
pub struct UpdateBooking {
    pub guest_name: Option<String>,
    pub check_in_date: Option<NaiveDate>,
    pub check_out_date: Option<NaiveDate>,
    pub status: Option<BookingStatus>,
    pub price: Option<BigDecimal>,
}

/// Booking with room details for API responses
#[derive(Debug, Clone, Serialize)]
pub struct BookingWithRoom {
    #[serde(flatten)]
    pub booking: Booking,
    pub room: Option<Room>,
}

impl BookingStatus {
    /// Check if transition to new status is valid
    pub fn can_transition_to(&self, new_status: BookingStatus) -> bool {
        match (self, new_status) {
            // Upcoming can go to checked_in or cancelled
            (BookingStatus::Upcoming, BookingStatus::CheckedIn) => true,
            (BookingStatus::Upcoming, BookingStatus::Cancelled) => true,
            (BookingStatus::Upcoming, BookingStatus::NoShow) => true, // Automatic via handle_stale_bookings
            // CheckedIn can go to checked_out
            (BookingStatus::CheckedIn, BookingStatus::CheckedOut) => true,
            (BookingStatus::CheckedIn, BookingStatus::Overstay) => true, // Automatic via handle_stale_bookings
            // NoShow can be checked in (late check-in) or cancelled
            (BookingStatus::NoShow, BookingStatus::CheckedIn) => true,
            (BookingStatus::NoShow, BookingStatus::Cancelled) => true,
            // Overstay can be checked out
            (BookingStatus::Overstay, BookingStatus::CheckedOut) => true,
            // CheckedOut and Cancelled are terminal states
            (BookingStatus::CheckedOut, _) => false,
            (BookingStatus::Cancelled, _) => false,
            // Same status is always valid (no-op)
            (a, b) if *a == b => true,
            // All other transitions are invalid
            _ => false,
        }
    }

    /// Check if this is a terminal state
    pub fn is_terminal(&self) -> bool {
        matches!(self, BookingStatus::CheckedOut | BookingStatus::Cancelled)
    }

    /// Check if this status represents an active booking (room is occupied or should be)
    pub fn is_active(&self) -> bool {
        matches!(
            self,
            BookingStatus::CheckedIn | BookingStatus::Overstay
        )
    }

    /// Check if this status blocks room availability
    pub fn blocks_availability(&self) -> bool {
        matches!(
            self,
            BookingStatus::Upcoming
                | BookingStatus::CheckedIn
                | BookingStatus::Overstay
        )
    }
}
