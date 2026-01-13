use std::env;

/// Application configuration loaded from environment variables
#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub allowed_origin: String,
    pub server_host: String,
    pub server_port: u16,
}

impl Config {
    /// Load configuration from environment variables
    ///
    /// # Panics
    /// Panics if required environment variables are not set
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let jwt_secret = env::var("JWT_SECRET")
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
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| {
                    eprintln!("ERROR: DATABASE_URL environment variable is not set!");
                    std::process::exit(1);
                }),
            jwt_secret,
            allowed_origin: env::var("ALLOWED_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:3000".to_string()),
            server_host: env::var("SERVER_HOST")
                .unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .unwrap_or_else(|_| {
                    eprintln!("ERROR: SERVER_PORT must be a valid port number!");
                    std::process::exit(1);
                }),
        }
    }
}

