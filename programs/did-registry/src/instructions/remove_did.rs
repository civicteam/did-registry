use anchor_lang::prelude::*;
use crate::state::key_registry::KeyRegistry;

#[derive(Accounts)]
pub struct RemoveDid<'info> {
    #[account(
    mut,
    seeds = [KeyRegistry::SEED_PREFIX, authority.key().as_ref()],
    bump,
    has_one = authority
    // Leave out this constraint, to avoid having to iterate through the vec twice
    // once here and once in the program body
    // constraints = registry.dids.contains(&did.key()) @ ErrorCode::DIDNotRegistered
    )]
    pub registry: Account<'info, KeyRegistry>,
    /// The authority that owns the registry
    pub authority: Signer<'info>,
    /// The DID to remove from the registry
    /// CHECK: No checks needed here - it is just a pubkey at this stage
    pub did: UncheckedAccount<'info>,
}