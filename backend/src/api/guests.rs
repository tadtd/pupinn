use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::{middleware::AuthUser, AppState};
use crate::errors::AppError;
use crate::models::{BookingWithRoom, GuestNote, UpdateUser, User};
use crate::services::GuestService;
use crate::utils::{validate_email, validate_phone, validate_search_query};

/// Guest search query parameters
#[derive(Debug, Deserialize)]
pub struct SearchGuestsQuery {
    pub q: String, // Search query
}

/// Guest search response
#[derive(Debug, Serialize)]
pub struct GuestSearchResponse {
    pub guests: Vec<GuestResponse>,
}

/// Guest response with full PII
#[derive(Debug, Serialize)]
pub struct GuestResponse {
    pub id: Uuid,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub phone: Option<String>,
    pub id_number: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<User> for GuestResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            id_number: user.id_number,
            created_at: user.created_at,
        }
    }
}

/// Guest profile response with booking history
/// This includes the full BookingWithRoom struct (so the frontend sees the Price)
#[derive(Debug, Serialize)]
pub struct GuestProfileResponse {
    pub guest: GuestResponse,
    pub booking_history: Vec<BookingWithRoom>,
}

/// Update guest request
#[derive(Debug, Deserialize)]
pub struct UpdateGuestRequest {
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub phone: Option<String>,
    pub id_number: Option<String>,
}

/// Guest note response
#[derive(Debug, Serialize)]
pub struct GuestNoteResponse {
    pub id: Uuid,
    pub guest_id: Uuid,
    pub admin_id: Uuid,
    pub note: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<GuestNote> for GuestNoteResponse {
    fn from(note: GuestNote) -> Self {
        Self {
            id: note.id,
            guest_id: note.guest_id,
            admin_id: note.admin_id,
            note: note.note,
            created_at: note.created_at,
            updated_at: note.updated_at,
        }
    }
}

/// Add guest note request
#[derive(Debug, Deserialize)]
pub struct AddGuestNoteRequest {
    pub note: String,
}

// ---------------- HANDLERS ----------------

/// Search for guests
/// GET /admin/guests/search?q=query
pub async fn search_guests(
    State(state): State<AppState>,
    Query(query): Query<SearchGuestsQuery>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    // Validate search query
    validate_search_query(&query.q)?;

    let guest_service = GuestService::new(state.pool.clone());
    let guests = guest_service.search_guests(&query.q)?;

    // Handle empty results gracefully
    if guests.is_empty() {
        return Ok(Json(GuestSearchResponse { guests: vec![] }));
    }

    Ok(Json(GuestSearchResponse {
        guests: guests.into_iter().map(GuestResponse::from).collect(),
    }))
}

/// Get full guest profile with PII and booking history
/// GET /admin/guests/:guestId
pub async fn get_guest_profile(
    State(state): State<AppState>,
    Path(guest_id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let guest_service = GuestService::new(state.pool.clone());
    
    // Fetch guest details
    let guest = guest_service.get_guest_profile(guest_id)?;
    
    // Fetch booking history (Calls BookingService internally to get Rooms + Prices)
    let booking_history = guest_service.get_guest_booking_history(guest_id)?;

    Ok(Json(GuestProfileResponse {
        guest: GuestResponse::from(guest),
        booking_history,
    }))
}

/// Update guest information
/// PATCH /admin/guests/:guestId
pub async fn update_guest(
    State(state): State<AppState>,
    Path(guest_id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
    Json(request): Json<UpdateGuestRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Validate email format if provided
    if let Some(ref email) = request.email {
        if !email.trim().is_empty() {
            validate_email(email)?;
        }
    }

    // Validate phone format if provided
    if let Some(ref phone) = request.phone {
        if !phone.trim().is_empty() {
            validate_phone(phone)?;
        }
    }

    let guest_service = GuestService::new(state.pool.clone());

    let update = UpdateUser {
        username: None, 
        role: None,     
        email: request.email,
        full_name: request.full_name,
        phone: request.phone,
        id_number: request.id_number,
        deactivated_at: None,
    };

    let updated_guest = guest_service.update_guest(guest_id, update)?;

    Ok(Json(GuestResponse::from(updated_guest)))
}

/// Get all interaction notes for a guest
/// GET /admin/guests/:guestId/notes
pub async fn get_guest_notes(
    State(state): State<AppState>,
    Path(guest_id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let guest_service = GuestService::new(state.pool.clone());
    let notes = guest_service.get_guest_notes(guest_id)?;

    Ok(Json(
        notes
            .into_iter()
            .map(GuestNoteResponse::from)
            .collect::<Vec<_>>(),
    ))
}

/// Add an interaction note for a guest
/// POST /admin/guests/:guestId/notes
pub async fn add_guest_note(
    State(state): State<AppState>,
    Path(guest_id): Path<Uuid>,
    Extension(auth_user): Extension<AuthUser>,
    Json(request): Json<AddGuestNoteRequest>,
) -> Result<impl IntoResponse, AppError> {
    let guest_service = GuestService::new(state.pool.clone());
    
    // Record the note using the admin's ID
    let note = guest_service.add_guest_note(guest_id, auth_user.user_id, &request.note)?;

    Ok((StatusCode::CREATED, Json(GuestNoteResponse::from(note))))
}