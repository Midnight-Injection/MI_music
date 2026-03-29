//! Script Runtime Module
//!
//! Provides JavaScript execution environment for user music sources.
//! Uses hidden WebViews to execute LX Music format scripts.

mod api;
mod manager;

pub use api::*;
pub use manager::*;
