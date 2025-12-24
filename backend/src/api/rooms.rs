use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use diesel::prelude::*;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::AppState;
use crate::errors::AppError;
use crate::models::{Room, RoomStatus, RoomType};
use crate::services::{BookingService, RoomService};
use crate::api::middleware::AuthUser;
use crate::schema::rooms::dsl as rooms_dsl;

/// Create room request DTO
#[derive(Debug, Deserialize)]
pub struct CreateRoomDto {
    pub number: String,
    pub room_type: RoomType,
}

/// Update room request DTO
#[derive(Debug, Deserialize)]
pub struct UpdateRoomDto {
    pub room_type: Option<RoomType>,
    pub status: Option<RoomStatus>,
}

/// Query parameters for listing rooms
#[derive(Debug, Deserialize)]
pub struct ListRoomsQuery {
    pub status: Option<RoomStatus>,
    pub room_type: Option<RoomType>,
}

/// Query parameters for available rooms
#[derive(Debug, Deserialize)]
pub struct AvailableRoomsQuery {
    pub check_in_date: NaiveDate,
    pub check_out_date: NaiveDate,
    pub room_type: Option<RoomType>,
}

/// Room availability response
#[derive(Debug, Serialize)]
pub struct AvailableRoom {
    #[serde(flatten)]
    pub room: Room,
    pub is_available: bool,
}

/// List all rooms
pub async fn list_rooms(
    State(state): State<AppState>,
    Query(query): Query<ListRoomsQuery>,
) -> Result<impl IntoResponse, AppError> {
    let room_service = RoomService::new(state.pool);
    let rooms = room_service.list_rooms(query.status, query.room_type)?;
    Ok((StatusCode::OK, Json(rooms)))
}

/// Get a single room by ID
pub async fn get_room(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let room_service = RoomService::new(state.pool);
    let room = room_service.get_room_by_id(id)?;
    Ok((StatusCode::OK, Json(room)))
}

/// Create a new room (admin only)
pub async fn create_room(
    State(state): State<AppState>,
    Json(payload): Json<CreateRoomDto>,
) -> Result<impl IntoResponse, AppError> {
    let room_service = RoomService::new(state.pool);
    let room = room_service.create_room(&payload.number, payload.room_type)?;
    Ok((StatusCode::CREATED, Json(room)))
}

/// Update a room
pub async fn update_room(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateRoomDto>,
) -> Result<impl IntoResponse, AppError> {
    let room_service = RoomService::new(state.pool);
    let room = room_service.update_room(id, payload.room_type, payload.status)?;
    Ok((StatusCode::OK, Json(room)))
}

/// Get available rooms for a date range
pub async fn available_rooms(
    State(state): State<AppState>,
    Query(query): Query<AvailableRoomsQuery>,
) -> Result<impl IntoResponse, AppError> {
    let room_service = RoomService::new(state.pool.clone());
    let booking_service = BookingService::new(state.pool);

    // Get all rooms (optionally filtered by type)
    let rooms = room_service.list_rooms(None, query.room_type)?;

    // Check availability for each room
    let mut available_rooms: Vec<AvailableRoom> = Vec::new();
    for room in rooms {
        // Business rule for booking:
        // - Only rooms with status `Available` can be considered bookable
        // - Any other status (Occupied, Dirty, Maintenance, Cleaning) is treated as unavailable
        let status_unavailable = !matches!(room.status, RoomStatus::Available);

        if status_unavailable {
            available_rooms.push(AvailableRoom {
                room,
                is_available: false,
            });
            continue;
        }

        // For rooms that are currently Available, check booking availability
        let is_available = booking_service.check_availability(
            room.id,
            query.check_in_date,
            query.check_out_date,
            None,
        )?;

        available_rooms.push(AvailableRoom { room, is_available });
    }

    Ok((StatusCode::OK, Json(available_rooms)))
}

/// Query parameters for cleaner room listing
#[derive(Debug, Deserialize)]
pub struct CleanerRoomsQuery {
    pub status: Option<RoomStatus>,
    pub room_type: Option<RoomType>,
}

/// Update room status request for cleaner
#[derive(Debug, Deserialize)]
pub struct UpdateRoomStatusRequest {
    pub status: RoomStatus,
}

/// List rooms for cleaner dashboard
/// Defaults to showing dirty rooms if no status filter is provided
pub async fn list_cleaner_rooms(
    State(state): State<AppState>,
    Query(query): Query<CleanerRoomsQuery>,
) -> Result<impl IntoResponse, AppError> {
    let room_service = RoomService::new(state.pool);
    // Default to dirty rooms if no status filter is provided
    let status_filter = query.status.or(Some(RoomStatus::Dirty));
    let rooms = room_service.list_rooms(status_filter, query.room_type)?;
    Ok((StatusCode::OK, Json(rooms)))
}

/// Update room status (cleaner endpoint)
/// Cleaners can transition rooms: Dirty → Cleaning → Available
/// Cleaners cannot set room status to Occupied or Maintenance
pub async fn update_cleaner_room_status(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(auth_user): Extension<AuthUser>,
    Json(payload): Json<UpdateRoomStatusRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Role-based validation: cleaners cannot set status to Occupied or Maintenance
    if !payload.status.is_allowed_for_role(auth_user.role) {
        return Err(AppError::Forbidden(format!(
            "Cleaners cannot set room status to {:?}. Allowed statuses: dirty, cleaning, available.",
            payload.status
        )));
    }

    let room_service = RoomService::new(state.pool.clone());

    // Get current room to validate transition
    let current_room = room_service.get_room_by_id(id)?;

    // Validate status transition
    if !current_room.status.can_transition_to(payload.status) {
        return Err(AppError::InvalidStatusTransition(format!(
            "Cannot transition room from {:?} to {:?}",
            current_room.status, payload.status
        )));
    }

    // Optimistic concurrency: only update if status hasn't changed since we read it
    let mut conn = state
        .pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let rows_updated = diesel::update(
        rooms_dsl::rooms
            .filter(rooms_dsl::id.eq(id))
            .filter(rooms_dsl::status.eq(current_room.status)),
    )
    .set(rooms_dsl::status.eq(payload.status))
    .execute(&mut conn)
    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    if rows_updated == 0 {
        return Err(AppError::Conflict(
            "Room status was updated by someone else. Please refresh and try again."
                .to_string(),
        ));
    }

    let updated_room = room_service.get_room_by_id(id)?;
    Ok((StatusCode::OK, Json(updated_room)))
}

