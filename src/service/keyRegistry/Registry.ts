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
  // Pays for registry updates (defaults to the authority)
  protected payer: PublicKey;

  protected constructor(
    protected wallet: Wallet,
    connection: Connection,
    address: Uint8Array,
    seedPrefix: string,
    cluster: ExtendedCluster,
    payer?: PublicKey
  ) {
    super(address, seedPrefix, cluster);
    this.program = makeProgram(connection, wallet);
    this.payer = payer || wallet.publicKey;
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
        payer: this.payer,
        authority: this.wallet.publicKey,
      })
      .instruction();
  }

  protected async resizeInstructionIfNeeded(): Promise<TransactionInstruction | null> {
    const space = await this.analyseSpace();

    // If we have space, don't resize
    // Also, don't resize if maxCount is at 0, as this indicates that the registry is not yet initialised
    // Doing so is the job of the initInstruction
    if (space.count < space.maxCount || space.maxCount === 0) return null;

    return this.program.methods
      .resizeKeyRegistry(space.count + SPACE_BUFFER)
      .accounts({
        registry: this.registryAddress,
        authority: this.wallet.publicKey,
        payer: this.payer,
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
      payer: this.payer,
    });
  }

  close(): Execution {
    return this.program.methods.closeKeyRegistry().accounts({
      registry: this.registryAddress,
      authority: this.wallet.publicKey,
      payer: this.payer,
    });
  }

  static for(
    wallet: Wallet,
    connection: Connection,
    cluster: ExtendedCluster = "mainnet-beta",
    payer?: PublicKey
  ) {
    return new Registry(
      wallet,
      connection,
      wallet.publicKey.toBuffer(),
      KEY_REGISTRY_SEED_PREFIX,
      cluster,
      payer
    );
  }
}
