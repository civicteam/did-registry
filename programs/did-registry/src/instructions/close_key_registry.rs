use crate::state::key_registry::KeyRegistry;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CloseKeyRegistry<'info> {
    #[account(
    mut,
    close = payer,
    has_one = authority
    )]
    pub registry: Account<'info, KeyRegistry>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
