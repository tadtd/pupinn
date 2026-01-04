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
use crate::models::{UpdateUser, User, UserRole};
use crate::services::AuthService;
use crate::utils::{validate_email, validate_username};

/// Employee list query parameters
#[derive(Debug, Deserialize)]
pub struct ListEmployeesQuery {
    pub page: Option<u64>,
    pub per_page: Option<u64>,
    pub role: Option<UserRole>,
    pub search: Option<String>,
    pub include_deactivated: Option<bool>,
}

/// Employee list response
#[derive(Debug, Serialize)]
pub struct EmployeeListResponse {
    pub employees: Vec<EmployeeResponse>,
    pub total: u64,
    pub page: u64,
    pub per_page: u64,
}

/// Employee response (without sensitive data)
#[derive(Debug, Serialize)]
pub struct EmployeeResponse {
    pub id: Uuid,
    pub username: Option<String>,
    pub role: UserRole,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub deactivated_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl From<User> for EmployeeResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email,
            full_name: user.full_name,
            created_at: user.created_at,
            deactivated_at: user.deactivated_at,
        }
    }
}

/// Create employee request
#[derive(Debug, Deserialize)]
pub struct CreateEmployeeRequest {
    pub username: String,
    pub password: String,
    pub role: UserRole,
    pub email: Option<String>,
    pub full_name: Option<String>,
}

/// Update employee request
#[derive(Debug, Deserialize)]
pub struct UpdateEmployeeRequest {
    pub username: Option<String>,
    pub role: Option<UserRole>,
    pub email: Option<String>,
    pub full_name: Option<String>,
}

/// Reset password request
#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub new_password: String,
}

/// List employees endpoint
/// GET /admin/employees
pub async fn list_employees(
    State(state): State<AppState>,
    Query(query): Query<ListEmployeesQuery>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {

    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());
    let (employees, total) = auth_service.list_employees(
        query.page,
        query.per_page,
        query.role,
        query.search,
        query.include_deactivated,
    )?;

    let page = query.page.unwrap_or(1);
    let per_page = query.per_page.unwrap_or(20).min(100);

    Ok(Json(EmployeeListResponse {
        employees: employees.into_iter().map(EmployeeResponse::from).collect(),
        total,
        page,
        per_page,
    }))
}

/// Get employee by ID endpoint
/// GET /admin/employees/:id
pub async fn get_employee(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {

    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());
    let employee = auth_service.get_employee_by_id(id)?;

    Ok(Json(EmployeeResponse::from(employee)))
}

/// Create employee endpoint
/// POST /admin/employees
pub async fn create_employee(
    State(state): State<AppState>,
    Extension(_auth_user): Extension<AuthUser>,
    Json(request): Json<CreateEmployeeRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Validate role is employee role (not guest)
    if request.role == UserRole::Guest {
        return Err(AppError::ValidationError(
            "Cannot create guest accounts through employee management".to_string(),
        ));
    }

    // Trim and validate username format
    let username = request.username.trim().to_string();
    validate_username(&username)?;

    // Validate email if provided
    if let Some(ref email) = request.email {
        if !email.trim().is_empty() {
            validate_email(email)?;
        }
    }

    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());

    // Use existing create_user method (single admin constraint enforced in AuthService)
    let create_request = crate::services::auth_service::CreateUserRequest {
        username,
        password: request.password,
        role: request.role,
    };

    let user_info = auth_service.create_user(&create_request)?;

    // If email or full_name provided, update them
    if request.email.is_some() || request.full_name.is_some() {
        let update = UpdateUser {
            username: None,
            role: None,
            email: request.email,
            full_name: request.full_name,
            phone: None,
            id_number: None,
            deactivated_at: None,
        };
        auth_service.update_employee(user_info.id, update)?;
    }

    // Return the created employee
    let employee = auth_service.get_employee_by_id(user_info.id)?;
    Ok((StatusCode::CREATED, Json(EmployeeResponse::from(employee))))
}

/// Update employee endpoint
/// PATCH /admin/employees/:id
pub async fn update_employee(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
    Json(request): Json<UpdateEmployeeRequest>,
) -> Result<impl IntoResponse, AppError> {

    // Validate role if provided
    if let Some(role) = request.role {
        if role == UserRole::Guest {
            return Err(AppError::ValidationError(
                "Cannot change employee to guest role".to_string(),
            ));
        }
    }

    // Validate username format if provided
    if let Some(ref username) = request.username {
        validate_username(username)?;
    }

    // Validate email format if provided
    if let Some(ref email) = request.email {
        if !email.trim().is_empty() {
            validate_email(email)?;
        }
    }

    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());

    let update = UpdateUser {
        username: request.username,
        role: request.role,
        email: request.email,
        full_name: request.full_name,
        phone: None,
        id_number: None,
        deactivated_at: None,
    };

    let user_info = auth_service.update_employee(id, update)?;

    // Return updated employee
    let employee = auth_service.get_employee_by_id(user_info.id)?;
    Ok(Json(EmployeeResponse::from(employee)))
}

/// Delete employee endpoint (soft delete)
/// DELETE /admin/employees/:id
pub async fn delete_employee(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {

    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());
    auth_service.delete_employee(id)?;

    Ok(StatusCode::NO_CONTENT)
}

/// Reactivate employee endpoint
/// POST /admin/employees/:id/reactivate
pub async fn reactivate_employee(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {

    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());
    auth_service.reactivate_employee(id)?;

    Ok(StatusCode::NO_CONTENT)
}

/// Reset employee password endpoint
/// POST /admin/employees/:id/reset-password
pub async fn reset_password(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
    Json(request): Json<ResetPasswordRequest>,
) -> Result<impl IntoResponse, AppError> {

    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());
    auth_service.reset_password(id, request.new_password)?;

    Ok(StatusCode::NO_CONTENT)
}

