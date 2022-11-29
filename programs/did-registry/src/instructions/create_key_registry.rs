use anchor_lang::prelude::*;
use crate::state::key_registry::KeyRegistry;

#[derive(Accounts)]
pub struct CreateKeyRegistry<'info> {
    #[account(
    init,
    payer = authority,
    space = 8 + KeyRegistry::INITIAL_SIZE,
    seeds = [KeyRegistry::SEED_PREFIX, authority.key().as_ref()],
    bump,
    )]
    pub registry: Account<'info, KeyRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}