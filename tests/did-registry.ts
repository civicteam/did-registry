import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";
import { Wallet as EthWallet } from "@ethersproject/wallet";
import { EthRegistry, ReadOnlyRegistry, Registry } from "../src";

import { DidRegistry } from "../target/types/did_registry";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  addEthAddressToDID,
  addKeyToDID,
  initializeDIDAccount,
  toDid,
} from "./util/did";
import { createTestContext, fund } from "./util/anchorUtils";
import { ExtendedCluster } from "@identity.com/sol-did-client";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("did-registry", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const cluster: ExtendedCluster = "localnet";

  const ethWallet = EthWallet.createRandom();

  const program = anchor.workspace.DidRegistry as Program<DidRegistry>;

  const registry = Registry.for(
    provider.wallet,
    program.provider.connection,
    cluster
  );
  const ethRegistry = EthRegistry.forEthAddress(
    ethWallet.address,
    provider.wallet,
    program.provider.connection,
    cluster
  );

  it("finds no DIDs registered by default for a Sol key", async () => {
    expect(
      await ReadOnlyRegistry.for(
        provider.wallet.publicKey,
        program.provider.connection,
        cluster
      ).listDIDs()
    ).to.be.empty;
  });

  it("finds no DIDs registered by default for an ethereum key", async () => {
    expect(
      await ReadOnlyRegistry.forEthAddress(
        ethWallet.address,
        program.provider.connection,
        cluster
      ).listDIDs()
    ).to.be.empty;
  });

  it("fails to register a DID if the key is not an authority", async () => {
    const someOtherDid = toDid(Keypair.generate().publicKey);

    const shouldFail = registry.register(someOtherDid);

    return expect(shouldFail).to.be.rejectedWith(/NotAuthority/);
  });

  it("can register a generative DID", async () => {
    const did = toDid(provider.wallet.publicKey);
    await registry.register(did);

    const registeredDids = await registry.listDIDs();

    expect(registeredDids).to.include(did);
  });

  it("fails to register a non-generative DID if the key is not an authority", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);

    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);

    const shouldFail = registry.register(secondAuthorityDid);

    return expect(shouldFail).to.be.rejectedWith(/NotAuthority/);
  });

  it("can register a non-generative DID if the key has been added as an authority", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);

    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);

    // adding the key as an authority means that the key can now register the secondAuthorityDID in its registry
    await addKeyToDID(secondAuthority, program.provider.publicKey);

    await registry.register(secondAuthorityDid);

    const registeredDids = await registry.listDIDs();

    expect(registeredDids).to.include(secondAuthorityDid);
  });

  it("cannot register the same DID twice", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);

    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);

    // adding the key as an authority means that the key can now register the secondAuthorityDID in its registry
    await addKeyToDID(secondAuthority, program.provider.publicKey);

    // works the first time
    await registry.register(secondAuthorityDid);
    // fails the second time
    const shouldFail = registry.register(secondAuthorityDid);

    return expect(shouldFail).to.be.rejectedWith(/DIDRegistered/);
  });

  it("can remove a DID", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);
    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);
    await addKeyToDID(secondAuthority, program.provider.publicKey);

    await registry.register(secondAuthorityDid);

    // the did is registered
    let registeredDids = await registry.listDIDs();

    expect(registeredDids).to.include(secondAuthorityDid);

    await registry.remove(secondAuthorityDid);

    // the did is no longer registered
    registeredDids = await registry.listDIDs();

    expect(registeredDids).not.to.include(secondAuthorityDid);
  });

  it("cannot remove a DID that was not registered", async () => {
    const someDID = toDid(Keypair.generate().publicKey);

    const shouldFail = registry.remove(someDID);

    return expect(shouldFail).to.be.rejectedWith(/DIDNotRegistered/);
  });

  it("can register a DID against an eth key", async () => {
    const did = toDid(provider.wallet.publicKey);

    await initializeDIDAccount(provider.wallet);
    await addEthAddressToDID(provider.wallet, ethWallet.address);

    await ethRegistry.register(did);

    const registeredDids = await ethRegistry.listDIDs();

    expect(registeredDids).to.include(did);
  });

  it("can register a DID, signed with an eth key", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);
    const did = toDid(secondAuthority.publicKey);

    await initializeDIDAccount(secondAuthority);
    await addEthAddressToDID(secondAuthority, ethWallet.address);

    // note, the ethRegistry is using a separate wallet (not secondAuthority) to pay for the transaction
    // the only authority needed on the DID is the ethWallet
    await ethRegistry.registerSigned(did, ethWallet);

    const registeredDids = await ethRegistry.listDIDs();

    expect(registeredDids).to.include(did);
  });
});
