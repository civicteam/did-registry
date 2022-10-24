import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@project-serum/anchor";
import { Connection } from "@solana/web3.js";
import { Wallet as EthWallet } from "@ethersproject/wallet";
import { DidRegistry, IDL } from "./types/did_registry";
import {
  DidSolIdentifier,
  ExtendedCluster,
} from "@identity.com/sol-did-client";
import { arrayify } from "@ethersproject/bytes";
import BN from "bn.js";

export type Execution = {
  rpc(): Promise<string>;
  transaction(): Promise<Transaction>;
  instruction(): Promise<TransactionInstruction>;
};

export const DID_REGISTRY_PROGRAM_ID = new PublicKey(
  "regUajGv87Pti6QRLeeRuQWrarQ1LmEyDXcAozko6Ax"
);
export const KEY_REGISTRY_SEED_PREFIX = "key_registry";
export const ETH_KEY_REGISTRY_SEED_PREFIX = "eth_key_registry";

// The exported Anchor wallet type is messed up at the moment, so we define it indirectly here
export type Wallet = AnchorProvider["wallet"];

type DidAccount = {
  authority: PublicKey;
  account: PublicKey;
  bump: number;
};

export abstract class ARegistry {
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

  async listDIDs(): Promise<string[]> {
    const registryAccount =
      await this.program.account.keyRegistry.fetchNullable(
        this.registryAddress
      );

    if (!registryAccount) return [];

    return registryAccount.dids.map((identifier: PublicKey) =>
      DidSolIdentifier.create(identifier, this.cluster).toString()
    );
  }
}

export class ReadOnlyRegistry extends ARegistry {
  private constructor(
    connection: Connection,
    address: Uint8Array,
    seedPrefix: string,
    cluster: ExtendedCluster
  ) {
    super(address, seedPrefix, cluster);
    const dummyAuthority = {
      publicKey: new PublicKey("11111111111111111111111111111111"),
      signTransaction: async () => {
        throw new Error("Not implemented");
      },
      signAllTransactions: async () => {
        throw new Error("Not implemented");
      },
    };
    const anchorProvider = new AnchorProvider(connection, dummyAuthority, {});

    this.program = new Program<DidRegistry>(
      IDL,
      DID_REGISTRY_PROGRAM_ID,
      anchorProvider
    );
  }

  static for(
    publicKey: PublicKey,
    connection: Connection,
    cluster: ExtendedCluster = "mainnet-beta"
  ) {
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
  ) {
    const trimmedEthAddress = ethAddress.substring(2); // without 0x
    return new ReadOnlyRegistry(
      connection,
      Buffer.from(trimmedEthAddress, "hex"),
      ETH_KEY_REGISTRY_SEED_PREFIX,
      cluster
    );
  }
}

export class Registry extends ARegistry {
  protected constructor(
    protected wallet: Wallet,
    connection: Connection,
    address: Uint8Array,
    seedPrefix: string,
    cluster: ExtendedCluster
  ) {
    super(address, seedPrefix, cluster);
    this.program = new Program<DidRegistry>(
      IDL,
      DID_REGISTRY_PROGRAM_ID,
      new AnchorProvider(connection, wallet, {})
    );
  }

  private async confirm(txSig: string): Promise<void> {
    const blockhash =
      await this.program.provider.connection.getLatestBlockhash();
    await this.program.provider.connection.confirmTransaction(
      {
        ...blockhash,
        signature: txSig,
      },
      "confirmed"
    );
  }

  protected async initInstruction(): Promise<TransactionInstruction | null> {
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

  async register(did: string): Promise<Execution> {
    const account = this.didToAccount(did);

    const initInstruction = await this.initInstruction();
    const initInstructions = initInstruction ? [initInstruction] : [];

    return this.program.methods
      .registerDid(account.bump)
      .accounts({
        registry: this.registryAddress,
        authority: this.wallet.publicKey,
        did: account.authority,
        didAccount: account.account,
      })
      .preInstructions(initInstructions);
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

export class EthRegistry extends Registry {
  static forEthAddress(
    ethAddress: string,
    wallet: Wallet,
    connection: Connection,
    cluster: ExtendedCluster = "mainnet-beta"
  ) {
    const trimmedEthAddress = ethAddress.substring(2); // without 0x
    return new EthRegistry(
      wallet,
      connection,
      Buffer.from(trimmedEthAddress, "hex"),
      ETH_KEY_REGISTRY_SEED_PREFIX,
      cluster
    );
  }

  async register(did: string): Promise<Execution> {
    const account = this.didToAccount(did);

    return this.program.methods
      .registerDidForEthAddress(Array.from(this.address), account.bump)
      .accounts({
        registry: this.registryAddress,
        authority: this.wallet.publicKey,
        did: account.authority,
        didAccount: account.account,
      });
  }

  private async ethSignMessage(
    message: Buffer,
    signer: EthWallet
  ): Promise<{ signature: number[]; recoveryId: number }> {
    // We do not use a dynamic nonce here - there is no risk of replay when adding a DID to a registry
    const staticNonce = Buffer.from(new BN(0).toArray("le", 8));
    const messageToSign = Buffer.concat([message, staticNonce]);
    const signatureFull = await signer.signMessage(messageToSign);

    const signatureBytes = arrayify(signatureFull);
    const signature = Array.from(signatureBytes.slice(0, -1));
    // // map [0x1b, 0x1c] to [0, 1]
    // https://docs.ethers.io/v4/api-utils.html#signatures
    const recoveryId = signatureBytes.at(-1) - 27;

    return {
      signature,
      recoveryId,
    };
  }

  async registerSigned(did: string, ethWallet: EthWallet): Promise<Execution> {
    const account = this.didToAccount(did);
    // TODO: Change message to come directly from instruction OR only accept update via cryptid
    // TODO: This allows replay attacks
    const signature = await this.ethSignMessage(
      account.authority.toBuffer(),
      ethWallet
    );

    console.log({
      registry: this.registryAddress.toBase58(),
      authority: this.wallet.publicKey.toBase58(),
      did: account.authority.toBase58(),
      didAccount: account.account.toBase58(),
      signature,
    });

    return this.program.methods
      .registerDidSignedByEthAddress(
        Array.from(this.address),
        signature,
        account.bump
      )
      .accounts({
        registry: this.registryAddress,
        did: account.authority,
        didAccount: account.account,
      });
  }
}
