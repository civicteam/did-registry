use crate::{state::key_registry::KeyRegistry, SolDID, DID_ACCOUNT_SEED};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
/// The bump seed for the did account
did_bump: u8,
)]
pub struct RegisterDid<'info> {
    #[account(
    mut,
    seeds = [KeyRegistry::SEED_PREFIX, authority.key().as_ref()],
    bump,
    has_one = authority
    )]
    pub registry: Account<'info, KeyRegistry>,
    /// The authority that owns the registry
    pub authority: Signer<'info>,
    /// The DID to add to the registry. This is the did "identifier", not the did account
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
}
