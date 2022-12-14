use crate::state::controller_registry::ControllerRegistry;
use crate::{SolDID, DID_ACCOUNT_SEED};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
/// The bump seed for the did account
did_bump: u8,
)]
pub struct CloseControllerRegistry<'info> {
    #[account(
    mut,
    close = payer,
    )]
    pub registry: Account<'info, ControllerRegistry>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// The DID whose registry is being closed. This is the did "identifier", not the did account
    /// i.e. did:sol:<identifier>
    /// note - this may or may not be the same as the authority.
    /// CHECK: This can be any public key. But it should derive the did_account
    pub did: UncheckedAccount<'info>,
    /// The account containing the DID document
    /// CHECK: This is checked for correctness by the SolDid SDK
    /// Specifically, the did account is checked to see if it has the authority as a signer
    /// Since it can be a generative DID, we do not use Account<DidAccount> here
    #[account(
    seeds = [DID_ACCOUNT_SEED, did.key().as_ref()],
    bump = did_bump,
    seeds::program = SolDID::id()
    )]
    pub did_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
