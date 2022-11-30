use crate::state::controller_registry::ControllerRegistry;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CloseControllerRegistry<'info> {
    #[account(
    mut,
    close = authority,
    )]
    pub registry: Account<'info, ControllerRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
