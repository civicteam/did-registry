import { AnchorProvider, Program } from "@project-serum/anchor";
import { DidRegistry, IDL } from "../types/did_registry";
import { DID_REGISTRY_PROGRAM_ID } from "./constants";
import { Wallet } from "../types";
import { Connection } from "@solana/web3.js";

export const makeProgram = (
  connection: Connection,
  wallet: Wallet
): Program<DidRegistry> => {
  return new Program<DidRegistry>(
    IDL,
    DID_REGISTRY_PROGRAM_ID,
    new AnchorProvider(connection, wallet, {})
  );
};

export const confirm = async (
  connection: Connection,
  txSig: string
): Promise<void> => {
  const blockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      ...blockhash,
      signature: txSig,
    },
    "confirmed"
  );
};
