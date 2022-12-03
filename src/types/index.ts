import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { AnchorProvider } from "@project-serum/anchor";

export type Execution = {
  rpc(): Promise<string>;
  transaction(): Promise<Transaction>;
  instruction(): Promise<TransactionInstruction>;
};

export type DidAccount = {
  authority: PublicKey;
  account: PublicKey;
  bump: number;
};

// The exported Anchor wallet type is messed up at the moment, so we define it indirectly here
export type Wallet = AnchorProvider["wallet"];
