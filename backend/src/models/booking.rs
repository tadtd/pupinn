use chrono::{DateTime, NaiveDate, Utc};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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
}

/// Booking model representing a guest reservation
#[derive(Debug, Clone, Queryable, Identifiable, Selectable, Associations, Serialize)]
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
}

/// Booking update changeset
#[derive(Debug, AsChangeset, Default)]
#[diesel(table_name = bookings)]
pub struct UpdateBooking {
    pub guest_name: Option<String>,
    pub check_in_date: Option<NaiveDate>,
    pub check_out_date: Option<NaiveDate>,
    pub status: Option<BookingStatus>,
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
            // CheckedIn can only go to checked_out
            (BookingStatus::CheckedIn, BookingStatus::CheckedOut) => true,
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
}
