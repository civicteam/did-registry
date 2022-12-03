import { Connection } from "@solana/web3.js";
import { ExtendedCluster } from "@identity.com/sol-did-client";
import { Wallet as EthWallet } from "@ethersproject/wallet";
import BN from "bn.js";
import { arrayify } from "@ethersproject/bytes";
import { ETH_KEY_REGISTRY_SEED_PREFIX } from "./AbstractKeyRegistry";
import { Registry } from "./Registry";
import { Execution, Wallet } from "../../types";

export class EthRegistry extends Registry {
  static forEthAddress(
    ethAddress: string,
    wallet: Wallet,
    connection: Connection,
    cluster: ExtendedCluster = "mainnet-beta"
  ): EthRegistry {
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
