use chrono::{DateTime, Utc};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use bigdecimal::BigDecimal;

use crate::schema::rooms;
use crate::models::UserRole;

/// Room type enum matching PostgreSQL room_type type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, DbEnum)]
#[ExistingTypePath = "crate::schema::sql_types::RoomType"]
#[serde(rename_all = "snake_case")]
#[DbValueStyle = "snake_case"]
pub enum RoomType {
    Single,
    Double,
    Suite,
}

/// Room status enum matching PostgreSQL room_status type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, DbEnum)]
#[ExistingTypePath = "crate::schema::sql_types::RoomStatus"]
#[serde(rename_all = "snake_case")]
#[DbValueStyle = "snake_case"]
pub enum RoomStatus {
    Available,
    Occupied,
    Maintenance,
    Dirty,
    Cleaning,
}

/// Room model representing a hotel room
#[derive(Debug, Clone, Queryable, Identifiable, Serialize, Selectable)]
#[diesel(table_name = rooms)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Room {
    pub id: Uuid,
    pub number: String,
    pub room_type: RoomType,
    pub status: RoomStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub price: BigDecimal,
}

/// New room for insertion
#[derive(Debug, Insertable)]
#[diesel(table_name = rooms)]
pub struct NewRoom<'a> {
    pub number: &'a str,
    pub room_type: RoomType,
    pub price: BigDecimal,
}

/// Room update changeset
#[derive(Debug, AsChangeset, Default)]
#[diesel(table_name = rooms)]
pub struct UpdateRoom {
    pub room_type: Option<RoomType>,
    pub status: Option<RoomStatus>,
    pub price: Option<BigDecimal>,
}

impl RoomStatus {
    /// Check if transition to new status is valid
    pub fn can_transition_to(&self, new_status: RoomStatus) -> bool {
        match (self, new_status) {
            // Available can go to occupied (check-in) or maintenance
            (RoomStatus::Available, RoomStatus::Occupied) => true,
            (RoomStatus::Available, RoomStatus::Maintenance) => true,
            (RoomStatus::Available, RoomStatus::Dirty) => true, // Manual override (admin only)
            // Occupied can go to available (check-out) or dirty (automatic on check-out)
            (RoomStatus::Occupied, RoomStatus::Available) => true,
            (RoomStatus::Occupied, RoomStatus::Dirty) => true, // Automatic on check-out
            // Maintenance can only go to available
            (RoomStatus::Maintenance, RoomStatus::Available) => true,
            // Cleaning workflow transitions
            (RoomStatus::Dirty, RoomStatus::Cleaning) => true, // Cleaner starts work
            (RoomStatus::Dirty, RoomStatus::Available) => true, // Direct completion (allowed but unusual)
            (RoomStatus::Cleaning, RoomStatus::Available) => true, // Cleaner finishes work
            (RoomStatus::Cleaning, RoomStatus::Dirty) => true, // Rework needed
            // Same status is always valid (no-op)
            (a, b) if *a == b => true,
            // All other transitions are invalid
            _ => false,
        }
    }

    /// Check if a role is allowed to set this status
    /// Returns true if the role can set this status, false otherwise
    pub fn is_allowed_for_role(&self, role: UserRole) -> bool {
        match (self, role) {
            // Cleaners cannot set rooms to Occupied or Maintenance
            (RoomStatus::Occupied, UserRole::Cleaner) => false,
            (RoomStatus::Maintenance, UserRole::Cleaner) => false,
            // All other statuses are allowed for cleaners
            _ => true,
        }
    }
}
