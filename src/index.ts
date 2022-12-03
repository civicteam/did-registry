import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@project-serum/anchor";
import { Connection } from "@solana/web3.js";
import { Wallet as EthWallet } from "@ethersproject/wallet";
import { DidRegistry, IDL } from "./types/did_registry";
import {
  DidSolIdentifier,
  ExtendedCluster,
} from "@identity.com/sol-did-client";
import { arrayify } from "@ethersproject/bytes";
import BN from "bn.js";

export * from "./service/keyRegistry/Registry";
export * from "./service/keyRegistry/EthRegistry";
export * from "./service/keyRegistry/ReadOnlyRegistry";

export * from "./service/controllerRegistry/ControllerRegistry";
export * from "./service/controllerRegistry/ReadOnlyControllerRegistry";
