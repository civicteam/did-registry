# DID Registry

An on-chain protocol for registering did:sol DIDs against public keys,
allowing for reverse-lookup of the DID from the public key.

A DID can be registered against a key, if that key is an authority on the DID.

## Quick Start

```shell
yarn add @civic/did-registry
```

```ts
import { PublicKey } from "@solana/web3.js";
import { Registry } from '@civic/did-registry';

const provider = anchor.AnchorProvider.env();
const registry = new Registry(provider.wallet, program.provider.connection);

// Register a DID
await registry.register("did:sol:123...");

// Lookup all registered DIDs
const dids: string[] = await registry.listDIDs();

// Remove a DID
await registry.remove("did:sol:123...");
```