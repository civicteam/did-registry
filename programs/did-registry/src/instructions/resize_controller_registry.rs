use anchor_lang::prelude::*;
use crate::state::controller_registry::ControllerRegistry;

#[derive(Accounts)]
#[instruction(did_count: u32)]
pub struct ResizeControllerRegistry<'info> {
    #[account(
    mut,
    seeds = [ControllerRegistry::SEED_PREFIX, authority.key().as_ref()],
    bump,
    realloc = TryInto::<usize>::try_into(ControllerRegistry::calculate_size(did_count)).unwrap(),
    realloc::payer = authority,
    realloc::zero = false,
    // has_one = authority // TODO
    )]
    pub registry: Account<'info, ControllerRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,    // TODO prove ownership of did using did_sol
    pub system_program: Program<'info, System>,
}