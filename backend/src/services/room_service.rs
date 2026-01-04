use diesel::prelude::*;
use bigdecimal::BigDecimal;
use std::str::FromStr;
use uuid::Uuid;

use crate::db::DbPool;
use crate::errors::{AppError, AppResult};
use crate::models::{NewRoom, Room, RoomStatus, RoomType, UpdateRoom};
use crate::schema::rooms;

/// Room service for managing hotel rooms
pub struct RoomService {
    pool: DbPool,
}

impl RoomService {
    /// Create a new RoomService instance
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    /// Create a new room
    pub fn create_room(&self, number: &str, room_type: RoomType) -> AppResult<Room> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Check for duplicate room number
        let existing: Option<Room> = rooms::table
            .filter(rooms::number.eq(number))
            .first(&mut conn)
            .optional()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        if existing.is_some() {
            return Err(AppError::DuplicateRoom(format!(
                "Room number '{}' already exists",
                number
            )));
        }

        // Set default price based on room type
        // Default prices in VND (no fractional VND amounts)
        let price = match room_type {
            RoomType::Single => BigDecimal::from_str("1000000").unwrap(),
            RoomType::Double => BigDecimal::from_str("1500000").unwrap(),
            RoomType::Suite => BigDecimal::from_str("2500000").unwrap(),
        };

        let new_room = NewRoom { number, room_type, price };

        diesel::insert_into(rooms::table)
            .values(&new_room)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))
    }

    /// Get a room by ID
    pub fn get_room_by_id(&self, room_id: Uuid) -> AppResult<Room> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        rooms::table
            .find(room_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Room with ID '{}' not found", room_id)))
    }

    /// Get a room by number
    #[allow(dead_code)]
    pub fn get_room_by_number(&self, number: &str) -> AppResult<Room> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        rooms::table
            .filter(rooms::number.eq(number))
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Room '{}' not found", number)))
    }

    /// List all rooms with optional filters
    pub fn list_rooms(
        &self,
        status_filter: Option<RoomStatus>,
        type_filter: Option<RoomType>,
    ) -> AppResult<Vec<Room>> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let mut query = rooms::table.into_boxed();

        if let Some(status) = status_filter {
            query = query.filter(rooms::status.eq(status));
        }

        if let Some(room_type) = type_filter {
            query = query.filter(rooms::room_type.eq(room_type));
        }

        query
            .order(rooms::number.asc())
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))
    }

    /// Update a room
    pub fn update_room(
        &self,
        room_id: Uuid,
        room_type: Option<RoomType>,
        status: Option<RoomStatus>,
    ) -> AppResult<Room> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Get current room
        let current: Room = rooms::table
            .find(room_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Room with ID '{}' not found", room_id)))?;

        // Validate status transition if status is being changed
        if let Some(new_status) = status {
            // Special business rule: Occupied -> Available must still go through the
            // controlled check-out flow, not a direct room edit.
            if current.status == RoomStatus::Occupied && new_status == RoomStatus::Available {
                return Err(AppError::InvalidStatusTransition(
                    "Occupied rooms can only be set to available via guest check-out.".into(),
                ));
            }

            // Admin override: allow setting a room to Dirty from any status.
            // This lets staff mark a room as dirty even if it's currently maintenance,
            // occupied, cleaning, etc.
            if new_status != RoomStatus::Dirty {
                // For all other statuses, fall back to normal transition rules.
                if !current.status.can_transition_to(new_status) {
                    return Err(AppError::InvalidStatusTransition(format!(
                        "Cannot transition room from {:?} to {:?}",
                        current.status, new_status
                    )));
                }
            }
        }

        let update = UpdateRoom {
            room_type,
            status,
            price: None,
        };

        diesel::update(rooms::table.find(room_id))
            .set(&update)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))
    }

    /// Update room status (internal use for check-in/out)
    ///
    /// This bypasses the UI restriction that prevents editing an occupied room
    /// directly to available; that transition is allowed here as part of the
    /// controlled check-out flow.
    pub fn update_room_status(&self, room_id: Uuid, status: RoomStatus) -> AppResult<Room> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let current: Room = rooms::table
            .find(room_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Room with ID '{}' not found", room_id)))?;

        if !current.status.can_transition_to(status) {
            return Err(AppError::InvalidStatusTransition(format!(
                "Cannot transition room from {:?} to {:?}",
                current.status, status
            )));
        }

        diesel::update(rooms::table.find(room_id))
            .set(rooms::status.eq(status))
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))
    }
}
