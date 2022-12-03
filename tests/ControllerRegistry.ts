import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";
import { Wallet as EthWallet } from "@ethersproject/wallet";
import { ControllerRegistry, ReadOnlyControllerRegistry } from "../src";

import { DidRegistry } from "../target/types/did_registry";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  addEthAddressToDID,
  addKeyToDID,
  createDIDAndAddController,
  createDIDAndAddKey,
  initializeDIDAccount,
  toDid,
} from "./util/did";
import { createTestContext, fund } from "./util/anchorUtils";
import {
  DidSolIdentifier,
  DidSolService,
  ExtendedCluster,
} from "@identity.com/sol-did-client";
import { times } from "./util/lang";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("Controller Registry", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const cluster: ExtendedCluster = "localnet";

  const program = anchor.workspace.DidRegistry as Program<DidRegistry>;

  const did = DidSolIdentifier.create(
    provider.wallet.publicKey,
    cluster
  ).toString();

  const registry = ControllerRegistry.for(
    provider.wallet,
    did,
    program.provider.connection,
    cluster
  );

  // catch-all to ensure all tests start from an empty registry
  afterEach("close registry", () =>
    registry
      .close()
      .rpc()
      .catch((error) => {
        if (error.error.errorCode.code === "AccountNotInitialized") {
          // ignore - the test does not need the registry to be created
          return;
        }

        throw error;
      })
  );

  it("finds no controlled DIDs registered by default for a DID", async () => {
    expect(
      await ReadOnlyControllerRegistry.for(
        did,
        program.provider.connection,
        cluster
      ).listDIDs()
    ).to.be.empty;
  });

  it("fails to register a DID if the registry's DID is not a controller of it", async () => {
    const someOtherDid = toDid(Keypair.generate().publicKey);

    const shouldFail = registry
      .register(someOtherDid)
      .then((execution) => execution.rpc());

    return expect(shouldFail).to.be.rejectedWith(/NotController/);
  });

  it("can register a DID as controlled", async () => {
    const controlledDid = await createDIDAndAddController(did);

    await registry.register(controlledDid).then((execution) => execution.rpc());

    const registeredDids = await registry.listDIDs();

    expect(registeredDids).to.include(controlledDid);
  });

  it("cannot register the same DID twice", async () => {
    const controlledDid = await createDIDAndAddController(did);

    // works the first time
    await registry.register(controlledDid).then((execution) => execution.rpc());
    // fails the second time
    const shouldFail = registry
      .register(controlledDid)
      .then((execution) => execution.rpc());

    return expect(shouldFail).to.be.rejectedWith(/DIDRegistered/);
  });

  it("can remove a DID", async () => {
    const controlledDid = await createDIDAndAddController(did);
    await registry.register(controlledDid).then((execution) => execution.rpc());

    // the did is registered
    let registeredDids = await registry.listDIDs();

    expect(registeredDids).to.include(controlledDid);

    await registry.remove(controlledDid).rpc();

    // the did is no longer registered
    registeredDids = await registry.listDIDs();

    expect(registeredDids).not.to.include(controlledDid);
  });

  it("cannot remove a DID that was not registered", async () => {
    // set up the registry
    const controlledDid = await createDIDAndAddController(did);
    await registry.register(controlledDid).then((execution) => execution.rpc());

    // attempt to remove a non-registered DID
    const someDID = toDid(Keypair.generate().publicKey);
    const shouldFail = registry.remove(someDID).rpc();

    return expect(shouldFail).to.be.rejectedWith(/DIDNotRegistered/);
  });

  it("automatically resizes when registering more than four DIDs", async () => {
    const fiveDids = await Promise.all(
      times(5)(() => createDIDAndAddController(did))
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
      times(5)(() => createDIDAndAddController(did))
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
});
