use diesel::pg::PgConnection;
use diesel::r2d2::{self, ConnectionManager, Pool, PooledConnection};
use std::time::Duration;

/// Type alias for the connection pool
pub type DbPool = Pool<ConnectionManager<PgConnection>>;

/// Type alias for a pooled connection
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

/// Get a connection from the pool
///
/// # Arguments
/// * `pool` - Reference to the connection pool
///
/// # Returns
/// A pooled database connection or error
pub fn get_conn(pool: &DbPool) -> Result<DbConn, r2d2::PoolError> {
    pool.get()
}

