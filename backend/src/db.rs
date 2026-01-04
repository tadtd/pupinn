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
            let sql = r#"
                ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'no_show';
                ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'overstay';

                UPDATE bookings
                SET status = 'checked_in'::booking_status
                WHERE status::text IN ('Checked In', 'CheckedIn');

                UPDATE bookings
                SET status = 'upcoming'::booking_status
                WHERE status::text = 'Upcoming';

                UPDATE bookings
                SET status = 'checked_out'::booking_status
                WHERE status::text IN ('Checked Out', 'CheckedOut');
            "#;

            if let Err(e) = sql_query(sql).execute(&mut conn) {
                error!("Failed to apply stale status fix SQL: {}", e);
            } else {
                info!("Applied stale status DB fixes on startup");
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

