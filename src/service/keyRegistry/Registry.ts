import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { ExtendedCluster } from "@identity.com/sol-did-client";
import {
  AbstractKeyRegistry,
  KEY_REGISTRY_SEED_PREFIX,
} from "./AbstractKeyRegistry";
import { SPACE_BUFFER } from "../../lib/constants";
import { Execution, Wallet } from "../../types";
import { makeProgram } from "../../lib/util";

export class Registry extends AbstractKeyRegistry {
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
      await this.program.account.keyRegistry.fetchNullable(
        this.registryAddress
      );

    if (registryAccount) return null;

    return this.program.methods
      .createKeyRegistry(this.registryBump)
      .accounts({
        registry: this.registryAddress,
        authority: this.wallet.publicKey,
      })
      .instruction();
  }

  protected async resizeInstructionIfNeeded(): Promise<TransactionInstruction | null> {
    const space = await this.analyseSpace();

    if (space.count < space.maxCount) return null;

    return this.program.methods
      .resizeKeyRegistry(space.count + SPACE_BUFFER)
      .accounts({
        registry: this.registryAddress,
        authority: this.wallet.publicKey,
      })
      .instruction();
  }

  async register(did: string): Promise<Execution> {
    const account = this.didToAccount(did);

    const initInstruction = await this.initInstructionIfNeeded();
    const resizeInstruction = await this.resizeInstructionIfNeeded();
    const preInstructions = [
      ...(initInstruction ? [initInstruction] : []),
      ...(resizeInstruction ? [resizeInstruction] : []),
    ];

    return this.program.methods
      .registerDid(account.bump)
      .accounts({
        registry: this.registryAddress,
        authority: this.wallet.publicKey,
        did: account.authority,
        didAccount: account.account,
      })
      .preInstructions(preInstructions);
  }

  removePubkey(did: PublicKey): Execution {
    return this.program.methods.removeDid().accounts({
      registry: this.registryAddress,
      authority: this.wallet.publicKey,
      did,
    });
  }

  remove(did: string): Execution {
    const account = this.didToAccount(did);
    return this.removePubkey(account.authority);
  }

  resize(did_count: number): Execution {
    return this.program.methods.resizeKeyRegistry(did_count).accounts({
      registry: this.registryAddress,
      authority: this.wallet.publicKey,
    });
  }

  close(): Execution {
    return this.program.methods.closeKeyRegistry().accounts({
      registry: this.registryAddress,
      authority: this.wallet.publicKey,
    });
  }

  static for(
    wallet: Wallet,
    connection: Connection,
    cluster: ExtendedCluster = "mainnet-beta"
  ) {
    return new Registry(
      wallet,
      connection,
      wallet.publicKey.toBuffer(),
      KEY_REGISTRY_SEED_PREFIX,
      cluster
    );
  }
}
