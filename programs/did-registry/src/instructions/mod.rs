mod create_key_registry;
mod register_did;
mod remove_did;
mod register_did_for_eth_address;
mod register_did_signed_by_eth_address;
mod resize_key_registry;
mod resize_controller_registry;
mod close_key_registry;

pub use create_key_registry::*;
pub use register_did::*;
pub use remove_did::*;
pub use register_did_for_eth_address::*;
pub use register_did_signed_by_eth_address::*;
pub use resize_key_registry::*;
pub use resize_controller_registry::*;
pub use close_key_registry::*;