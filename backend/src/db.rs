use diesel::pg::PgConnection;
use diesel::r2d2::{self, ConnectionManager, Pool, PooledConnection};
use std::time::Duration;
use diesel::sql_query;
use diesel::RunQueryDsl;
use tracing::error;
use tracing::info;

/// Type alias for the connection pool
pub type DbPool = Pool<ConnectionManager<PgConnection>>;

/// Type alias for a pooled connection
#[allow(dead_code)]
pub type DbConn = PooledConnection<ConnectionManager<PgConnection>>;

/// Create a new database connection pool
///
/// # Arguments
/// * `database_url` - PostgreSQL connection string
///
/// # Returns
/// A configured connection pool
///
/// # Panics
/// Panics if the pool cannot be created
pub fn create_pool(database_url: &str) -> DbPool {
    let manager = ConnectionManager::<PgConnection>::new(database_url);

    Pool::builder()
        .max_size(10)
        .min_idle(Some(2))
        .connection_timeout(Duration::from_secs(30))
        .idle_timeout(Some(Duration::from_secs(300)))
        .build(manager)
        .expect("Failed to create database pool")
}

/// Try to apply DB fixes needed for enum normalization and stale statuses.
/// This executes safely on startup and logs failures instead of panicking.
pub fn apply_stale_statuses_fix(pool: &DbPool) {
    match pool.get() {
        Ok(mut conn) => {
            // SQL mirrors the migration that normalizes booking_status values
            // and ensures the enum contains required values.
            // Note: ALTER TYPE must be executed separately as it cannot be in a transaction
            // and cannot be combined with other statements in a prepared statement.
            
            // First, try to add the 'overstay' enum value if it doesn't exist
            // Note: ALTER TYPE ... ADD VALUE cannot be in a transaction and IF NOT EXISTS
            // may not be supported in all PostgreSQL versions, so we catch and ignore
            // "already exists" errors.
            match sql_query("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'overstay'").execute(&mut conn) {
                Ok(_) => info!("Added 'overstay' to booking_status enum"),
                Err(e) => {
                    let err_msg = e.to_string();
                    // Ignore errors about the value already existing
                    if err_msg.contains("already exists") || err_msg.contains("duplicate") {
                        info!("Enum value 'overstay' already exists in booking_status");
                    } else {
                        error!("Failed to add 'overstay' to booking_status enum: {}", e);
                    }
                }
            }

            // Then execute the UPDATE statements separately
            let updates = vec![
                ("UPDATE bookings SET status = 'checked_in'::booking_status WHERE status::text IN ('Checked In', 'CheckedIn')", "checked_in"),
                ("UPDATE bookings SET status = 'upcoming'::booking_status WHERE status::text = 'Upcoming'", "upcoming"),
                ("UPDATE bookings SET status = 'checked_out'::booking_status WHERE status::text IN ('Checked Out', 'CheckedOut')", "checked_out"),
            ];

            let mut success_count = 0;
            for (sql, name) in updates {
                match sql_query(sql).execute(&mut conn) {
                    Ok(_) => {
                        success_count += 1;
                        info!("Updated bookings status to '{}'", name);
                    }
                    Err(e) => {
                        error!("Failed to update bookings status to '{}': {}", name, e);
                    }
                }
            }

            if success_count > 0 {
                info!("Applied stale status DB fixes on startup ({} updates succeeded)", success_count);
            }
        }
        Err(e) => {
            error!("Could not acquire DB connection to apply stale status fix: {}", e);
        }
    }
}

/// Get a connection from the pool
///
/// # Arguments
/// * `pool` - Reference to the connection pool
///
/// # Returns
/// A pooled database connection or error
#[allow(dead_code)]
pub fn get_conn(pool: &DbPool) -> Result<DbConn, r2d2::PoolError> {
    pool.get()
}

