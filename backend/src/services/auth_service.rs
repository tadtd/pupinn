use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{DateTime, Duration, Utc};
use diesel::prelude::*;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::DbPool;
use crate::errors::{AppError, AppResult};
use crate::models::{GuestInfo, NewGuestUser, NewUser, UpdateUser, User, UserInfo, UserRole};
// We import the users module, but NOT dsl::* to avoid variable name conflicts
use crate::schema::users; 
use crate::schema::users::dsl::*;

/// JWT claims structure
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,        // User ID
    pub role: UserRole,   // User role
    pub exp: i64,         // Expiration timestamp
    pub iat: i64,         // Issued at timestamp
}

/// Login request payload
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

/// Login response payload
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserInfo,
}

/// Create user request payload
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub role: UserRole,
}

/// Guest registration request payload
#[derive(Debug, Deserialize)]
pub struct GuestRegisterRequest {
    pub email: String,
    pub password: String,
    pub full_name: String,
}

/// Guest authentication response payload
#[derive(Debug, Serialize)]
pub struct GuestAuthResponse {
    pub token: String,
    pub user: GuestInfo,
}

/// Guest login request payload
#[derive(Debug, Deserialize)]
pub struct GuestLoginRequest {
    pub email: String,
    pub password: String,
}

/// Authentication service for user management and JWT operations
pub struct AuthService {
    pool: DbPool,
    jwt_secret: String,
    token_expiry_hours: i64,
}

impl AuthService {
    /// Create a new AuthService instance
    pub fn new(pool: DbPool, jwt_secret: String) -> Self {
        Self {
            pool,
            jwt_secret,
            token_expiry_hours: 8, // 8-hour token expiry (single shift)
        }
    }

    /// Hash a password using Argon2id
    pub fn hash_password(password: &str) -> AppResult<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AppError::InternalError(format!("Password hashing failed: {}", e)))?;
        Ok(hash.to_string())
    }

    /// Verify a password against a hash
    pub fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
        let parsed_hash = PasswordHash::new(hash)
            .map_err(|e| AppError::InternalError(format!("Invalid password hash: {}", e)))?;
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }

    /// Generate a JWT token for a user
    pub fn generate_token(&self, user: &User) -> AppResult<String> {
        let now_utc = Utc::now();
        let exp_time = now_utc + Duration::hours(self.token_expiry_hours);

        let claims = Claims {
            sub: user.id,
            role: user.role,
            exp: exp_time.timestamp(),
            iat: now_utc.timestamp(),
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        )
        .map_err(|e| AppError::InternalError(format!("Token generation failed: {}", e)))
    }

    /// Validate and decode a JWT token
    pub fn validate_token(&self, token: &str) -> AppResult<Claims> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_bytes()),
            &Validation::default(),
        )?;
        Ok(token_data.claims)
    }

    /// Login a user with username and password
    pub fn login(&self, request: &LoginRequest) -> AppResult<LoginResponse> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Trim username to handle any whitespace issues
        let username_input = request.username.trim();

        // First, try to find the user
        let user_opt: Option<User> = users::table
            .filter(users::username.eq(&username_input))
            .first(&mut conn)
            .optional()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let user = match user_opt {
            Some(u) => u,
            None => {
                return Err(AppError::Unauthorized("Invalid credentials".to_string()));
            }
        };

        // Check if user is deactivated
        if user.deactivated_at.is_some() {
            return Err(AppError::Unauthorized("Account is deactivated".to_string()));
        }

        // Verify password
        if !Self::verify_password(&request.password, &user.password_hash)? {
            return Err(AppError::Unauthorized("Invalid credentials".to_string()));
        }

        let token = self.generate_token(&user)?;

        Ok(LoginResponse {
            token,
            user: user.into(),
        })
    }

    /// Get user by ID
    pub fn get_user_by_id(&self, user_id: Uuid) -> AppResult<User> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        users::table
            .find(user_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("User not found".to_string()))
    }

    /// Check the count of active admin users
    pub fn check_admin_count(&self) -> AppResult<u64> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let count: i64 = users::table
            .filter(users::role.eq(UserRole::Admin))
            .filter(users::deactivated_at.is_null())
            .count()
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(count as u64)
    }

    /// Validate single admin constraint
    pub fn validate_single_admin_constraint(
        &self,
        new_role: UserRole,
        existing_user_id: Option<Uuid>,
    ) -> AppResult<()> {
        // Only check constraint if trying to create/assign admin role
        if new_role != UserRole::Admin {
            return Ok(());
        }

        let admin_count = self.check_admin_count()?;

        // If updating an existing user, check if they're already an admin
        if let Some(user_id) = existing_user_id {
            let mut conn = self
                .pool
                .get()
                .map_err(|e| AppError::DatabaseError(e.to_string()))?;

            let existing: User = users::table
                .find(user_id)
                .first(&mut conn)
                .map_err(|_| AppError::NotFound("User not found".to_string()))?;

            // If user is already an admin, allow the update (no constraint violation)
            if existing.role == UserRole::Admin {
                return Ok(());
            }
        }

        // If there's already an admin, prevent creating/assigning another one
        if admin_count > 0 {
            return Err(AppError::ValidationError(
                "Only one admin account is allowed in the system. An admin account already exists.".to_string(),
            ));
        }

        Ok(())
    }

    /// Create a new user (admin only)
    pub fn create_user(&self, request: &CreateUserRequest) -> AppResult<UserInfo> {
        // Validate password length
        if request.password.len() < 8 {
            return Err(AppError::ValidationError(
                "Password must be at least 8 characters".to_string(),
            ));
        }

        // Trim and validate username
        let username_input = request.username.trim().to_string();
        
        if username_input.len() < 3 || username_input.len() > 50 {
            return Err(AppError::ValidationError(
                "Username must be between 3 and 50 characters".to_string(),
            ));
        }

        // Validate single admin constraint
        self.validate_single_admin_constraint(request.role, None)?;

        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Check if username already exists
        let existing: Option<User> = users::table
            .filter(users::username.eq(&username_input))
            .first(&mut conn)
            .optional()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        if existing.is_some() {
            return Err(AppError::ValidationError(
                "Username already exists".to_string(),
            ));
        }

        let hashed_password = Self::hash_password(&request.password)?;

        let new_user = NewUser {
            username: Some(&username_input),
            password_hash: &hashed_password,
            role: request.role,
            email: None,
            full_name: None,
            phone: None,
            id_number: None,
        };

        let user: User = diesel::insert_into(users::table)
            .values(&new_user)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Ensure the user is active (deactivated_at should be NULL)
        if user.deactivated_at.is_some() {
            diesel::update(users::table.find(user.id))
                .set(users::deactivated_at.eq(None::<chrono::DateTime<chrono::Utc>>))
                .execute(&mut conn)
                .map_err(|e| AppError::DatabaseError(e.to_string()))?;
            
            // Re-fetch the user to get the updated version
            let updated_user: User = users::table
                .find(user.id)
                .first(&mut conn)
                .map_err(|e| AppError::DatabaseError(e.to_string()))?;
            
            return Ok(updated_user.into());
        }

        Ok(user.into())
    }

    /// Validate password requirements
    pub fn validate_guest_password(password: &str) -> AppResult<()> {
        if password.len() < 8 {
            return Err(AppError::ValidationError(
                "Password must be at least 8 characters".to_string(),
            ));
        }

        let has_letter = password.chars().any(|c| c.is_alphabetic());
        if !has_letter {
            return Err(AppError::ValidationError(
                "Password must contain at least one letter".to_string(),
            ));
        }

        let has_number = password.chars().any(|c| c.is_numeric());
        if !has_number {
            return Err(AppError::ValidationError(
                "Password must contain at least one number".to_string(),
            ));
        }

        Ok(())
    }

    /// Validate email format (basic validation)
    pub fn validate_email(email_input: &str) -> AppResult<()> {
        // Trim whitespace
        let email_trimmed = email_input.trim();

        if email_trimmed.is_empty() {
            return Err(AppError::ValidationError(
                "Email is required".to_string(),
            ));
        }

        // Basic email format validation
        let parts: Vec<&str> = email_trimmed.split('@').collect();
        if parts.len() != 2 {
            return Err(AppError::ValidationError(
                "Invalid email format".to_string(),
            ));
        }

        let local = parts[0];
        let domain = parts[1];

        if local.is_empty() || domain.is_empty() {
            return Err(AppError::ValidationError(
                "Invalid email format".to_string(),
            ));
        }

        if !domain.contains('.') || domain.starts_with('.') || domain.ends_with('.') {
            return Err(AppError::ValidationError(
                "Invalid email format".to_string(),
            ));
        }

        Ok(())
    }

    /// Register a new guest user
    pub fn register_guest(&self, request: &GuestRegisterRequest) -> AppResult<GuestAuthResponse> {
        // Validate email format
        Self::validate_email(&request.email)?;

        // Validate password requirements
        Self::validate_guest_password(&request.password)?;

        // Validate full name
        let full_name_input = request.full_name.trim();
        if full_name_input.is_empty() {
            return Err(AppError::ValidationError(
                "Full name is required".to_string(),
            ));
        }
        if full_name_input.len() > 100 {
            return Err(AppError::ValidationError(
                "Full name must be 100 characters or less".to_string(),
            ));
        }

        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Check if email already exists
        let email_lower = request.email.trim().to_lowercase();
        let existing: Option<User> = users::table
            .filter(users::email.eq(&email_lower))
            .first(&mut conn)
            .optional()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        if existing.is_some() {
            return Err(AppError::Conflict(
                "An account with this email already exists".to_string(),
            ));
        }

        // Hash password
        let hashed_password = Self::hash_password(&request.password)?;

        // Create new guest user
        let new_guest = NewGuestUser {
            email: &email_lower,
            full_name: full_name_input,
            password_hash: &hashed_password,
            role: UserRole::Guest,
            phone: None,
            id_number: None,
        };

        let user: User = diesel::insert_into(users::table)
            .values(&new_guest)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Generate JWT token
        let token = self.generate_token(&user)?;

        // Convert to GuestInfo
        let guest_info = GuestInfo::try_from(user)
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        Ok(GuestAuthResponse {
            token,
            user: guest_info,
        })
    }

    /// Login a guest user with email and password
    pub fn login_guest(&self, request: &GuestLoginRequest) -> AppResult<GuestAuthResponse> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Look up user by email
        let email_lower = request.email.trim().to_lowercase();
        let user: User = users::table
            .filter(users::email.eq(&email_lower))
            .first(&mut conn)
            .map_err(|_| AppError::Unauthorized("Invalid email or password".to_string()))?;

        // Verify password
        if !Self::verify_password(&request.password, &user.password_hash)? {
            return Err(AppError::Unauthorized(
                "Invalid email or password".to_string(),
            ));
        }

        // Ensure user has guest role
        if user.role != UserRole::Guest {
            return Err(AppError::Unauthorized(
                "Invalid email or password".to_string(),
            ));
        }

        // Generate JWT token
        let token = self.generate_token(&user)?;

        // Convert to GuestInfo
        let guest_info = GuestInfo::try_from(user)
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        Ok(GuestAuthResponse {
            token,
            user: guest_info,
        })
    }

    /// Get guest user by ID
    pub fn get_guest_by_id(&self, user_id: Uuid) -> AppResult<GuestInfo> {
        let user = self.get_user_by_id(user_id)?;

        // Verify the user is a guest
        if user.role != UserRole::Guest {
            return Err(AppError::Forbidden(
                "Guest access only".to_string(),
            ));
        }

        GuestInfo::try_from(user).map_err(|e| AppError::InternalError(e.to_string()))
    }

    /// List employees with pagination and filtering
    pub fn list_employees(
        &self,
        page: Option<u64>,
        per_page: Option<u64>,
        role_filter: Option<UserRole>,
        search: Option<String>,
        include_deactivated: Option<bool>,
    ) -> AppResult<(Vec<User>, u64)> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    
        let page = page.unwrap_or(1);
        let per_page = per_page.unwrap_or(20).min(100);
        let offset = (page - 1) * per_page;
    
        // Build query helper
        let pattern = search.as_ref().map(|s| format!("%{}%", s));
        let build_query = || {
            let mut q = users::table
                .into_boxed()
                // Exclude guest users
                .filter(users::role.ne(UserRole::Guest));
    
            // Filter out deactivated users unless requested
            if !include_deactivated.unwrap_or(false) {
                q = q.filter(users::deactivated_at.is_null());
            }

            if let Some(filter_role) = role_filter {
                q = q.filter(users::role.eq(filter_role));
            }
    
            if let Some(ref pattern) = pattern {
                q = q.filter(
                    users::username
                        .ilike(pattern)
                        .or(users::full_name.ilike(pattern)),
                );
            }
    
            q
        };
    
        // Total count
        let total: i64 = build_query()
            .count()
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    
        // Paginated result
        let employees: Vec<User> = build_query()
            .order(users::created_at.desc())
            .limit(per_page as i64)
            .offset(offset as i64)
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    
        Ok((employees, total as u64))
    }
    
    /// Get employee by ID
    pub fn get_employee_by_id(&self, employee_id: Uuid) -> AppResult<User> {
        let user = self.get_user_by_id(employee_id)?;

        if user.role == UserRole::Guest {
            return Err(AppError::Forbidden(
                "Employee access only".to_string(),
            ));
        }

        Ok(user)
    }

    /// Update employee information
    pub fn update_employee(&self, employee_id: Uuid, update: UpdateUser) -> AppResult<UserInfo> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Verify employee exists and is not a guest
        let existing: User = users::table
            .find(employee_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Employee not found".to_string()))?;

        if existing.role == UserRole::Guest {
            return Err(AppError::Forbidden(
                "Cannot update guest accounts through employee management".to_string(),
            ));
        }

        // Validate username if provided
        if let Some(ref username_input) = update.username {
            if username_input.len() < 3 || username_input.len() > 50 {
                return Err(AppError::ValidationError(
                    "Username must be between 3 and 50 characters".to_string(),
                ));
            }

            // Check if username is already taken by another user
            let existing_username: Option<User> = users::table
                .filter(users::username.eq(username_input))
                .filter(users::id.ne(employee_id))
                .first(&mut conn)
                .optional()
                .map_err(|e| AppError::DatabaseError(e.to_string()))?;

            if existing_username.is_some() {
                return Err(AppError::ValidationError(
                    "Username already exists".to_string(),
                ));
            }
        }

        // Validate single admin constraint if role is being changed to admin
        if let Some(new_role) = update.role {
            self.validate_single_admin_constraint(new_role, Some(employee_id))?;
        }

        // Update user
        let updated_user: User = diesel::update(users::table.find(employee_id))
            .set(&update)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(updated_user.into())
    }

    /// Check if an admin can be deleted
    pub fn check_can_delete_admin(&self, admin_id: Uuid) -> AppResult<()> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Verify user exists and is an admin
        let user: User = users::table
            .find(admin_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Employee not found".to_string()))?;

        if user.role != UserRole::Admin {
            return Ok(());
        }

        // Check if this is the only active admin
        let admin_count = self.check_admin_count()?;

        if admin_count <= 1 {
            return Err(AppError::Forbidden(
                "Cannot delete the last admin account. The system must have at least one active admin account.".to_string(),
            ));
        }

        Ok(())
    }

    /// Delete (soft delete) an employee account
    pub fn delete_employee(&self, employee_id: Uuid) -> AppResult<()> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Verify employee exists (Read operations work fine)
        let employee: User = users::table
            .find(employee_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Employee not found".to_string()))?;

        if employee.role == UserRole::Guest {
            return Err(AppError::Forbidden(
                "Cannot delete guest accounts".to_string(),
            ));
        }

        if employee.role == UserRole::Admin {
            self.check_can_delete_admin(employee_id)?;
        }

        println!(">>> FORCE DELETING USER: {:?}", employee_id);


        let rows_affected = diesel::update(users::table.find(employee_id))
                                    .set(users::deactivated_at.eq(Some(Utc::now())))
                                    .execute(&mut conn)
                                    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        println!(">>> ROWS AFFECTED: {}", rows_affected);

        if rows_affected == 0 {
            return Err(AppError::NotFound("Update failed - ID not found".to_string()));
        }

        Ok(())
    }

    /// Reactivate an employee account
    pub fn reactivate_employee(&self, employee_id: Uuid) -> AppResult<()> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Verify employee exists
        let employee: User = users::table
            .find(employee_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Employee not found".to_string()))?;

        if employee.role == UserRole::Guest {
            return Err(AppError::Forbidden(
                "Cannot reactivate guest accounts through employee management".to_string(),
            ));
        }

        // Check if already active
        if employee.deactivated_at.is_none() {
            return Err(AppError::ValidationError(
                "Employee account is already active".to_string(),
            ));
        }

        // Reactivate by setting deactivated_at to None
        let rows_affected = diesel::update(users::table.find(employee_id))
            .set(users::deactivated_at.eq(None::<DateTime<Utc>>))
            .execute(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        if rows_affected == 0 {
            return Err(AppError::NotFound("Update failed - ID not found".to_string()));
        }

        Ok(())
    }

    /// Reset an employee's password
    pub fn reset_password(&self, employee_id: Uuid, new_password: String) -> AppResult<()> {
        // Validate password length
        if new_password.len() < 8 {
            return Err(AppError::ValidationError(
                "Password must be at least 8 characters".to_string(),
            ));
        }

        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Verify employee exists
        let _employee: User = users::table
            .find(employee_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Employee not found".to_string()))?;

        // Hash new password
        let hashed_password = Self::hash_password(&new_password)?;

        // Update password
        diesel::update(users::table.find(employee_id))
            .set(users::password_hash.eq(&hashed_password))
            .execute(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "test_password_123";
        let hash = AuthService::hash_password(password).unwrap();
        assert_ne!(hash, password);
        assert!(AuthService::verify_password(password, &hash).unwrap());
        assert!(!AuthService::verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_password_hash_format() {
        let password = "test_password_123";
        let hash = AuthService::hash_password(password).unwrap();
        assert!(hash.starts_with("$argon2"));
    }
}