// Tauri commands for frontend-backend communication
// This module will contain all Tauri commands exposed to the frontend

pub mod download;
pub mod db;
pub mod search;
pub mod lyrics_window;
pub mod lyrics;
pub mod player;
pub mod effects;
pub mod theme;
pub mod user_source;
pub mod default_sources;
pub mod script_runtime;

pub use download::*;
pub use db::*;
pub use search::*;
pub use lyrics_window::*;
pub use lyrics::*;
pub use player::*;
pub use effects::*;
pub use theme::*;
pub use user_source::*;
pub use default_sources::*;
pub use script_runtime::*;
