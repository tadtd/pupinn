mod api;
mod config;
mod db;
mod errors;
mod models;
mod schema;
mod services;
mod utils;

use std::net::SocketAddr;

use axum::http::{header, Method};
use tokio::signal;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::api::{create_router, AppState};
use crate::config::Config;
use crate::db::create_pool;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "hotel_management_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env();

    // Create database pool
    let pool = create_pool(&config.database_url);
    tracing::info!("Database connection pool created");
    // Attempt to apply DB fixes for enum normalization / stale statuses
    crate::db::apply_stale_statuses_fix(&pool);

    // Create application state
    let state = AppState {
        pool,
        jwt_secret: config.jwt_secret,
    };

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(
            config
                .allowed_origin
                .parse::<axum::http::HeaderValue>()
                .expect("Invalid ALLOWED_ORIGIN"),
        )
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE])
        .allow_credentials(true);

    // Build router
    let api_router = create_router(state);
    let app = axum::Router::new()
        .nest("/api", api_router)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    // Get server address from config
    let addr = SocketAddr::new(
        config.server_host.parse().expect("Invalid SERVER_HOST"),
        config.server_port,
    );

    tracing::info!("Starting server on {}", addr);

    // Start server with graceful shutdown
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Server error");
}

/// Signal handler for graceful shutdown
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received, starting graceful shutdown");
}
