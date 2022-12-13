use crate::state::controller_registry::ControllerRegistry;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(did_count: u32)]
pub struct ResizeControllerRegistry<'info> {
    #[account(
    mut,
    seeds = [ControllerRegistry::SEED_PREFIX, authority.key().as_ref()],
    bump,
    realloc = TryInto::<usize>::try_into(ControllerRegistry::calculate_size(did_count)).unwrap(),
    realloc::payer = payer,
    realloc::zero = false,
    )]
    pub registry: Account<'info, ControllerRegistry>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub authority: Signer<'info>, // ownership is proven in the program
    pub system_program: Program<'info, System>,
}
