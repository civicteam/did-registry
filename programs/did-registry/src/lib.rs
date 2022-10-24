mod eth_signing;

use anchor_lang::prelude::*;
use sol_did::state::{DidAccount, Secp256k1RawSignature as SolDidSecp256k1RawSignature};
use std::str::FromStr;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct Secp256k1RawSignature {
    pub signature: [u8; 64],
    pub recovery_id: u8,
}
impl From<Secp256k1RawSignature> for SolDidSecp256k1RawSignature {
    fn from(signature: Secp256k1RawSignature) -> Self {
        SolDidSecp256k1RawSignature {
            signature: signature.signature,
            recovery_id: signature.recovery_id,
        }
    }
}

declare_id!("regUajGv87Pti6QRLeeRuQWrarQ1LmEyDXcAozko6Ax");

// TODO move to sol_did
pub const DID_ACCOUNT_SEED: &[u8] = b"did-account";
#[derive(Debug, Clone)]
pub struct SolDID;

impl Id for SolDID {
    fn id() -> Pubkey {
        Pubkey::from_str("didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc").unwrap()
    }
}

#[program]
pub mod did_registry {
    use super::*;
    use crate::eth_signing::validate_eth_signature;
    use sol_did::integrations::is_authority;

    /// Create an empty DID registry for a given solana key
    pub fn create_key_registry(ctx: Context<CreateKeyRegistry>, _bump: u8) -> Result<()> {
        ctx.accounts.registry.authority = ctx.accounts.authority.key();
        Ok(())
    }

    /// Add a DID to an authority's registry
    pub fn register_did(ctx: Context<RegisterDid>, _did_bump: u8) -> Result<()> {
        // ensure the authority is an authority on the did account
        // note, anchor has already verified the constraint that did_account
        // is the account for the did.
        is_authority(
            &ctx.accounts.did_account.to_account_info(),
            None, // the authority must be a direct authority on the DID
            &[],
            ctx.accounts.authority.key().as_ref(),
            None,
            None,
        )
        .map_err(|_| ErrorCode::DIDError)?
        .then_some(())
        .ok_or(ErrorCode::NotAuthority)?;

        let did = &ctx.accounts.did;
        // ensure the did is not already registered
        require_eq!(
            ctx.accounts.registry.dids.contains(&did.key()),
            false,
            ErrorCode::DIDRegistered
        );

        // TODO handle resizing
        ctx.accounts.registry.dids.push(did.key());

        Ok(())
    }

    /// Remove a DID from an authority's registry
    pub fn remove_did(ctx: Context<RemoveDid>) -> Result<()> {
        let did_to_remove = &ctx.accounts.did.key();

        // find the DID in the registry and remove it
        // throw an error if not found
        ctx.accounts
            .registry
            .dids
            .iter()
            .position(|did| did == did_to_remove)
            .map_or_else(
                || Err(ErrorCode::DIDNotRegistered.into()),
                |index| {
                    ctx.accounts.registry.dids.swap_remove(index);
                    Ok(())
                },
            )
    }

    /// Add a DID to an eth address's registry, if the solana signer is also an authority
    pub fn register_did_for_eth_address(
        ctx: Context<RegisterDidForEthAddress>,
        eth_address: [u8; 20],
        _did_bump: u8,
    ) -> Result<()> {
        // ensure the eth address is an authority on the DID
        is_authority(
            &ctx.accounts.did_account.to_account_info(),
            None, // the authority must be a direct authority on the DID
            &[],
            eth_address.as_ref(),
            None,
            None,
        )
        .map_err(|_| ErrorCode::DIDError)?
        .then_some(())
        .ok_or(ErrorCode::NotAuthority)?;

        // ensure the sol signer is also an authority on the DID account
        is_authority(
            &ctx.accounts.did_account.to_account_info(),
            None, // the authority must be a direct authority on the DID
            &[],
            ctx.accounts.authority.key().as_ref(),
            None,
            None,
        )
        .map_err(|_| ErrorCode::DIDError)?
        .then_some(())
        .ok_or(ErrorCode::NotAuthority)?;

        let did = &ctx.accounts.did;
        // ensure the did is not already registered
        require_eq!(
            ctx.accounts.registry.dids.contains(&did.key()),
            false,
            ErrorCode::DIDRegistered
        );

        // TODO handle resizing
        ctx.accounts.registry.dids.push(did.key());

        Ok(())
    }

    /// Add a DID to an eth address's registry, without requiring the solana signer to be an authority on the DID
    pub fn register_did_signed_by_eth_address(
        ctx: Context<RegisterDidSignedByEthAddress>,
        eth_address: [u8; 20],
        eth_signature: Secp256k1RawSignature,
        _did_bump: u8,
    ) -> Result<()> {
        // Check the eth signature is a signature of the DID identifier as a byte array
        // and that it was signed by the eth address
        // TODO: Change message to come directly from instruction OR only accept update via cryptid
        // TODO: This allows replay attacks
        validate_eth_signature(
            ctx.accounts.did_account.authority_key().as_ref(),
            &eth_signature.into(),
            eth_address.as_ref(),
        )?;

        // ensure the authority is an authority on the did account
        // note, anchor has already verified the constraint that did_account
        // is the account for the did.
        is_authority(
            &ctx.accounts.did_account.to_account_info(),
            None,
            &[], // the authority must be a direct authority on the DID
            eth_address.as_ref(),
            None,
            None,
        )
        .map_err(|_| ErrorCode::DIDError)?
        .then_some(())
        .ok_or(ErrorCode::NotAuthority)?;

        let did = &ctx.accounts.did;
        // ensure the did is not already registered
        require_eq!(
            ctx.accounts.registry.dids.contains(&did.key()),
            false,
            ErrorCode::DIDRegistered
        );

        // TODO handle resizing
        ctx.accounts.registry.dids.push(did.key());

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateKeyRegistry<'info> {
    #[account(
    init,
    payer = authority,
    space = 8 + KeyRegistry::INITIAL_SIZE,
    seeds = [KeyRegistry::SEED_PREFIX, authority.key().as_ref()],
    bump,
    )]
    pub registry: Account<'info, KeyRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

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

#[derive(Accounts)]
pub struct RemoveDid<'info> {
    #[account(
    mut,
    seeds = [KeyRegistry::SEED_PREFIX, authority.key().as_ref()],
    bump,
    has_one = authority
    // Leave out this constraint, to avoid having to iterate through the vec twice
    // once here and once in the program body
    // constraints = registry.dids.contains(&did.key()) @ ErrorCode::DIDNotRegistered
    )]
    pub registry: Account<'info, KeyRegistry>,
    /// The authority that owns the registry
    pub authority: Signer<'info>,
    /// The DID to remove from the registry
    /// CHECK: No checks needed here - it is just a pubkey at this stage
    pub did: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(
/// The eth address that the registry is being created for
eth_address: [u8; 20],
/// The bump seed for the did account
did_bump: u8,
)]
pub struct RegisterDidForEthAddress<'info> {
    #[account(
    init_if_needed,
    payer = authority,
    space = 8 + KeyRegistry::INITIAL_SIZE,
    seeds = [KeyRegistry::ETH_SEED_PREFIX, &eth_address],
    bump,
    )]
    pub registry: Account<'info, KeyRegistry>,
    #[account(mut)]
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
    pub system_program: Program<'info, System>,
}

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

#[account]
pub struct KeyRegistry {
    pub version: u8,
    pub authority: Pubkey,
    pub dids: Vec<Pubkey>,
}
impl KeyRegistry {
    pub const SEED_PREFIX: &'static [u8] = b"key_registry";
    pub const ETH_SEED_PREFIX: &'static [u8] = b"eth_key_registry";
    pub const INITIAL_SIZE: usize = 8  // discriminator
        + 1 // version
        + 32 // key
        + 4 + (4 * 32); // dids: allow 4 DIDs to be registered initially
}

#[account]
pub struct ControllerRegistry {
    pub version: u8,
    pub did: Pubkey,
    pub controlled_dids: Vec<Pubkey>,
}
impl ControllerRegistry {
    pub const SEED_PREFIX: &'static [u8] = b"controller_registry";
    pub const INITIAL_SIZE: usize = 8  // discriminator
        + 1 // version
        + 32 // did
        + 4 + (4 * 32); // controlled_dids: allow 4 DIDs to be registered initially
}

#[error_code]
pub enum ErrorCode {
    #[msg("An error occurred evaluating the DID")]
    DIDError,

    #[msg("The key is not an authority on the DID")]
    NotAuthority,

    #[msg("The DID is already registered")]
    DIDRegistered,

    #[msg("Attempt to remove a DID that is not registered")]
    DIDNotRegistered,

    #[msg("The Eth signature did not sign the message")]
    InvalidEthSignature,

    #[msg("The Eth signature was signed by the wrong address")]
    WrongEthSigner,
}
