import { PublicKey } from "@solana/web3.js";
import {
  DidSolIdentifier,
  ExtendedCluster,
} from "@identity.com/sol-did-client";
import { CommonRegistry } from "../../lib/CommonRegistry";
import { DidAccount } from "../../types";

export const CONTROLLER_REGISTRY_SEED_PREFIX = "controller_registry";

export abstract class AbstractControllerRegistry extends CommonRegistry {
  protected constructor(
    address: Uint8Array,
    seedPrefix: string,
    cluster: ExtendedCluster
  ) {
    super(address, seedPrefix, cluster);
  }

  protected didAddressToAccount(): DidAccount {
    const didSolIdentifier = DidSolIdentifier.create(
      new PublicKey(this.address),
      this.cluster
    );
    const [didAccount, didBump] = didSolIdentifier.dataAccount();
    return {
      authority: didSolIdentifier.authority,
      account: didAccount,
      bump: didBump,
    };
  }

  /**
   * Given a did count, calculate the size in bytes of the registry required to store it.
   *
   * NOTE: This must stay in sync with ControllerRegistry::calculate_size in the program.
   */
  protected static calculateMaxCount(sizeInBytes: number): number {
    const didSpace =
      sizeInBytes -
      8 - // discriminator
      1 - // version
      32 - // key
      4; // vec length field
    return Math.floor(didSpace / 32);
  }

  /**
   * Given a registry, analyse how many DIDs it contains, and how many it can store
   * @protected
   */
  public async analyseSpace(): Promise<{
    count: number;
    maxCount: number;
    sizeBytes: number;
  }> {
    const registryAccountInfo =
      await this.program.account.controllerRegistry.getAccountInfo(
        this.registryAddress
      );

    if (!registryAccountInfo) return { count: 0, maxCount: 0, sizeBytes: 0 };

    const sizeBytes = registryAccountInfo.data.length;

    const coder = this.program.account.controllerRegistry.coder.accounts;
    const account = coder.decode(
      "controllerRegistry",
      registryAccountInfo.data
    );
    const didCount = account.controlledDids.length;
    const maxCount = AbstractControllerRegistry.calculateMaxCount(sizeBytes);

    return { count: didCount, maxCount, sizeBytes };
  }

  async listDIDs(): Promise<string[]> {
    const registryAccount =
      await this.program.account.controllerRegistry.fetchNullable(
        this.registryAddress
      );

    if (!registryAccount) return [];

    return registryAccount.controlledDids.map((identifier: PublicKey) =>
      DidSolIdentifier.create(identifier, this.cluster).toString()
    );
  }
}
