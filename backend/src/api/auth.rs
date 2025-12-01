use axum::{extract::State, http::StatusCode, response::IntoResponse, Extension, Json};
use serde::Deserialize;

use crate::api::middleware::AuthUser;
use crate::api::AppState;
use crate::errors::AppError;
use crate::models::{UserInfo, UserRole};
use crate::services::auth_service::{CreateUserRequest, LoginRequest};
use crate::services::AuthService;

/// Login request DTO
#[derive(Debug, Deserialize)]
pub struct LoginDto {
    pub username: String,
    pub password: String,
}

/// Create user request DTO
#[derive(Debug, Deserialize)]
pub struct CreateUserDto {
    pub username: String,
    pub password: String,
    pub role: UserRole,
}

/// Login handler
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginDto>,
) -> Result<impl IntoResponse, AppError> {
    let auth_service = AuthService::new(state.pool, state.jwt_secret);

    let request = LoginRequest {
        username: payload.username,
        password: payload.password,
    };

    let response = auth_service.login(&request)?;

    Ok((StatusCode::OK, Json(response)))
}

/// Get current user handler (requires auth)
pub async fn me(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let auth_service = AuthService::new(state.pool, state.jwt_secret);

    let user = auth_service.get_user_by_id(auth_user.user_id)?;
    let user_info: UserInfo = user.into();

    Ok((StatusCode::OK, Json(user_info)))
}

/// Create user handler (requires admin)
pub async fn create_user(
    State(state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Json(payload): Json<CreateUserDto>,
) -> Result<impl IntoResponse, AppError> {
    let auth_service = AuthService::new(state.pool, state.jwt_secret);

    let request = CreateUserRequest {
        username: payload.username,
        password: payload.password,
        role: payload.role,
    };

    let user_info = auth_service.create_user(&request)?;

    Ok((StatusCode::CREATED, Json(user_info)))
}
