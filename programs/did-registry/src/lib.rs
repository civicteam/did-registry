mod state;
mod util;
mod instructions;

use anchor_lang::prelude::*;
use crate::{
    state::{
        controller_registry::ControllerRegistry,
        key_registry::KeyRegistry
    },
    util::{
        eth_signing::Secp256k1RawSignature,
        did::{SolDID, DID_ACCOUNT_SEED}
    }
};
use instructions::*;

declare_id!("regUajGv87Pti6QRLeeRuQWrarQ1LmEyDXcAozko6Ax");

#[program]
pub mod did_registry {
    use super::*;
    use crate::util::eth_signing::{Secp256k1RawSignature, validate_eth_signature};
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

        // ensure adding the did does not exceed the account size
        require_gte!(
            ctx.accounts.registry.to_account_info().data_len() as usize,
            KeyRegistry::calculate_size((ctx.accounts.registry.dids.len() + 1).try_into().unwrap()),
            ErrorCode::RegistryFull
        );

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

    pub fn resize_key_registry(_ctx: Context<ResizeKeyRegistry>, did_count: u32) -> Result<()> {
        msg!("Resizing key registry to fit {} dids - resulting in size {}", did_count, KeyRegistry::calculate_size(did_count));
        Ok(())
    }

    pub fn close_key_registry(_ctx: Context<CloseKeyRegistry>) -> Result<()> {
        Ok(())
    }
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

    #[msg("The registry has exceeded its maximum size - use the resize instruction to get more space")]
    RegistryFull,
}
