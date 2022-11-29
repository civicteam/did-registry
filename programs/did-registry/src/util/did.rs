use std::str::FromStr;
use anchor_lang::prelude::*;

// TODO move to sol_did
pub const DID_ACCOUNT_SEED: &[u8] = b"did-account";
#[derive(Debug, Clone)]
pub struct SolDID;

impl Id for SolDID {
    fn id() -> Pubkey {
        Pubkey::from_str("didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc").unwrap()
    }
}