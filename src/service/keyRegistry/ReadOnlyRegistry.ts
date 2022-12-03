import { Connection, PublicKey } from "@solana/web3.js";
import { ExtendedCluster } from "@identity.com/sol-did-client";
import {
  AbstractKeyRegistry,
  ETH_KEY_REGISTRY_SEED_PREFIX,
  KEY_REGISTRY_SEED_PREFIX,
} from "./AbstractKeyRegistry";
import { dummyAuthority } from "../../lib/constants";
import { makeProgram } from "../../lib/util";

export class ReadOnlyRegistry extends AbstractKeyRegistry {
  private constructor(
    connection: Connection,
    address: Uint8Array,
    seedPrefix: string,
    cluster: ExtendedCluster
  ) {
    super(address, seedPrefix, cluster);
    this.program = makeProgram(connection, dummyAuthority);
  }

  static for(
    publicKey: PublicKey,
    connection: Connection,
    cluster: ExtendedCluster = "mainnet-beta"
  ): ReadOnlyRegistry {
    return new ReadOnlyRegistry(
      connection,
      publicKey.toBuffer(),
      KEY_REGISTRY_SEED_PREFIX,
      cluster
    );
  }

  static forEthAddress(
    ethAddress: string,
    connection: Connection,
    cluster: ExtendedCluster = "mainnet-beta"
  ): ReadOnlyRegistry {
    const trimmedEthAddress = ethAddress.substring(2); // without 0x
    return new ReadOnlyRegistry(
      connection,
      Buffer.from(trimmedEthAddress, "hex"),
      ETH_KEY_REGISTRY_SEED_PREFIX,
      cluster
    );
  }
}
