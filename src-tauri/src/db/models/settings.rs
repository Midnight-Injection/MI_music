use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Setting {
    pub id: i64,
    pub key: String,
    pub value: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpsertSetting {
    pub key: String,
    pub value: String,
}

impl Setting {
    /// Get a setting by key
    pub async fn get(pool: &SqlitePool, key: &str) -> Result<Option<Self>, sqlx::Error> {
        let result = sqlx::query_as::<_, Setting>("SELECT * FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(pool)
            .await?;

        Ok(result)
    }

    /// Get all settings
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<Self>, sqlx::Error> {
        let results = sqlx::query_as::<_, Setting>("SELECT * FROM settings ORDER BY key")
            .fetch_all(pool)
            .await?;

        Ok(results)
    }

    /// Set a setting value (create or update)
    pub async fn set(pool: &SqlitePool, input: UpsertSetting) -> Result<Self, sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        let result = sqlx::query_as::<_, Setting>(
            r#"
            INSERT INTO settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            RETURNING *
            "#,
        )
        .bind(&input.key)
        .bind(&input.value)
        .bind(&now)
        .fetch_one(pool)
        .await?;

        Ok(result)
    }

    /// Delete a setting
    pub async fn delete(pool: &SqlitePool, key: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM settings WHERE key = ?")
            .bind(key)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get a setting value as a specific type
    pub async fn get_as<T>(pool: &SqlitePool, key: &str) -> Result<Option<T>, sqlx::Error>
    where
        T: for<'de> Deserialize<'de>,
    {
        if let Some(setting) = Self::get(pool, key).await? {
            let value: T = serde_json::from_str(&setting.value)
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?;
            Ok(Some(value))
        } else {
            Ok(None)
        }
    }

    /// Set a setting value from a specific type
    pub async fn set_from<T>(
        pool: &SqlitePool,
        key: &str,
        value: &T,
    ) -> Result<Self, Box<dyn std::error::Error>>
    where
        T: Serialize,
    {
        let value_json = serde_json::to_string(value)?;

        Self::set(
            pool,
            UpsertSetting {
                key: key.to_string(),
                value: value_json,
            },
        )
        .await
        .map_err(|e| e.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_setting_operations() {
        let pool = sqlx::SqlitePool::connect(":memory:").await.unwrap();

        // Run migrations first
        crate::db::migrations::run(&pool).await.unwrap();

        // Set a setting
        let input = UpsertSetting {
            key: "theme".to_string(),
            value: "dark".to_string(),
        };

        let setting = Setting::set(&pool, input).await.unwrap();
        assert_eq!(setting.key, "theme");
        assert_eq!(setting.value, "dark");

        // Get the setting
        let found = Setting::get(&pool, "theme").await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().value, "dark");

        // Update the setting
        let input = UpsertSetting {
            key: "theme".to_string(),
            value: "light".to_string(),
        };

        let updated = Setting::set(&pool, input).await.unwrap();
        assert_eq!(updated.value, "light");

        // Delete the setting
        let deleted = Setting::delete(&pool, "theme").await.unwrap();
        assert!(deleted);

        let found = Setting::get(&pool, "theme").await.unwrap();
        assert!(found.is_none());
    }
}
