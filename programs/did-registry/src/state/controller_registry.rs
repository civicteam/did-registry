use anchor_lang::prelude::*;

#[account]
pub struct ControllerRegistry {
    pub version: u8,
    pub did: Pubkey,
    pub controlled_dids: Vec<Pubkey>,
}
impl ControllerRegistry {
    pub const SEED_PREFIX: &'static [u8] = b"controller_registry";
    pub const INITIAL_SIZE: usize = Self::calculate_size(4); // allow 4 DIDs to be registered initially

    pub const fn calculate_size(did_count: u32) -> usize {
        (8 // discriminator
            + 1 // version
            + 32 // key
            + 4 + (did_count * 32)) as usize // Each registered did is 32 bytes
    }
}