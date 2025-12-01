use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::AppState;
use crate::errors::AppError;
use crate::models::{Room, RoomStatus, RoomType};
use crate::services::{BookingService, RoomService};

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
        // Skip rooms under maintenance
        if room.status == RoomStatus::Maintenance {
            available_rooms.push(AvailableRoom {
                room,
                is_available: false,
            });
            continue;
        }

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

