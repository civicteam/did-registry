use crate::state::controller_registry::ControllerRegistry;
use crate::{SolDID, DID_ACCOUNT_SEED};
use anchor_lang::prelude::*;

/// Add a controlled DID to the registry of a controller DID
#[derive(Accounts)]
#[instruction(
/// The bump seed for the registry did account
did_bump: u8,
/// The bump seed for the controlled did account being added to the registry
controlled_did_bump: u8,
)]
pub struct RegisterControlledDid<'info> {
    #[account(
    mut,
    seeds = [ControllerRegistry::SEED_PREFIX, registry.did.as_ref()],
    bump
    )]
    pub registry: Account<'info, ControllerRegistry>,
    /// The authority that owns the registry
    pub authority: Signer<'info>,
    /// The controlled did to add to the registry. This is the did "identifier", not the did account
    /// i.e. did:sol:<identifier>
    /// note - this may or may not be the same as the authority.
    /// CHECK: This can be any public key. But it should derive the controller_did_account
    pub controlled_did: UncheckedAccount<'info>,
    /// The account containing the controlled DID document
    /// This document must contain registry.did as a controller (checked by SolDid).
    /// CHECK: This is checked for correctness by the SolDid SDK
    #[account(
    seeds = [DID_ACCOUNT_SEED, controlled_did.key().as_ref()],
    bump = controlled_did_bump,
    seeds::program = SolDID::id()
    )]
    pub controlled_did_account: UncheckedAccount<'info>,

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
