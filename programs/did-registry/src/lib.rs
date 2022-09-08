use anchor_lang::prelude::*;
use std::str::FromStr;

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

    pub fn create_key_registry(ctx: Context<CreateKeyRegistry>, _bump: u8) -> Result<()> {
        ctx.accounts.registry.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn register_did(ctx: Context<RegisterDid>, _did_bump: u8) -> Result<()> {
        // ensure the authority is an authority on the did account
        // note, anchor has already verified the constraint that did_account
        // is the account for the did.
        sol_did::is_authority(
            &ctx.accounts.did_account.to_account_info(),
            &[], // the authority must be a direct authority on the DID
            &ctx.accounts.authority.key(),
            &[],
            None,
            None,
        )
        .map_err(|_| ErrorCode::DIDError)?
        .then(|| ())
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
// /// The bump seed for the registry account
// bump: u8,
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

#[account]
pub struct KeyRegistry {
    pub version: u8,
    pub authority: Pubkey,
    pub dids: Vec<Pubkey>,
}
impl KeyRegistry {
    pub const SEED_PREFIX: &'static [u8] = b"key_registry";
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
}
