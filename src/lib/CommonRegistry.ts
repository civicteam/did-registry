import { Program } from "@project-serum/anchor";
import { DidRegistry } from "../types/did_registry";
import {
  DidSolIdentifier,
  ExtendedCluster,
} from "@identity.com/sol-did-client";
import { PublicKey } from "@solana/web3.js";
import { DidAccount } from "../types";
import { DID_REGISTRY_PROGRAM_ID } from "./constants";
import { confirm } from "./util";

/**
 * A common base class for all registries (key and controller)
 */
export abstract class CommonRegistry {
  protected program: Program<DidRegistry>;
  protected cluster: ExtendedCluster;
  protected address: Uint8Array;
  protected seedPrefix: string;
  protected registryAddress: PublicKey;
  protected registryBump: number;

  protected constructor(
    address: Uint8Array,
    seedPrefix: string,
    cluster: ExtendedCluster
  ) {
    this.address = address;
    this.seedPrefix = seedPrefix;
    this.cluster = cluster;
    [this.registryAddress, this.registryBump] =
      this.getRegistryAddressAndBump();
  }

  private async confirm(txSig: string): Promise<void> {
    return confirm(this.program.provider.connection, txSig);
  }

  /**
   * Given a registry, analyse how many DIDs it contains, and how many it can store
   * @protected
   */
  public abstract analyseSpace(): Promise<{
    count: number;
    maxCount: number;
    sizeBytes: number;
  }>;

  protected didToAccount(did: string): DidAccount {
    const didSolIdentifier = DidSolIdentifier.parse(did);
    const [didAccount, didBump] = didSolIdentifier.dataAccount();
    return {
      authority: didSolIdentifier.authority,
      account: didAccount,
      bump: didBump,
    };
  }

  public getRegistryAddressAndBump(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(this.seedPrefix), this.address],
      DID_REGISTRY_PROGRAM_ID
    );
  }
}
