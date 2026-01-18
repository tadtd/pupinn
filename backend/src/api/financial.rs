use axum::{
    extract::{Extension, Path, Query, State},
    response::IntoResponse,
    Json,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::{middleware::AuthUser, AppState};
use crate::errors::AppError;
use crate::services::{BookingService, RoomService};
use crate::utils::validate_date_format;

/// Date range query parameters
#[derive(Debug, Deserialize)]
pub struct DateRangeQuery {
    pub start_date: Option<String>, // YYYY-MM-DD format
    pub end_date: Option<String>,   // YYYY-MM-DD format
    #[serde(default)]
    pub use_payments: Option<bool>, // Use actual payments instead of booking prices
}

/// Room financial summary response
#[derive(Debug, Serialize)]
pub struct RoomFinancialSummary {
    pub room: RoomSummary,
    pub financials: RoomFinancialsResponse,
}

/// Room summary
#[derive(Debug, Serialize)]
pub struct RoomSummary {
    pub id: Uuid,
    pub number: String,
    pub room_type: String,
    pub status: String,
}

/// Financial metrics response
#[derive(Debug, Serialize)]
pub struct RoomFinancialsResponse {
    pub total_revenue: String, // Decimal as string for JSON
    pub booking_count: i64,
    pub average_revenue: Option<String>,
    pub occupancy_rate: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from_payments: Option<bool>, // Indicates if revenue is from actual payments
}

impl From<crate::services::RoomFinancials> for RoomFinancialsResponse {
    fn from(financials: crate::services::RoomFinancials) -> Self {
        Self {
            total_revenue: financials.total_revenue.to_string(),
            booking_count: financials.booking_count,
            average_revenue: financials.average_revenue.map(|v| v.to_string()),
            occupancy_rate: financials.occupancy_rate,
            from_payments: None,
        }
    }
}

/// Helper to create response with payment flag
impl RoomFinancialsResponse {
    pub fn from_financials_with_flag(financials: crate::services::RoomFinancials, from_payments: bool) -> Self {
        Self {
            total_revenue: financials.total_revenue.to_string(),
            booking_count: financials.booking_count,
            average_revenue: financials.average_revenue.map(|v| v.to_string()),
            occupancy_rate: financials.occupancy_rate,
            from_payments: Some(from_payments),
        }
    }
}

/// Compare rooms request
#[derive(Debug, Deserialize)]
pub struct CompareRoomsRequest {
    pub room_ids: Vec<Uuid>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    pub use_payments: Option<bool>, // Use actual payments instead of booking prices
}

/// Compare rooms response
#[derive(Debug, Serialize)]
pub struct CompareRoomsResponse {
    pub rooms: Vec<RoomFinancialSummary>,
}

/// Time-series revenue data point
#[derive(Debug, Serialize)]
pub struct RevenueDataPoint {
    pub date: String, // YYYY-MM-DD format
    pub revenue: String, // Decimal as string
}

/// Revenue time-series response
#[derive(Debug, Serialize)]
pub struct RevenueTimeSeriesResponse {
    pub data: Vec<RevenueDataPoint>,
}

/// List all rooms with financial summary
/// GET /admin/financial/rooms
pub async fn list_rooms_with_financials(
    State(state): State<AppState>,
    Query(query): Query<DateRangeQuery>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool.clone());
    let room_service = RoomService::new(state.pool.clone());

    // Parse date range
    let start_date = query
        .start_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let end_date = query
        .end_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    // Get all rooms
    let rooms = room_service.list_rooms(None, None)?;

    // Calculate financials for each room
    let use_payments = query.use_payments.unwrap_or(false);
    let mut summaries = Vec::new();
    for room in rooms {
        let financials = booking_service.calculate_room_financials_with_payments(
            room.id,
            start_date,
            end_date,
            use_payments,
        )?;

        summaries.push(RoomFinancialSummary {
            room: RoomSummary {
                id: room.id,
                number: room.number,
                room_type: format!("{:?}", room.room_type),
                status: format!("{:?}", room.status),
            },
            financials: financials.into(),
        });
    }

    Ok(Json(summaries))
}

/// Get detailed financial report for a specific room
/// GET /admin/financial/rooms/:roomId
pub async fn get_room_financials(
    State(state): State<AppState>,
    Path(room_id): Path<Uuid>,
    Query(query): Query<DateRangeQuery>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    // Validate date formats if provided
    if let Some(ref start_date) = query.start_date {
        if !start_date.trim().is_empty() {
            validate_date_format(start_date)?;
        }
    }
    if let Some(ref end_date) = query.end_date {
        if !end_date.trim().is_empty() {
            validate_date_format(end_date)?;
        }
    }

    let room_service = RoomService::new(state.pool.clone());
    let booking_service = BookingService::new(state.pool.clone());
    
    // Verify room exists
    let room = room_service.get_room_by_id(room_id)?;

    // Parse date range
    let start_date = query
        .start_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let end_date = query
        .end_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    // Validate date range if both dates provided
    if let (Some(start), Some(end)) = (start_date, end_date) {
        if start > end {
            return Err(AppError::ValidationError(
                "Start date must be before or equal to end date".to_string(),
            ));
        }
    }

    // Calculate financials
    let use_payments = query.use_payments.unwrap_or(false);
    let financials = booking_service.calculate_room_financials_with_payments(
        room_id,
        start_date,
        end_date,
        use_payments,
    )?;

    Ok(Json(RoomFinancialSummary {
        room: RoomSummary {
            id: room.id,
            number: room.number,
            room_type: format!("{:?}", room.room_type),
            status: format!("{:?}", room.status),
        },
        financials: RoomFinancialsResponse::from_financials_with_flag(financials, use_payments),
    }))
}

/// Compare multiple rooms
/// POST /admin/financial/rooms/compare
pub async fn compare_rooms(
    State(state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Json(request): Json<CompareRoomsRequest>,
) -> Result<impl IntoResponse, AppError> {
    if request.room_ids.is_empty() {
        return Err(AppError::ValidationError(
            "At least one room ID is required".to_string(),
        ));
    }

    let booking_service = BookingService::new(state.pool.clone());
    let room_service = RoomService::new(state.pool.clone());

    // Parse date range
    let start_date = request
        .start_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let end_date = request
        .end_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    // Validate date range if both dates provided
    if let (Some(start), Some(end)) = (start_date, end_date) {
        if start > end {
            return Err(AppError::ValidationError(
                "Start date must be before or equal to end date".to_string(),
            ));
        }
    }

    // Get rooms and calculate financials
    let mut summaries = Vec::new();
    for room_id in request.room_ids {
        // Verify room exists
        let room = room_service.get_room_by_id(room_id)?;

        let use_payments = request.start_date.as_ref().and_then(|_| Some(false))
            .or_else(|| request.end_date.as_ref().and_then(|_| Some(false)))
            .unwrap_or(false);
        let financials = booking_service.calculate_room_financials_with_payments(
            room_id,
            start_date,
            end_date,
            use_payments,
        )?;

        summaries.push(RoomFinancialSummary {
            room: RoomSummary {
                id: room.id,
                number: room.number,
                room_type: format!("{:?}", room.room_type),
                status: format!("{:?}", room.status),
            },
            financials: financials.into(),
        });
    }

    Ok(Json(CompareRoomsResponse { rooms: summaries }))
}

/// Get revenue time-series data
/// GET /admin/financial/revenue/time-series
pub async fn get_revenue_time_series(
    State(state): State<AppState>,
    Query(query): Query<DateRangeQuery>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool.clone());

    // Parse date range
    let start_date = query
        .start_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let end_date = query
        .end_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    // Get time-series data for all rooms (room_id = None)
    let time_series = booking_service.get_revenue_time_series(None, start_date, end_date)?;

    let data: Vec<RevenueDataPoint> = time_series
        .into_iter()
        .map(|(date, revenue)| RevenueDataPoint {
            date: date.format("%Y-%m-%d").to_string(),
            revenue: revenue.to_string(),
        })
        .collect();

    Ok(Json(RevenueTimeSeriesResponse { data }))
}

/// Get revenue time-series data for a specific room
/// GET /admin/financial/rooms/:roomId/revenue/time-series
pub async fn get_room_revenue_time_series(
    State(state): State<AppState>,
    Path(room_id): Path<Uuid>,
    Query(query): Query<DateRangeQuery>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool.clone());
    let room_service = RoomService::new(state.pool.clone());

    // Verify room exists
    room_service.get_room_by_id(room_id)?;

    // Parse date range
    let start_date = query
        .start_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let end_date = query
        .end_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    // Get time-series data for the room
    let time_series = booking_service.get_revenue_time_series(Some(room_id), start_date, end_date)?;

    let data: Vec<RevenueDataPoint> = time_series
        .into_iter()
        .map(|(date, revenue)| RevenueDataPoint {
            date: date.format("%Y-%m-%d").to_string(),
            revenue: revenue.to_string(),
        })
        .collect();

    Ok(Json(RevenueTimeSeriesResponse { data }))
}

/// Get booking history for a specific room
/// GET /admin/financial/rooms/:roomId/bookings
pub async fn get_room_booking_history(
    State(state): State<AppState>,
    Path(room_id): Path<Uuid>,
    Query(query): Query<DateRangeQuery>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let booking_service = BookingService::new(state.pool.clone());
    let room_service = RoomService::new(state.pool.clone());

    // Verify room exists
    room_service.get_room_by_id(room_id)?;

    // Parse date range
    let start_date = query
        .start_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let end_date = query
        .end_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    // Get booking history
    let bookings = booking_service.get_room_booking_history(room_id, start_date, end_date)?;

    Ok(Json(bookings))
}
