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
    // Set panic hook to ensure see panics in Docker logs
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("PANIC: {:?}", panic_info);
        eprintln!("Location: {:?}", panic_info.location());
        if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            eprintln!("Message: {}", s);
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            eprintln!("Message: {}", s);
        }
    }));

    // Print immediate output to verify process starts
    eprintln!("Backend process starting...");
    use std::io::Write;
    let _ = std::io::stdout().flush();
    let _ = std::io::stderr().flush();

    // Initialize tracing early with explicit stdout writer for Docker
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "debug".into()),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(std::io::stdout)
                .with_ansi(false) // Disable ANSI colors for Docker logs
        )
        .init();

    // Flush stdout immediately to ensure logs appear in Docker
    let _ = std::io::stdout().flush();
    
    tracing::info!("Starting hotel management backend server...");

    // Load configuration
    let config = Config::from_env();
    tracing::info!("Configuration loaded successfully");

    // Create database pool
    let pool = create_pool(&config.database_url);
    tracing::info!("Database connection pool created");
    // Attempt to apply DB fixes for enum normalization / stale statuses
    crate::db::apply_stale_statuses_fix(&pool);

    tracing::info!("Final MinIO Config Check:");
    tracing::info!("  MINIO_URL: {}", config.minio_url);
    tracing::info!("  MINIO_ROOT_USER: {}", config.minio_root_user);
    // Do not log password for security, but log its length/presence
    tracing::info!("  MINIO_ROOT_PASSWORD: [SET, length={}]", config.minio_root_password.len());
    
    tracing::info!("Initializing S3 client for MinIO at {}", config.minio_url);
    
    let s3_config = aws_sdk_s3::config::Builder::new()
        .endpoint_url(&config.minio_url)
        .region(aws_sdk_s3::config::Region::new("us-east-1"))
        .credentials_provider(aws_sdk_s3::config::Credentials::new(
            &config.minio_root_user,
            &config.minio_root_password,
            None,
            None,
            "minio",
        ))
        .force_path_style(true)
        .behavior_version_latest()
        .build();
    
    let s3_client = aws_sdk_s3::Client::from_conf(s3_config);
    tracing::info!("S3 client initialized successfully");

    // Create application state
    let state = AppState {
        pool,
        jwt_secret: config.jwt_secret,
        chat_state: std::sync::Arc::new(crate::api::chat::ChatState::default()),
        s3_client,
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
    let _ = std::io::stdout().flush();

    // Start server with graceful shutdown
    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => {
            tracing::info!("Successfully bound to address {}", addr);
            let _ = std::io::stdout().flush();
            listener
        }
        Err(e) => {
            eprintln!("ERROR: Failed to bind to address {}: {}", addr, e);
            std::process::exit(1);
        }
    };

    tracing::info!("Server listening on {}, waiting for connections...", addr);
    let _ = std::io::stdout().flush();

    if let Err(e) = axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
    {
        eprintln!("ERROR: Server error: {}", e);
        std::process::exit(1);
    }

    tracing::info!("Server shutdown complete");
    let _ = std::io::stdout().flush();
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
