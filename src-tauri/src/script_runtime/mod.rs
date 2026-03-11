//! Script Runtime Module
//!
//! Provides JavaScript execution environment for user music sources.
//! Uses hidden WebViews to execute LX Music format scripts.

mod manager;
mod api;

pub use manager::*;
pub use api::*;
