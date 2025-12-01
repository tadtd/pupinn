pub mod auth;
pub mod bookings;
pub mod middleware;
pub mod rooms;

use axum::{
    routing::{get, post},
    Router,
};

use crate::db::DbPool;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub jwt_secret: String,
}

/// Create the API router with all routes
pub fn create_router(state: AppState) -> Router {
    let auth_routes = Router::new()
        .route("/login", post(auth::login))
        .route("/me", get(auth::me))
        .route("/users", post(auth::create_user));

    let room_routes = Router::new()
        .route("/", get(rooms::list_rooms).post(rooms::create_room))
        .route("/available", get(rooms::available_rooms))
        .route("/:id", get(rooms::get_room).patch(rooms::update_room));

    let booking_routes = Router::new()
        .route(
            "/",
            get(bookings::list_bookings).post(bookings::create_booking),
        )
        .route(
            "/:id",
            get(bookings::get_booking).patch(bookings::update_booking),
        )
        .route("/:id/check-in", post(bookings::check_in))
        .route("/:id/check-out", post(bookings::check_out))
        .route("/:id/cancel", post(bookings::cancel))
        .route(
            "/reference/:reference",
            get(bookings::get_booking_by_reference),
        );

    // Health check endpoint
    let health_route = Router::new().route("/health", get(health_check));

    Router::new()
        .nest("/auth", auth_routes)
        .nest("/rooms", room_routes)
        .nest("/bookings", booking_routes)
        .merge(health_route)
        .with_state(state)
}

/// Health check handler
async fn health_check() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({ "status": "ok" }))
}
