//! Guest booking API handlers
//!
//! Handles guest booking creation, listing, and cancellation.
//! All endpoints require guest authentication.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::middleware::AuthUser;
use crate::api::AppState;
use crate::errors::AppError;
use crate::models::{BookingStatus, BookingWithRoom, GuestInfo};
use crate::services::{AuthService, BookingService};

/// Request body for creating a guest booking
#[derive(Debug, Deserialize)]
pub struct CreateGuestBookingRequest {
    pub room_id: Uuid,
    pub check_in_date: NaiveDate,
    pub check_out_date: NaiveDate,
    #[serde(default)]
    pub price: Option<bigdecimal::BigDecimal>,
}

/// Query parameters for listing bookings
#[derive(Debug, Deserialize)]
pub struct ListBookingsQuery {
    pub status: Option<String>,
}

/// Response for booking cancellation
#[derive(Debug, Serialize)]
pub struct CancelBookingResponse {
    pub id: Uuid,
    pub reference: String,
    pub status: String,
    pub message: String,
}

/// POST /guest/bookings - Create a new booking for the authenticated guest
///
/// Creates a booking using the guest's account information.
/// The guest's full name is automatically used as the booking guest name.
///
/// # Request Body
/// ```json
/// {
///   "room_id": "uuid",
///   "check_in_date": "2025-12-15",
///   "check_out_date": "2025-12-18"
/// }
/// ```
///
/// # Response (201 Created)
/// Returns the created booking with room details.
///
/// # Errors
/// - 400 Bad Request: Invalid dates or room under maintenance
/// - 404 Not Found: Room not found
/// - 409 Conflict: Room not available for selected dates
pub async fn create_booking(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(request): Json<CreateGuestBookingRequest>,
) -> Result<(StatusCode, Json<BookingWithRoom>), AppError> {
    // Get guest info to use their name
    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());
    let guest_info: GuestInfo = auth_service.get_guest_by_id(auth_user.user_id)?;

    // Create the booking
    let booking_service = BookingService::new(state.pool.clone());
    let booking = booking_service.create_guest_booking(
        auth_user.user_id,
        &guest_info.full_name,
        request.room_id,
        request.check_in_date,
        request.check_out_date,
        request.price,
    )?;

    Ok((StatusCode::CREATED, Json(booking)))
}

/// GET /guest/bookings - List all bookings for the authenticated guest
///
/// Returns bookings created by the current guest user.
///
/// # Query Parameters
/// - `status`: Optional filter (upcoming, checked_in, checked_out, cancelled)
///
/// # Response (200 OK)
/// Returns an array of bookings with room details.
pub async fn list_bookings(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ListBookingsQuery>,
) -> Result<Json<Vec<BookingWithRoom>>, AppError> {
    let booking_service = BookingService::new(state.pool.clone());

    // Parse status filter
    let status_filter = query.status.as_ref().and_then(|s| match s.as_str() {
        "upcoming" => Some(BookingStatus::Upcoming),
        "checked_in" => Some(BookingStatus::CheckedIn),
        "checked_out" => Some(BookingStatus::CheckedOut),
        "cancelled" => Some(BookingStatus::Cancelled),
        _ => None,
    });

    let bookings = booking_service.list_bookings_by_user(auth_user.user_id, status_filter)?;

    Ok(Json(bookings))
}

/// GET /guest/bookings/:id - Get a specific booking
///
/// Returns the booking only if it belongs to the authenticated guest.
///
/// # Path Parameters
/// - `id`: Booking UUID
///
/// # Response (200 OK)
/// Returns the booking with room details.
///
/// # Errors
/// - 404 Not Found: Booking not found or not owned by user
pub async fn get_booking(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(booking_id): Path<Uuid>,
) -> Result<Json<BookingWithRoom>, AppError> {
    let booking_service = BookingService::new(state.pool.clone());
    let booking = booking_service.get_guest_booking(booking_id, auth_user.user_id)?;

    Ok(Json(booking))
}

/// POST /guest/bookings/:id/cancel - Cancel an upcoming booking
///
/// Cancels the booking only if:
/// - It belongs to the authenticated guest
/// - It has status "upcoming"
///
/// # Path Parameters
/// - `id`: Booking UUID
///
/// # Response (200 OK)
/// ```json
/// {
///   "id": "uuid",
///   "reference": "BK-XXXXXXXX-XXXX",
///   "status": "cancelled",
///   "message": "Booking cancelled successfully"
/// }
/// ```
///
/// # Errors
/// - 400 Bad Request: Booking cannot be cancelled (not upcoming)
/// - 404 Not Found: Booking not found or not owned by user
pub async fn cancel_booking(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(booking_id): Path<Uuid>,
) -> Result<Json<CancelBookingResponse>, AppError> {
    let booking_service = BookingService::new(state.pool.clone());
    let booking = booking_service.cancel_guest_booking(booking_id, auth_user.user_id)?;

    Ok(Json(CancelBookingResponse {
        id: booking.id,
        reference: booking.reference,
        status: "cancelled".to_string(),
        message: "Booking cancelled successfully".to_string(),
    }))
}

