pub mod auth;
pub mod bookings;
pub mod employees;
pub mod financial;
pub mod guest_auth;
pub mod guest_bookings;
pub mod guests;
pub mod middleware;
pub mod rooms;

use axum::{
    middleware as axum_middleware,
    routing::{get, patch, post, delete},
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
    // Staff auth routes
    let auth_routes = Router::new()
        .route("/login", post(auth::login))
        .route("/me", get(auth::me))
        .route("/users", post(auth::create_user))
        // Guest registration (public)
        .route("/register", post(guest_auth::register))
        // Guest login (public)
        .route("/guest/login", post(guest_auth::login))
        // Guest me (requires guest auth)
        .route(
            "/guest/me",
            get(guest_auth::me).layer(axum_middleware::from_fn_with_state(
                state.clone(),
                middleware::require_guest,
            )),
        );

    // Public room routes (no auth required)
    let public_room_routes = Router::new()
        // Available rooms endpoint is public (no auth required) for guests to search
        .route("/available", get(rooms::available_rooms))
        .route("/", get(rooms::list_rooms))
        .route("/:id", get(rooms::get_room));
    
    // Protected room routes (require staff auth)
    let protected_room_routes = Router::new()
        // .route("/", get(rooms::list_rooms).post(rooms::create_room))
        // .route("/:id", get(rooms::get_room).patch(rooms::update_room))
        .route("/", post(rooms::create_room))
        .route("/:id", patch(rooms::update_room))
        // Require staff authentication for room management (admin/receptionist)
        // Note: Middleware is applied bottom-up, so require_auth (outermost) is added last
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_staff,
        ))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_auth,
        ));
    
    let room_routes = Router::new()
        .merge(public_room_routes)
        .merge(protected_room_routes);

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

    // Guest booking routes (requires guest auth)
    let guest_booking_routes = Router::new()
        .route(
            "/",
            get(guest_bookings::list_bookings).post(guest_bookings::create_booking),
        )
        .route("/:id", get(guest_bookings::get_booking))
        .route("/:id/cancel", post(guest_bookings::cancel_booking))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_guest,
        ));

    // Cleaner routes (requires cleaner auth)
    let cleaner_routes = Router::new()
        .route("/rooms", get(rooms::list_cleaner_rooms))
        .route("/rooms/:id/status", patch(rooms::update_cleaner_room_status))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_cleaner,
        ))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_auth,
        ));

    // Admin employee management routes (requires admin auth)
    let admin_employee_routes = Router::new()
        .route("/employees", get(employees::list_employees).post(employees::create_employee))
        .route("/employees/:id", get(employees::get_employee).patch(employees::update_employee).delete(employees::delete_employee))
        .route("/employees/:id/reactivate", post(employees::reactivate_employee))
        .route("/employees/:id/reset-password", post(employees::reset_password))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_admin,
        ))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_auth,
        ));

    // Admin financial reporting routes (requires admin auth)
    let admin_financial_routes = Router::new()
        .route("/financial/rooms", get(financial::list_rooms_with_financials))
        .route("/financial/rooms/:roomId", get(financial::get_room_financials))
        .route("/financial/rooms/compare", post(financial::compare_rooms))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_admin,
        ))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_auth,
        ));

    // Admin guest CRM routes (requires admin auth)
    let admin_guest_routes = Router::new()
        .route("/guests/search", get(guests::search_guests))
        .route("/guests/:guestId", get(guests::get_guest_profile).patch(guests::update_guest))
        .route("/guests/:guestId/notes", get(guests::get_guest_notes).post(guests::add_guest_note))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_admin,
        ))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_auth,
        ));

    // Health check endpoint
    let health_route = Router::new().route("/health", get(health_check));

    Router::new()
        .nest("/auth", auth_routes)
        .nest("/rooms", room_routes)
        .nest("/bookings", booking_routes)
        .nest("/guest/bookings", guest_booking_routes)
        .nest("/cleaner", cleaner_routes)
        .nest(
            "/admin",
            admin_employee_routes
                .merge(admin_financial_routes)
                .merge(admin_guest_routes),
        )
        .merge(health_route)
        .with_state(state)
}

/// Health check handler
async fn health_check() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({ "status": "ok" }))
}
