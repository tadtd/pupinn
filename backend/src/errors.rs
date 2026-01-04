use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

/// Unified error type for the application
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Room unavailable: {0}")]
    RoomUnavailable(String),

    #[error("Duplicate room: {0}")]
    DuplicateRoom(String),

    #[error("Invalid status transition: {0}")]
    InvalidStatusTransition(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Internal server error: {0}")]
    InternalError(String),
}

/// Error response body sent to clients
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::ValidationError(msg) => {
                (StatusCode::BAD_REQUEST, "VALIDATION_ERROR", msg.clone())
            }
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", msg.clone()),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, "FORBIDDEN", msg.clone()),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND", msg.clone()),
            AppError::RoomUnavailable(msg) => {
                (StatusCode::CONFLICT, "ROOM_UNAVAILABLE", msg.clone())
            }
            AppError::DuplicateRoom(msg) => (StatusCode::CONFLICT, "DUPLICATE_ROOM", msg.clone()),
            AppError::InvalidStatusTransition(msg) => (
                StatusCode::CONFLICT,
                "INVALID_STATUS_TRANSITION",
                msg.clone(),
            ),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, "CONFLICT", msg.clone()),
            AppError::DatabaseError(msg) => {
                tracing::error!("Database error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "DATABASE_ERROR",
                    "A database error occurred".to_string(),
                )
            }
            AppError::InternalError(msg) => {
                tracing::error!("Internal error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "An internal error occurred".to_string(),
                )
            }
        };

        let body = Json(ErrorResponse {
            code: code.to_string(),
            message,
        });

        (status, body).into_response()
    }
}

impl From<diesel::result::Error> for AppError {
    fn from(err: diesel::result::Error) -> Self {
        match err {
            diesel::result::Error::NotFound => {
                AppError::NotFound("Resource not found".to_string())
            }
            diesel::result::Error::DatabaseError(_kind, info) => {
                // If we wrapped an AppError earlier into a DatabaseError via
                // `app_error_to_diesel`, the original AppError's Display text
                // is available in `info.message()`. Try to map it back to the
                // correct AppError variant so the HTTP response code is preserved.
                let msg = info.message().to_string();

                if let Some(rest) = msg.strip_prefix("Validation error: ") {
                    return AppError::ValidationError(rest.to_string());
                }
                if let Some(rest) = msg.strip_prefix("Invalid status-+ transition: ") {
                    return AppError::InvalidStatusTransition(rest.to_string());
                }
                if let Some(rest) = msg.strip_prefix("Room unavailable: ") {
                    return AppError::RoomUnavailable(rest.to_string());
                }
                if let Some(rest) = msg.strip_prefix("Conflict: ") {
                    return AppError::Conflict(rest.to_string());
                }

                AppError::DatabaseError(msg)
            }
            _ => AppError::DatabaseError(err.to_string()),
        }
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        AppError::Unauthorized(format!("Invalid token: {}", err))
    }
}

impl From<argon2::password_hash::Error> for AppError {
    fn from(err: argon2::password_hash::Error) -> Self {
        AppError::InternalError(format!("Password hashing error: {}", err))
    }
}

/// Result type alias for AppError
pub type AppResult<T> = Result<T, AppError>;
