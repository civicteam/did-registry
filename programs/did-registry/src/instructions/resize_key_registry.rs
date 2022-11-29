use anchor_lang::prelude::*;
use crate::state::key_registry::KeyRegistry;

#[derive(Accounts)]
#[instruction(did_count: u32)]
pub struct ResizeKeyRegistry<'info> {
    #[account(
    mut,
    seeds = [KeyRegistry::SEED_PREFIX, authority.key().as_ref()],
    bump,
    realloc = TryInto::<usize>::try_into(KeyRegistry::calculate_size(did_count)).unwrap(),
    realloc::payer = authority,
    realloc::zero = false,
    has_one = authority
    )]
    pub registry: Account<'info, KeyRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}