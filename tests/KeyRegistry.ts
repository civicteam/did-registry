import * as anchor from "@project-serum/anchor";
import { Program, Provider } from "@project-serum/anchor";
import { Keypair, Transaction } from "@solana/web3.js";
import { Wallet as EthWallet } from "@ethersproject/wallet";
import { EthRegistry, ReadOnlyRegistry, Registry } from "../src";

import { DidRegistry } from "../target/types/did_registry";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  addEthAddressToDID,
  addKeyToDID,
  addKeyToDIDExecution,
  createDIDAndAddKey,
  initializeDIDAccount,
  toDid,
} from "./util/did";
import { createTestContext, fund, Wallet } from "./util/anchorUtils";
import { ExtendedCluster } from "@identity.com/sol-did-client";
import { times } from "./util/lang";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("Key Registry", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const cluster: ExtendedCluster = "localnet";

  const ethWallet = EthWallet.createRandom();

  const program = anchor.workspace.DidRegistry as Program<DidRegistry>;

  const registry = Registry.for(provider.wallet, provider.connection, cluster);

  const ethRegistry = EthRegistry.forEthAddress(
    ethWallet.address,
    provider.wallet,
    provider.connection,
    cluster
  );

  // catch-all to ensure all tests start from an empty registry
  afterEach("close registry", () =>
    registry
      .close()
      .rpc()
      .catch((error) => {
        // anchor errors have this fun property structure...
        if (error?.error?.errorCode?.code === "AccountNotInitialized") {
          // ignore - the test does not need the registry to be created
          return;
        }

        throw error;
      })
  );

  it("finds no DIDs registered by default for a Sol key", async () => {
    expect(
      await ReadOnlyRegistry.for(
        provider.wallet.publicKey,
        provider.connection,
        cluster
      ).listDIDs()
    ).to.be.empty;
  });

  it("finds no DIDs registered by default for an ethereum key", async () => {
    expect(
      await ReadOnlyRegistry.forEthAddress(
        ethWallet.address,
        provider.connection,
        cluster
      ).listDIDs()
    ).to.be.empty;
  });

  it("fails to register a DID if the key is not an authority", async () => {
    const someOtherDid = toDid(Keypair.generate().publicKey);

    const shouldFail = registry
      .register(someOtherDid)
      .then((execution) => execution.rpc());

    return expect(shouldFail).to.be.rejectedWith(/NotAuthority/);
  });

  it("can register a generative DID", async () => {
    const did = toDid(provider.wallet.publicKey);
    await registry.register(did).then((execution) => execution.rpc());

    const registeredDids = await registry.listDIDs();

    expect(registeredDids).to.include(did);
  });

  it("fails to register a non-generative DID if the key is not an authority", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);

    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);

    const shouldFail = registry
      .register(secondAuthorityDid)
      .then((execution) => execution.rpc());

    return expect(shouldFail).to.be.rejectedWith(/NotAuthority/);
  });

  it("can register a non-generative DID if the key has been added as an authority", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);

    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);

    // adding the key as an authority means that the key can now register the secondAuthorityDID in its registry
    await addKeyToDID(secondAuthority, program.provider.publicKey);

    await registry
      .register(secondAuthorityDid)
      .then((execution) => execution.rpc());

    const registeredDids = await registry.listDIDs();

    expect(registeredDids).to.include(secondAuthorityDid);
  });

  it("can add a key to a DID, and register that DID against the key in the same transaction", async () => {
    const { authority: secondAuthority, keypair: secondKeypair } =
      createTestContext();
    await fund(secondAuthority.publicKey);

    // This is the DID that is having the key (provider.publicKey) added to it
    const didToRegister = toDid(secondAuthority.publicKey);

    // Returns two instructions: Initialize and AddVerificationMethod
    const addKeyToDIDInstructions = await addKeyToDIDExecution(
      secondAuthority,
      provider.publicKey
    ).instructions();

    // Returns two instructions: CreateKeyRegistry and RegisterDID
    const registerDIDInstructions = await registry
      .register(didToRegister)
      .then((execution) => execution.transaction())
      .then((transaction) => transaction.instructions);

    const allInstructions = [
      ...addKeyToDIDInstructions,
      ...registerDIDInstructions,
    ];

    // So total, four instructions
    expect(allInstructions.length).to.equal(4);

    // Execute all instructions - signers are the registry key holder and an existing authority on didToRegister
    await provider.sendAndConfirm(new Transaction().add(...allInstructions), [
      secondKeypair,
    ]);

    // Check the did was added to the registry
    const registeredDids = await registry.listDIDs();
    expect(registeredDids).to.include(didToRegister);
  });

  it("cannot register the same DID twice", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);

    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);

    // adding the key as an authority means that the key can now register the secondAuthorityDID in its registry
    await addKeyToDID(secondAuthority, program.provider.publicKey);

    // works the first time
    await registry
      .register(secondAuthorityDid)
      .then((execution) => execution.rpc());
    // fails the second time
    const shouldFail = registry
      .register(secondAuthorityDid)
      .then((execution) => execution.rpc());

    return expect(shouldFail).to.be.rejectedWith(/DIDRegistered/);
  });

  it("can remove a DID", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);
    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);
    await addKeyToDID(secondAuthority, program.provider.publicKey);

    await registry
      .register(secondAuthorityDid)
      .then((execution) => execution.rpc());

    // the did is registered
    let registeredDids = await registry.listDIDs();

    expect(registeredDids).to.include(secondAuthorityDid);

    await registry.remove(secondAuthorityDid).rpc();

    // the did is no longer registered
    registeredDids = await registry.listDIDs();

    expect(registeredDids).not.to.include(secondAuthorityDid);
  });

  it("can remove and re-add a DID", async () => {
    const { authority: secondAuthority } = createTestContext();
    await fund(secondAuthority.publicKey);
    const secondAuthorityDid = await initializeDIDAccount(secondAuthority);
    await addKeyToDID(secondAuthority, program.provider.publicKey);

    await registry
      .register(secondAuthorityDid)
      .then((execution) => execution.rpc());

    // the did is registered
    let registeredDids = await registry.listDIDs();
    expect(registeredDids).to.include(secondAuthorityDid);

    await registry.remove(secondAuthorityDid).rpc();

    // the did is no longer registered
    registeredDids = await registry.listDIDs();
    expect(registeredDids).not.to.include(secondAuthorityDid);

    await registry
      .register(secondAuthorityDid)
      .then((execution) => execution.rpc());

    // the did is registered again
    registeredDids = await registry.listDIDs();
    expect(registeredDids).to.include(secondAuthorityDid);
  });

  it("cannot remove a DID that was not registered", async () => {
    // set up the registry
    const did = toDid(provider.wallet.publicKey);
    await registry.register(did).then((execution) => execution.rpc());

    // attempt to remove a non-registered DID
    const someDID = toDid(Keypair.generate().publicKey);
    const shouldFail = registry.remove(someDID).rpc();

    return expect(shouldFail).to.be.rejectedWith(/DIDNotRegistered/);
  });

  it("can register a DID against an eth key", async () => {
    const did = toDid(provider.wallet.publicKey);

    await initializeDIDAccount(provider.wallet);
    await addEthAddressToDID(provider.wallet, ethWallet.address);

    await ethRegistry.register(did).then((execution) => execution.rpc());

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
    await ethRegistry
      .registerSigned(did, ethWallet)
      .then((execution) => execution.rpc());

    const registeredDids = await ethRegistry.listDIDs();

    expect(registeredDids).to.include(did);
  });

  it("automatically resizes when registering more than four DIDs", async () => {
    const fiveDids = await Promise.all(
      times(5)(() => createDIDAndAddKey(program.provider.publicKey))
    );

    // these four work
    await registry.register(fiveDids[0]).then((execution) => execution.rpc());
    await registry.register(fiveDids[1]).then((execution) => execution.rpc());
    await registry.register(fiveDids[2]).then((execution) => execution.rpc());
    await registry.register(fiveDids[3]).then((execution) => execution.rpc());

    const spaceBefore = await registry.analyseSpace();

    // this one works after a resize
    await registry.register(fiveDids[4]).then((execution) => execution.rpc());

    // check all dids are present
    const registeredDids = await registry.listDIDs();
    expect(registeredDids).to.deep.equal(fiveDids);

    // check the account was resized
    const spaceAfter = await registry.analyseSpace();
    expect(spaceAfter.maxCount).to.be.gt(spaceBefore.maxCount);
  });

  it("successfully registers more than four DIDs after a manual resize", async () => {
    const fiveDids = await Promise.all(
      times(5)(() => createDIDAndAddKey(program.provider.publicKey))
    );

    // these four work before resizing
    await registry.register(fiveDids[0]).then((execution) => execution.rpc());
    await registry.register(fiveDids[1]).then((execution) => execution.rpc());
    await registry.register(fiveDids[2]).then((execution) => execution.rpc());
    await registry.register(fiveDids[3]).then((execution) => execution.rpc());

    // resizes
    await registry.resize(5).rpc();

    // now this one will also pass
    await registry.register(fiveDids[4]).then((execution) => execution.rpc());

    // check all dids are present
    const registeredDids = await registry.listDIDs();
    expect(registeredDids).to.deep.equal(fiveDids);
  });

  context("with a separate payer", () => {
    let payerKeypair: Keypair;
    let payerProvider: Provider;
    let registryWithSeparatePayer: Registry;
    let payerAuthority: Wallet;

    // create (and fund) a new payer each time
    beforeEach("create payer", async () => {
      ({
        keypair: payerKeypair,
        authority: payerAuthority,
        provider: payerProvider,
      } = createTestContext());
      registryWithSeparatePayer = Registry.for(
        provider.wallet,
        provider.connection,
        cluster,
        payerKeypair.publicKey
      );
      await fund(payerKeypair.publicKey, 10_000_000);
    });

    it("can register a generative DID", async () => {
      const did = toDid(provider.wallet.publicKey);
      const tx = await registryWithSeparatePayer
        .register(did)
        .then((execution) => execution.transaction());

      const authorityPrebalance = await provider.connection.getBalance(
        provider.wallet.publicKey
      );

      // setting the fee payer and recentBlockhash so that the authority's wallet can sign
      tx.feePayer = payerKeypair.publicKey;
      const blockhash = await payerProvider.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash.blockhash;

      const partiallySignedTx = await provider.wallet.signTransaction(tx);

      // use the payerProvider to send to ensure the fee payer is the rent payer

      // this fails because the provider is putting another recentBlockhash on the tx, and resigning.
      // await payerProvider.sendAndConfirm(partiallySignedTx, [], { commitment: 'confirmed' });

      const fullySignedTx = await payerAuthority.signTransaction(
        partiallySignedTx
      );
      const txSig = await provider.connection.sendRawTransaction(
        fullySignedTx.serialize()
      );
      await provider.connection.confirmTransaction({
        signature: txSig,
        ...blockhash,
      });

      const authorityPostbalance = await provider.connection.getBalance(
        provider.wallet.publicKey
      );

      const registeredDids = await registryWithSeparatePayer.listDIDs();

      expect(registeredDids).to.include(did);

      // the authority did not pay for rent or network fee
      expect(authorityPrebalance).to.equal(authorityPostbalance);
    });

    it("can resize a DID registry", async () => {
      const did = toDid(provider.wallet.publicKey);

      // set up the registry
      const setupTx = await registryWithSeparatePayer
        .register(did)
        .then((execution) => execution.transaction());
      await provider.sendAndConfirm(setupTx, [payerKeypair]);

      console.log({
        payer: payerKeypair.publicKey.toBase58(),
        authority: provider.wallet.publicKey.toBase58(),
      });

      // resize it
      const resizeTx = await registryWithSeparatePayer.resize(10).transaction();
      await provider.sendAndConfirm(resizeTx, [payerKeypair]);

      // we are happy as long as the tx passes
    });

    it("can close a DID registry", async () => {
      const did = toDid(provider.wallet.publicKey);

      // set up the registry
      const setupTx = await registryWithSeparatePayer
        .register(did)
        .then((execution) => execution.transaction());
      await provider.sendAndConfirm(setupTx, [payerKeypair]);

      // close it
      const closeTx = await registryWithSeparatePayer.close().transaction();
      await provider.sendAndConfirm(closeTx, [payerKeypair]);

      // we are happy as long as the tx passes
    });
  });
});
