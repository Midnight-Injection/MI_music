// Database module for managing SQLite database
// This module will handle all database operations

mod connection;
mod migrations;
pub mod models;

pub use connection::{get_pool, Database};
