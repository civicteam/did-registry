use crate::{
    state::key_registry::KeyRegistry, util::eth_signing::Secp256k1RawSignature, SolDID,
    DID_ACCOUNT_SEED,
};
use anchor_lang::prelude::*;
use sol_did::state::DidAccount;

#[derive(Accounts)]
#[instruction(
/// The eth address that the registry is being created for
eth_address: [u8; 20],
/// A message signed by the eth address, to prove ownership.
eth_signature: Secp256k1RawSignature,
/// The bump seed for the did account
did_bump: u8,
)]
pub struct RegisterDidSignedByEthAddress<'info> {
    #[account(
    init_if_needed,
    payer = payer,
    space = 8 + KeyRegistry::INITIAL_SIZE,
    seeds = [KeyRegistry::ETH_SEED_PREFIX, &eth_address],
    bump,
    )]
    pub registry: Account<'info, KeyRegistry>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The DID to add to the registry. This is the did "identifier", not the did account
    /// i.e. did:sol:<identifier>
    /// note - this may or may not be the same as the payer.
    /// CHECK: This can be any public key. But it should derive the did_account
    pub did: UncheckedAccount<'info>,
    /// The account containing the DID document
    /// This can safely be a DidAccount, rather than UncheckedAccount,
    /// since, for the DID to include an eth address it must be a non-generative DID.
    #[account(
    seeds = [DID_ACCOUNT_SEED, did.key().as_ref()],
    bump = did_bump,
    seeds::program = SolDID::id()
    )]
    pub did_account: Account<'info, DidAccount>,
    pub system_program: Program<'info, System>,
}
