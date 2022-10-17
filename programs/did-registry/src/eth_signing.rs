use crate::ErrorCode;
use anchor_lang::prelude::*;
use sol_did::{
    state::Secp256k1RawSignature,
    utils::{convert_secp256k1pub_key_to_address, eth_verify_message},
};

pub fn validate_eth_signature(
    message: &[u8],
    eth_signature: &Secp256k1RawSignature,
    expected_address: &[u8],
) -> Result<()> {
    let secp256k1_pubkey = eth_verify_message(
        message,
        0u64, // We do not use a nonce here - there is no risk of replay when adding a DID to a registry
        eth_signature.signature,
        eth_signature.recovery_id,
    )
    .map_err(|_| ErrorCode::InvalidEthSignature)?;

    // Check the recovered address matches the expected address
    let address = convert_secp256k1pub_key_to_address(&secp256k1_pubkey);

    // use this instead of require_eq! because the latter requires the Display trait on its arguments
    match address == expected_address {
        true => Ok(()),
        false => Err(ErrorCode::WrongEthSigner.into()),
    }
}
