use chrono::{DateTime, Utc};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::schema::users;

/// User role enum matching PostgreSQL user_role type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, DbEnum)]
#[ExistingTypePath = "crate::schema::sql_types::UserRole"]
#[serde(rename_all = "snake_case")]
#[DbValueStyle = "snake_case"]
pub enum UserRole {
    #[serde(rename = "admin")]
    Admin,
    #[serde(rename = "receptionist")]
    Receptionist,
    #[serde(rename = "guest")]
    Guest,
    #[serde(rename = "cleaner")]
    Cleaner,
    #[serde(rename = "bot")]
    Bot,
}

/// User model representing a staff member or guest
#[derive(Debug, Clone, Queryable, Identifiable, Selectable, Serialize)]
#[diesel(table_name = users)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct User {
    pub id: Uuid,
    /// Username for staff (required), NULL for guests
    pub username: Option<String>,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub role: UserRole,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    /// Email for guests (required), optional for staff
    pub email: Option<String>,
    /// Display name for guests
    pub full_name: Option<String>,
    /// Phone number (for guests)
    pub phone: Option<String>,
    /// Identification number (for guests)
    pub id_number: Option<String>,
    /// Soft delete timestamp for employee accounts (NULL = active)
    pub deactivated_at: Option<DateTime<Utc>>,
}

/// New staff user for insertion (username required)
#[derive(Debug, Insertable)]
#[diesel(table_name = users)]
pub struct NewUser<'a> {
    pub username: Option<&'a str>,
    pub password_hash: &'a str,
    pub role: UserRole,
    pub email: Option<&'a str>,
    pub full_name: Option<&'a str>,
    pub phone: Option<&'a str>,
    pub id_number: Option<&'a str>,
}

/// User info without sensitive data (for API responses) - for staff users
#[derive(Debug, Clone, Serialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub username: Option<String>,
    pub role: UserRole,
}

impl From<User> for UserInfo {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            username: user.username,
            role: user.role,
        }
    }
}

impl From<&User> for UserInfo {
    fn from(user: &User) -> Self {
        Self {
            id: user.id,
            username: user.username.clone(),
            role: user.role,
        }
    }
}

/// Guest user info for API responses
#[derive(Debug, Clone, Serialize)]
pub struct GuestInfo {
    pub id: Uuid,
    pub email: String,
    pub full_name: String,
    pub role: UserRole,
}

impl TryFrom<User> for GuestInfo {
    type Error = &'static str;

    fn try_from(user: User) -> Result<Self, Self::Error> {
        if user.role != UserRole::Guest {
            return Err("User is not a guest");
        }
        Ok(Self {
            id: user.id,
            email: user.email.ok_or("Guest must have email")?,
            full_name: user.full_name.ok_or("Guest must have full_name")?,
            role: user.role,
        })
    }
}

impl TryFrom<&User> for GuestInfo {
    type Error = &'static str;

    fn try_from(user: &User) -> Result<Self, Self::Error> {
        if user.role != UserRole::Guest {
            return Err("User is not a guest");
        }
        Ok(Self {
            id: user.id,
            email: user.email.clone().ok_or("Guest must have email")?,
            full_name: user.full_name.clone().ok_or("Guest must have full_name")?,
            role: user.role,
        })
    }
}

/// New guest user for registration
#[derive(Debug, Insertable)]
#[diesel(table_name = users)]
pub struct NewGuestUser<'a> {
    pub email: &'a str,
    pub full_name: &'a str,
    pub password_hash: &'a str,
    pub role: UserRole,
    pub phone: Option<&'a str>,
    pub id_number: Option<&'a str>,
}

/// User update changeset for employee management
#[derive(Debug, AsChangeset, Default)]
#[diesel(table_name = users)]
pub struct UpdateUser {
    pub username: Option<String>,
    pub role: Option<UserRole>,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub phone: Option<String>,
    pub id_number: Option<String>,
    pub deactivated_at: Option<Option<DateTime<chrono::Utc>>>,
}
