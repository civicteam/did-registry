import * as anchor from "@project-serum/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import { Registry, toDid } from '../src'
import { DidRegistry } from "../target/types/did_registry";

import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {addKeyToDID, initializeDIDAccount} from "./util/did";
import { createTestContext, fund } from "./util/anchorUtils";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("did-registry", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DidRegistry as Program<DidRegistry>;

  const registry = new Registry(provider.wallet, program.provider.connection);

  let registryKey: PublicKey;
  let bump: number;

  const register = (did: string) => registry.register(did);
  const remove = (did: string) => registry.remove(did);

  before(async () => {
    [registryKey, bump] = await registry.getRegistryAddressAndBump();
  });

  it("fails to register a DID if the key is not an authority", async () => {
    const someOtherDid = toDid(Keypair.generate().publicKey);

    const shouldFail = register(someOtherDid);

    return expect(shouldFail).to.be.rejectedWith(/NotAuthority/);
  });

  it("can register a generative DID", async () => {
    const did = toDid(provider.wallet.publicKey);
    await register(did);

    const registeredDids = await registry.listDIDs();

    expect(registeredDids).to.include(did);
  });

  it("fails to register a non-generative DID if the key is not an authority", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);

    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);

    const shouldFail = register(secondAuthorityDid);

    return expect(shouldFail).to.be.rejectedWith(/NotAuthority/);
  });

  it("can register a non-generative DID if the key has been added as an authority", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);

    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);

    // adding the key as an authority means that the key can now register the secondAuthorityDID in its registry
    await addKeyToDID(secondAuthority, program.provider.publicKey);

    await register(secondAuthorityDid);

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
    await register(secondAuthorityDid);
    // fails the second time
    const shouldFail = register(secondAuthorityDid);

    return expect(shouldFail).to.be.rejectedWith(/DIDRegistered/);
  });

  it("can remove a DID", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);
    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);
    await addKeyToDID(secondAuthority, program.provider.publicKey);

    await register(secondAuthorityDid);

    // the did is registered
    let registeredDids = await registry.listDIDs();

    expect(registeredDids).to.include(secondAuthorityDid);

    await remove(secondAuthorityDid);

    // the did is no longer registered
    registeredDids = await registry.listDIDs();

    expect(registeredDids).not.to.include(secondAuthorityDid);
  });

  it("cannot remove a DID that was not registered", async () => {
    const someDID = toDid(Keypair.generate().publicKey);

    const shouldFail = remove(someDID);

    return expect(shouldFail).to.be.rejectedWith(/DIDNotRegistered/);
  });
});
