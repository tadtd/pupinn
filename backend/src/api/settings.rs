use axum::{
    extract::{State},
    Json,
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::{
    api::AppState,
    db::get_conn,
    errors::{AppError, AppResult},
    schema::system_settings,
};

#[derive(Serialize, Deserialize)]
pub struct AdminAiSettings {
    pub ai_enabled: bool,
    pub ai_provider: String,
    pub ai_api_key: String,
    pub ai_model: String,
}

pub async fn get_ai_settings(
    State(state): State<AppState>,
) -> AppResult<Json<AdminAiSettings>> {
    let mut conn = get_conn(&state.pool).map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let settings: Vec<(String, String)> = system_settings::table
        .select((system_settings::key, system_settings::value))
        .load::<(String, String)>(&mut conn)
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let map: HashMap<String, String> = settings.into_iter().collect();

    Ok(Json(AdminAiSettings {
        ai_enabled: map.get("ai_enabled").map(|v| v == "true").unwrap_or(false),
        ai_provider: map.get("ai_provider").cloned().unwrap_or("openai".to_string()),
        ai_api_key: map.get("ai_api_key").cloned().unwrap_or_default(),
        ai_model: map.get("ai_model").cloned().unwrap_or("gpt-3.5-turbo".to_string()),
    }))
}

pub async fn update_ai_settings(
    State(state): State<AppState>,
    Json(payload): Json<AdminAiSettings>,
) -> AppResult<Json<AdminAiSettings>> {
    let mut conn = get_conn(&state.pool).map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let updates = vec![
        ("ai_enabled", if payload.ai_enabled { "true" } else { "false" }),
        ("ai_provider", payload.ai_provider.as_str()),
        ("ai_api_key", payload.ai_api_key.as_str()),
        ("ai_model", payload.ai_model.as_str()),
    ];

    for (key, val) in updates {
        diesel::insert_into(system_settings::table)
            .values((
                system_settings::key.eq(key),
                system_settings::value.eq(val),
                system_settings::updated_at.eq(chrono::Utc::now())
            ))
            .on_conflict(system_settings::key)
            .do_update()
            .set((
                system_settings::value.eq(val),
                system_settings::updated_at.eq(chrono::Utc::now())
            ))
            .execute(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    }

    Ok(Json(payload))
}