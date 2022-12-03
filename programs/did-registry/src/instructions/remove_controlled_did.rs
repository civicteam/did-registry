use crate::state::controller_registry::ControllerRegistry;
use crate::{SolDID, DID_ACCOUNT_SEED};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
/// The bump seed for the registry did account
did_bump: u8,
)]
pub struct RemoveControlledDid<'info> {
    #[account(
    mut,
    seeds = [ControllerRegistry::SEED_PREFIX, authority.key().as_ref()],
    bump,
    )]
    pub registry: Account<'info, ControllerRegistry>,
    /// The authority that owns the registry
    pub authority: Signer<'info>,
    /// The DID to remove from the registry
    /// CHECK: No checks needed here - it is just a pubkey at this stage
    pub did_to_remove: UncheckedAccount<'info>,
    /// The account containing the DID document that this registry applies to.
    /// This is required, in order to check that the authority is an authority on the DID
    /// CHECK: This is checked for correctness by the SolDid SDK
    /// Specifically, the did account is checked to see if it has the authority as a signer
    /// Since it can be a generative DID, we do not use Account<DidAccount> here
    #[account(
    seeds = [DID_ACCOUNT_SEED, registry.did.as_ref()],
    bump = did_bump,
    seeds::program = SolDID::id()
    )]
    pub did_account: UncheckedAccount<'info>,
}
