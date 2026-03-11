use sqlx::SqlitePool;

/// Run all database migrations
pub async fn run(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Create migrations table if it doesn't exist
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version INTEGER NOT NULL UNIQUE,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Get the current migration version
    let current_version: Option<i64> = sqlx::query_scalar("SELECT MAX(version) FROM _migrations")
        .fetch_one(pool)
        .await?;

    let current_version = current_version.unwrap_or(0);

    // Run migrations in order
    let migrations = get_migrations();

    for migration in migrations {
        if migration.version > current_version {
            // Execute migration
            sqlx::query(migration.sql)
                .execute(pool)
                .await?;

            // Record migration
            sqlx::query("INSERT INTO _migrations (version) VALUES (?)")
                .bind(migration.version)
                .execute(pool)
                .await?;

            println!("Applied migration: {}", migration.name);
        }
    }

    Ok(())
}

struct Migration {
    version: i64,
    name: &'static str,
    sql: &'static str,
}

fn get_migrations() -> &'static [Migration] {
    &[
        Migration {
            version: 1,
            name: "001_initial",
            sql: include_str!("migrations/001_initial.sql"),
        },
        Migration {
            version: 2,
            name: "002_add_download_file_path",
            sql: include_str!("migrations/002_add_download_file_path.sql"),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_migrations() {
        let pool = sqlx::SqlitePool::connect(":memory:").await.unwrap();
        run(&pool).await.unwrap();

        // Verify migrations table exists
        let result: (i64,) = sqlx::query_as("SELECT MAX(version) FROM _migrations")
            .fetch_one(&pool)
            .await
            .unwrap();

        assert_eq!(result.0, 2);
    }
}
