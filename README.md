# DID Registry

An on-chain protocol for registering did:sol DIDs against public keys,
allowing for reverse-lookup of the DID from the public key.

## Quick Start

Using the anchor client:

```ts
import {PublicKey} from "@solana/web3.js";

const provider = anchor.AnchorProvider.env();
const registry = new Registry(provider.wallet, program.provider.connection);


// Register a DID
await registry.register()
```