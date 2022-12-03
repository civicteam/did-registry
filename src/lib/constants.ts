import { PublicKey } from "@solana/web3.js";

export const DID_REGISTRY_PROGRAM_ID = new PublicKey(
  "regUajGv87Pti6QRLeeRuQWrarQ1LmEyDXcAozko6Ax"
);

export const SPACE_BUFFER = 1; // increase registry size by this whenever resizing

// Use this to pass a non-signing wallet into read-only registries
export const dummyAuthority = {
  publicKey: new PublicKey("11111111111111111111111111111111"),
  signTransaction: async () => {
    throw new Error("Not implemented");
  },
  signAllTransactions: async () => {
    throw new Error("Not implemented");
  },
};
