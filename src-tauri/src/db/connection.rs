use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};
use std::str::FromStr;
use std::sync::Arc;
use tokio::sync::OnceCell;

/// Global database pool reference
static GLOBAL_POOL: OnceCell<Arc<SqlitePool>> = OnceCell::const_new();

/// Database connection pool manager
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Create a new database connection pool
    /// This will create the database file if it doesn't exist
    pub async fn new(database_path: &str) -> Result<Self, sqlx::Error> {
        let options = SqliteConnectOptions::from_str(database_path)?
            .create_if_missing(true);

        let pool = SqlitePool::connect_with(options).await?;

        Ok(Database { pool })
    }

    /// Get a reference to the connection pool
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Set the global pool reference
    pub fn set_global_pool(&self) -> Result<(), sqlx::Error> {
        GLOBAL_POOL
            .set(Arc::new(self.pool.clone()))
            .map_err(|_| sqlx::Error::Configuration(
                "Global pool already set".into()
            ))?;
        Ok(())
    }

    /// Run database migrations
    pub async fn migrate(&self) -> Result<(), sqlx::Error> {
        // Enable foreign keys
        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(self.pool())
            .await?;

        // Run migrations from the migrations module
        crate::db::migrations::run(self.pool()).await?;

        Ok(())
    }

    /// Close the database connection pool
    pub async fn close(self) {
        self.pool.close().await;
    }
}

/// Get the global database pool
pub async fn get_pool() -> Result<Arc<SqlitePool>, String> {
    GLOBAL_POOL
        .get()
        .cloned()
        .ok_or_else(|| "Database pool not initialized".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_creation() {
        let db = Database::new(":memory:").await.unwrap();
        assert!(db.pool().size() > 0);
        db.close().await;
    }
}
