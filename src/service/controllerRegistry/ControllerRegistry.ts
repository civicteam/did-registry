import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  DidSolIdentifier,
  ExtendedCluster,
} from "@identity.com/sol-did-client";
import { SPACE_BUFFER } from "../../lib/constants";
import { Execution, Wallet } from "../../types";
import { makeProgram } from "../../lib/util";
import {
  AbstractControllerRegistry,
  CONTROLLER_REGISTRY_SEED_PREFIX,
} from "./AbstractControllerRegistry";

export class ControllerRegistry extends AbstractControllerRegistry {
  protected constructor(
    protected wallet: Wallet,
    connection: Connection,
    address: Uint8Array,
    seedPrefix: string,
    cluster: ExtendedCluster
  ) {
    super(address, seedPrefix, cluster);
    this.program = makeProgram(connection, wallet);
  }

  protected async initInstructionIfNeeded(): Promise<TransactionInstruction | null> {
    const registryAccount =
      await this.program.account.controllerRegistry.fetchNullable(
        this.registryAddress
      );

    if (registryAccount) return null;

    const account = this.didAddressToAccount();

    console.log({
      registry: this.registryAddress.toBase58(),
      authority: this.wallet.publicKey.toBase58(),
      did: account.authority.toBase58(),
      didAccount: account.account.toBase58(),
    });

    return this.program.methods
      .createControllerRegistry(this.registryBump, account.bump)
      .accounts({
        registry: this.registryAddress,
        authority: this.wallet.publicKey,
        did: account.authority,
        didAccount: account.account,
      })
      .instruction();
  }

  protected async resizeInstructionIfNeeded(): Promise<TransactionInstruction | null> {
    const space = await this.analyseSpace();

    // no need to resize if there is enough space, or if there is no space at all
    // (indicating the account is not yet initialised)
    if (space.count < space.maxCount || space.maxCount === 0) return null;

    return this.program.methods
      .resizeControllerRegistry(space.count + SPACE_BUFFER)
      .accounts({
        registry: this.registryAddress,
        authority: this.wallet.publicKey,
      })
      .instruction();
  }

  async register(did: string): Promise<Execution> {
    const initInstruction = await this.initInstructionIfNeeded();
    const resizeInstruction = await this.resizeInstructionIfNeeded();
    const preInstructions = [
      ...(initInstruction ? [initInstruction] : []),
      ...(resizeInstruction ? [resizeInstruction] : []),
    ];

    const controlledDidAccount = this.didToAccount(did);
    const didAccount = this.didAddressToAccount();

    console.log({
      registry: this.registryAddress.toBase58(),
      authority: this.wallet.publicKey.toBase58(),
      controlledDid: controlledDidAccount.authority.toBase58(),
      controlledDidAccount: controlledDidAccount.account.toBase58(),
      didAccount: didAccount.account.toBase58(),
    });

    return this.program.methods
      .registerControlledDid(didAccount.bump, controlledDidAccount.bump)
      .accounts({
        registry: this.registryAddress,
        authority: this.wallet.publicKey,
        controlledDid: controlledDidAccount.authority,
        controlledDidAccount: controlledDidAccount.account,
        didAccount: didAccount.account,
      })
      .preInstructions(preInstructions);
  }

  removePubkey(did: PublicKey): Execution {
    const didAccount = this.didAddressToAccount();
    return this.program.methods.removeControlledDid(didAccount.bump).accounts({
      registry: this.registryAddress,
      authority: this.wallet.publicKey,
      didToRemove: did,
      didAccount: didAccount.account,
    });
  }

  remove(did: string): Execution {
    const account = this.didToAccount(did);
    return this.removePubkey(account.authority);
  }

  resize(did_count: number): Execution {
    return this.program.methods.resizeControllerRegistry(did_count).accounts({
      registry: this.registryAddress,
      authority: this.wallet.publicKey,
    });
  }

  close(): Execution {
    return this.program.methods.closeControllerRegistry().accounts({
      registry: this.registryAddress,
      authority: this.wallet.publicKey,
    });
  }

  static for(
    wallet: Wallet,
    did: string,
    connection: Connection,
    cluster: ExtendedCluster = "mainnet-beta"
  ) {
    return new ControllerRegistry(
      wallet,
      connection,
      DidSolIdentifier.parse(did).authority.toBuffer(),
      CONTROLLER_REGISTRY_SEED_PREFIX,
      cluster
    );
  }
}
