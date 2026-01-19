use std::env;

/// Application configuration loaded from environment variables
#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub allowed_origin: String,
    pub server_host: String,
    pub server_port: u16,
    pub minio_url: String,
    pub minio_public_url: String,
    pub minio_root_user: String,
    pub minio_root_password: String,
}

impl Config {
    /// Load configuration from environment variables
    ///
    /// # Panics
    /// Panics if required environment variables are not set
    pub fn from_env() -> Self {
        tracing::info!("Attempting to load .env file...");
        match dotenvy::dotenv() {
            Ok(path) => tracing::info!(".env file loaded from: {:?}", path),
            Err(e) => {
                // In Docker environments, .env files are often provided via env_file in docker-compose,
                // and might not exist as a file at the runtime path. This is expected.
                if e.to_string().contains("env path not found") {
                    tracing::info!("No .env file found (using system environment variables)");
                } else {
                    tracing::warn!("Error loading .env file: {}", e);
                }
            }
        }

        let get_env = |key: &str| {
            let val = env::var(key);
            match &val {
                Ok(v) => tracing::info!("Env var {} loaded: {}", key, v),
                Err(_) => tracing::warn!("Env var {} not found in system or .env", key),
            }
            val
        };

        let jwt_secret = get_env("JWT_SECRET")
            .unwrap_or_else(|_| {
                eprintln!("ERROR: JWT_SECRET environment variable is not set!");
                eprintln!("Please set JWT_SECRET in your .env file or environment variables.");
                std::process::exit(1);
            });

        if jwt_secret.is_empty() {
            eprintln!("ERROR: JWT_SECRET environment variable is set but empty!");
            eprintln!("Please set JWT_SECRET to a non-empty value in your .env file or environment variables.");
            std::process::exit(1);
        }

        Self {
            database_url: get_env("DATABASE_URL")
                .unwrap_or_else(|_| {
                    eprintln!("ERROR: DATABASE_URL environment variable is not set!");
                    std::process::exit(1);
                }),
            jwt_secret,
            allowed_origin: get_env("ALLOWED_ORIGIN")
                .unwrap_or_else(|_| {
                    let default = "http://localhost:3000".to_string();
                    tracing::info!("ALLOWED_ORIGIN not set, using default: {}", default);
                    default
                }),
            server_host: get_env("SERVER_HOST")
                .unwrap_or_else(|_| {
                    let default = "0.0.0.0".to_string();
                    tracing::info!("SERVER_HOST not set, using default: {}", default);
                    default
                }),
            server_port: get_env("SERVER_PORT")
                .unwrap_or_else(|_| {
                    let default = "8080".to_string();
                    tracing::info!("SERVER_PORT not set, using default: {}", default);
                    default
                })
                .parse()
                .unwrap_or_else(|_| {
                    eprintln!("ERROR: SERVER_PORT must be a valid port number!");
                    std::process::exit(1);
                }),
            minio_url: get_env("MINIO_URL")
                .unwrap_or_else(|_| {
                    let default = "http://minio:9000".to_string();
                    tracing::info!("MINIO_URL not set, using default: {}", default);
                    default
                }),
            minio_public_url: get_env("MINIO_PUBLIC_URL")
                .unwrap_or_else(|_| {
                    let default = "http://localhost:9000".to_string();
                    tracing::info!("MINIO_PUBLIC_URL not set, using default: {}", default);
                    default
                }),
            minio_root_user: get_env("MINIO_ROOT_USER")
                .unwrap_or_else(|_| {
                    let default = "minioadmin".to_string();
                    tracing::info!("MINIO_ROOT_USER not set, using default: {}", default);
                    default
                }),
            minio_root_password: get_env("MINIO_ROOT_PASSWORD")
                .unwrap_or_else(|_| {
                    let default = "minioadmin".to_string();
                    tracing::info!("MINIO_ROOT_PASSWORD not set, using default: {}", default);
                    default
                }),
        }
    }
}

