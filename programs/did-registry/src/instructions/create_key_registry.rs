use crate::state::key_registry::KeyRegistry;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreateKeyRegistry<'info> {
    #[account(
    init,
    payer = payer,
    space = 8 + KeyRegistry::INITIAL_SIZE,
    seeds = [KeyRegistry::SEED_PREFIX, authority.key().as_ref()],
    bump,
    )]
    pub registry: Account<'info, KeyRegistry>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
