use anchor_lang::prelude::*;
use crate::state::key_registry::KeyRegistry;

#[derive(Accounts)]
pub struct CloseKeyRegistry<'info> {
    #[account(
    mut,
    close = authority,
    )]
    pub registry: Account<'info, KeyRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}