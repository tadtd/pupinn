use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::Serialize;
use uuid::Uuid;

use crate::schema::guest_interaction_notes;

/// Guest interaction note model
#[derive(Debug, Clone, Queryable, Identifiable, Selectable, Serialize)]
#[diesel(table_name = guest_interaction_notes)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct GuestNote {
    pub id: Uuid,
    pub guest_id: Uuid,
    pub admin_id: Uuid,
    pub note: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// New guest note for insertion
#[derive(Debug, Insertable)]
#[diesel(table_name = guest_interaction_notes)]
pub struct NewGuestNote<'a> {
    pub guest_id: Uuid,
    pub admin_id: Uuid,
    pub note: &'a str,
}

/// Guest note update changeset
#[derive(Debug, AsChangeset, Default)]
#[diesel(table_name = guest_interaction_notes)]
pub struct UpdateGuestNote {
    pub note: Option<String>,
}

