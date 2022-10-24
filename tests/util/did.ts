import { PublicKey } from "@solana/web3.js";
import {
  AddVerificationMethodParams,
  BitwiseVerificationMethodFlag,
  DidSolIdentifier,
  DidSolService,
  VerificationMethodFlags,
  VerificationMethodType,
} from "@identity.com/sol-did-client";
import { CLUSTER } from "./constants";
import { Wallet } from "./anchorUtils";
import { toDid } from "../../src";
import { arrayify } from "@ethersproject/bytes";

export const addKeyToDID = async (authority: Wallet, key: PublicKey) => {
  const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
  const didSolService = DidSolService.build(did, { wallet: authority });
  const newKeyVerificationMethod: AddVerificationMethodParams = {
    flags: [BitwiseVerificationMethodFlag.CapabilityInvocation],
    fragment: `key${Date.now()}`, // randomise fragment name, so that we can add multiple keys in multiple tests.
    keyData: key.toBytes(),
    methodType: VerificationMethodType.Ed25519VerificationKey2018,
  };

  await didSolService.addVerificationMethod(newKeyVerificationMethod).rpc(); //{ skipPreflight: true, commitment: 'finalized' });
};

export const addEthAddressToDID = async (
  authority: Wallet,
  ethAddress: string
) => {
  const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
  const didSolService = DidSolService.build(did, { wallet: authority });
  const ethArray = arrayify(ethAddress);
  const newKeyVerificationMethod = {
    flags: [BitwiseVerificationMethodFlag.CapabilityInvocation],
    fragment: `eth_Address${Date.now()}`, // randomise fragment name, so that we can add multiple keys in multiple tests.
    keyData: Buffer.from(ethArray),
    methodType: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
  };

  await didSolService.addVerificationMethod(newKeyVerificationMethod).rpc(); //{ skipPreflight: true, commitment: 'finalized' });

  const doc = await didSolService.resolve();
  console.log(doc);
};

export const getDIDAccount = (authority: PublicKey): PublicKey => {
  const did = DidSolIdentifier.create(authority, CLUSTER);
  return did.dataAccount()[0];
};

export const initializeDIDAccount = async (
  authority: Wallet
): Promise<string> => {
  const did = DidSolIdentifier.create(authority.publicKey, CLUSTER);
  const didSolService = DidSolService.build(did, { wallet: authority });

  await didSolService.initialize(10_000).rpc();
  return toDid(authority.publicKey);
};
