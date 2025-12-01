use chrono::{DateTime, Utc};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::schema::rooms;

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
}

/// Room model representing a hotel room
#[derive(Debug, Clone, Queryable, Identifiable, Selectable, Serialize)]
#[diesel(table_name = rooms)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Room {
    pub id: Uuid,
    pub number: String,
    pub room_type: RoomType,
    pub status: RoomStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// New room for insertion
#[derive(Debug, Insertable)]
#[diesel(table_name = rooms)]
pub struct NewRoom<'a> {
    pub number: &'a str,
    pub room_type: RoomType,
}

/// Room update changeset
#[derive(Debug, AsChangeset, Default)]
#[diesel(table_name = rooms)]
pub struct UpdateRoom {
    pub room_type: Option<RoomType>,
    pub status: Option<RoomStatus>,
}

impl RoomStatus {
    /// Check if transition to new status is valid
    pub fn can_transition_to(&self, new_status: RoomStatus) -> bool {
        match (self, new_status) {
            // Available can go to occupied (check-in) or maintenance
            (RoomStatus::Available, RoomStatus::Occupied) => true,
            (RoomStatus::Available, RoomStatus::Maintenance) => true,
            // Occupied can only go to available (check-out)
            (RoomStatus::Occupied, RoomStatus::Available) => true,
            // Maintenance can only go to available
            (RoomStatus::Maintenance, RoomStatus::Available) => true,
            // Same status is always valid (no-op)
            (a, b) if *a == b => true,
            // All other transitions are invalid
            _ => false,
        }
    }
}
