# DID Registry

An on-chain protocol for registering did:sol DIDs against public keys or controller DIDs
allowing for reverse-lookup of the DID from the public key or its controller.

## Why

If a DID is known, it is possible to look up the public key(s) associated with it.

However, the reverse operation is not possible. Given a public key, it is not possible to
find all DIDs that it controls.

This reduces the usefulness of a DID for use-cases such as key rotation, where a new
public key is added to a DID, and the old one is removed.
In this case, the link between the public key and the DID identifier is severed;
the DID can not be derived from the new key.

Likewise, it is possible, given a DID to find other DIDs that control it,
but the reverse operation is not possible.

The DID registry solves this by allowing a DID to be registered against a public key or controller DID.

## How

This program defines two registry types:

KeyRegistry: A registry of DIDs controlled by a given key.
ControllerRegistry: A registry of DIDs controlled by a given controller DID.

In order to create or update the key registry, the transaction must be signed by the key itself.

In order to create or update the controller registry, the transaction must be signed by a key
that is an authority on the controller DID.

## Does this work for non-did:sol DIDs?

No. The DID registry is specific to did:sol DIDs. This is due to the constraints around
adding DIDs to the registry.
The program checks that the DID is controlled by the key or controller DID.
The program therefore needs access to the DID document,
which is only available on-chain for did:sol DIDs.

## What is the size limit of the registry?

The registry grows with the number of DIDs that are registered, up to a maximum determined by
Solana for accounts (10MB).

The initial reserved size is 4 DIDs (each DID is 32 bytes).

The client auto-grows if that limit is exceeded, but a manual resize is also possible through
the "resize" instructions.

## Does the DID registry support non-solana keys?

Yes, it is possible to register a DID against an EVM key using the registerDidForEthAddress instruction.
There is a client SDK, EthRegistry, for this purpose.

## Quick Start

```shell
yarn add @civic/did-registry
```

### Register a DID against a key, and lookup registered DIDs 

```ts
import { PublicKey } from "@solana/web3.js";
import { Registry } from '@civic/did-registry';

const provider = anchor.AnchorProvider.env();
const registry = Registry.for(provider.wallet, program.provider.connection);

// Register a DID
await registry.register("did:sol:123...");

// Lookup all registered DIDs
const dids: string[] = await registry.listDIDs();

// Remove a DID
await registry.remove("did:sol:123...");
```

### Eth Support

```ts
import { EthRegistry } from "@civic/did-registry";

const registry = new EthRegistry.forEthAddress("0x...", provider.wallet, program.provider.connection);

// Register a DID
await registry.register("did:sol:123...");
```

Sign with an eth key:

```ts
import { EthRegistry } from "@civic/did-registry";
import { Wallet } from "@ethersproject/wallet";

const registry = new EthRegistry.forEthAddress("0x...", provider.wallet, program.provider.connection);

// create an ethers wallet
const ethWallet = Wallet.createRandom();

// Register a DID
await registry.registerSigned("did:sol:123...", ethWallet);
```

### Register a DID against a controller DID

```ts
import { PublicKey } from "@solana/web3.js";
import { ControllerRegistry } from '@civic/did-registry';

const controllerDID = "did:sol:123...";
const controlledDID = "did:sol:456...";

const provider = anchor.AnchorProvider.env();
const registry = ControllerRegistry.for(provider.wallet, controllerDID, program.provider.connection);

// Register a controlled DID
await registry.register(controlledDID);
```