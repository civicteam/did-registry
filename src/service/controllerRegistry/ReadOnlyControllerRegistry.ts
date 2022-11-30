import { Connection, PublicKey } from "@solana/web3.js";
import {
  DidSolIdentifier,
  ExtendedCluster,
} from "@identity.com/sol-did-client";
import { dummyAuthority } from "../../lib/constants";
import { makeProgram } from "../../lib/util";
import {
  AbstractControllerRegistry,
  CONTROLLER_REGISTRY_SEED_PREFIX,
} from "./AbstractControllerRegistry";

export class ReadOnlyControllerRegistry extends AbstractControllerRegistry {
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
    did: string,
    connection: Connection,
    cluster: ExtendedCluster = "mainnet-beta"
  ): ReadOnlyControllerRegistry {
    return new ReadOnlyControllerRegistry(
      connection,
      DidSolIdentifier.parse(did).authority.toBuffer(),
      CONTROLLER_REGISTRY_SEED_PREFIX,
      cluster
    );
  }
}
