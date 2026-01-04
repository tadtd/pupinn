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
use crate::models::BookingStatus;
use crate::services::BookingService;

/// Create booking request DTO
#[derive(Debug, Deserialize)]
pub struct CreateBookingDto {
    pub guest_name: String,
    pub room_id: Uuid,
    pub check_in_date: NaiveDate,
    pub check_out_date: NaiveDate,
    #[serde(default)]
    pub price: Option<bigdecimal::BigDecimal>,
}

/// Update booking request DTO
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct UpdateBookingDto {
    pub guest_name: Option<String>,
    pub check_in_date: Option<NaiveDate>,
    pub check_out_date: Option<NaiveDate>,
}

/// Check-in request DTO
#[derive(Debug, Deserialize)]
pub struct CheckInDto {
    #[serde(default)]
    pub confirm_early: bool,
}

/// Query parameters for listing bookings
#[derive(Debug, Deserialize)]
pub struct ListBookingsQuery {
    pub status: Option<BookingStatus>,
    pub guest_name: Option<String>,
    pub from_date: Option<NaiveDate>,
    pub to_date: Option<NaiveDate>,
}

/// Create a new booking
pub async fn create_booking(
    State(state): State<AppState>,
    Json(payload): Json<CreateBookingDto>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool);
    let booking = booking_service.create_booking(
        &payload.guest_name,
        payload.room_id,
        payload.check_in_date,
        payload.check_out_date,
        payload.price,
    )?;
    Ok((StatusCode::CREATED, Json(booking)))
}

/// List bookings with optional filters
pub async fn list_bookings(
    State(state): State<AppState>,
    Query(query): Query<ListBookingsQuery>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool.clone());
    
    // Auto-update statuses based on today's date before fetching the list
    let mut conn = state.pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;
    booking_service.handle_stale_bookings(&mut conn)
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    // let (no_show_count, overstay_count) = booking_service.handle_stale_bookings(&mut conn)
    //     .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let bookings = booking_service.list_bookings(
        query.status, 
        query.guest_name.as_deref(),
        query.from_date, 
        query.to_date
    )?;
    Ok((StatusCode::OK, Json(bookings)))
}

/// Get a booking by ID
pub async fn get_booking(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool);
    let booking = booking_service.get_booking_with_room(id)?;
    Ok((StatusCode::OK, Json(booking)))
}

/// Get a booking by reference
pub async fn get_booking_by_reference(
    State(state): State<AppState>,
    Path(reference): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool);
    let booking = booking_service.get_booking_by_reference(&reference)?;
    Ok((StatusCode::OK, Json(booking)))
}

/// Update a booking
pub async fn update_booking(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateBookingDto>,
) -> Result<impl IntoResponse, AppError> {
    // For MVP, we only allow updating guest_name before check-in
    // Date changes would require re-validation of availability
    let booking_service = BookingService::new(state.pool);
    
    // Get current booking
    let current = booking_service.get_booking_by_id(id)?;
    
    // Only allow updates for upcoming bookings
    if current.status != BookingStatus::Upcoming {
        return Err(AppError::ValidationError(
            "Can only update upcoming bookings".to_string(),
        ));
    }
    
    // For date changes, validate availability
    if payload.check_in_date.is_some() || payload.check_out_date.is_some() {
        let new_check_in = payload.check_in_date.unwrap_or(current.check_in_date);
        let new_check_out = payload.check_out_date.unwrap_or(current.check_out_date);
        
        // Validate dates
        booking_service.validate_dates(new_check_in, new_check_out)?;
        
        // Check availability (excluding current booking)
        if !booking_service.check_availability(current.room_id, new_check_in, new_check_out, Some(id))? {
            return Err(AppError::RoomUnavailable(
                "Room is not available for the selected dates".to_string(),
            ));
        }
    }
    
    // Note: For MVP, we're returning the current booking
    // Full update implementation would use UpdateBooking changeset
    Ok((StatusCode::OK, Json(current)))
}

/// Check in a guest
pub async fn check_in(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CheckInDto>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool);
    let booking = booking_service.check_in(id, payload.confirm_early)?;
    Ok((StatusCode::OK, Json(booking)))
}

/// Check out request DTO
#[derive(Debug, Deserialize)]
pub struct CheckOutDto {
    #[serde(default)]
    pub confirm_early: bool,
}

/// Check out a guest
pub async fn check_out(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CheckOutDto>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool);
    let booking = booking_service.check_out(id, payload.confirm_early)?;
    Ok((StatusCode::OK, Json(booking)))
}

/// Cancel a booking
pub async fn cancel(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool);
    let booking = booking_service.cancel(id)?;
    Ok((StatusCode::OK, Json(booking)))
}

/// Sync booking statuses response
#[derive(Debug, Serialize)]
pub struct SyncBookingStatusesResponse {
    pub message: String,
    pub no_show_count: Option<usize>,
    pub overstay_count: Option<usize>,
}

/// Sync booking statuses
/// 
/// Updates stale bookings:
/// - 'Upcoming' bookings with check_in_date before today → 'NoShow'
/// - 'CheckedIn' bookings with check_out_date before today → 'Overstay'
pub async fn sync_booking_statuses(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool.clone());
    
    let mut conn = state.pool
        .get()
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let (no_show_count, overstay_count) = booking_service
        .handle_stale_bookings(&mut conn)
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    Ok((
        StatusCode::OK,
        Json(SyncBookingStatusesResponse {
            message: "Booking statuses synchronized successfully".to_string(),
            // Remove 'as i32' to match the expected usize type
            no_show_count: Some(no_show_count), 
            overstay_count: Some(overstay_count),
        }),
    ))
}
