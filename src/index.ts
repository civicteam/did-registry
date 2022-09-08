import {ConfirmOptions, PublicKey} from "@solana/web3.js";
import {AnchorProvider, Program} from "@project-serum/anchor";
import {Connection} from '@solana/web3.js';
import {DidRegistry, IDL} from "./types/did_registry";
import {DidSolIdentifier, ExtendedCluster} from "@identity.com/sol-did-client";

export const DID_REGISTRY_PROGRAM_ID = new PublicKey("regUajGv87Pti6QRLeeRuQWrarQ1LmEyDXcAozko6Ax");
export const KEY_REGISTRY_SEED_PREFIX = "key_registry";

// The exported Anchor wallet type is messed up at the moment, so we define it indirectly here
export type Wallet = AnchorProvider["wallet"];

// TODO use DidSolIdentifier instead
export const toDid = (key: PublicKey, cluster?: ExtendedCluster) => `did:sol:${cluster ? cluster + ':' : ''}${key.toBase58()}`;

type DidAccount = {
    authority:PublicKey,
    account:PublicKey,
    bump:number
}

export class Registry {
    private program: Program<DidRegistry>;
    private authorityKey: PublicKey;

    constructor(authority: Wallet, connection: Connection, opts: ConfirmOptions = {}) {
        const anchorProvider = new AnchorProvider(
            connection,
            authority,
            opts
        );

        this.authorityKey = authority.publicKey;

        this.program = new Program<DidRegistry>(
            IDL,
            DID_REGISTRY_PROGRAM_ID,
            anchorProvider
        );
    }

    public getRegistryAddressAndBump():Promise<[PublicKey, number]> {
        return PublicKey.findProgramAddress(
            [Buffer.from(KEY_REGISTRY_SEED_PREFIX), this.authorityKey.toBuffer()],
            DID_REGISTRY_PROGRAM_ID
        );
    }

    private async didToAccount(did: string): Promise<DidAccount> {
        const didSolIdentifier = DidSolIdentifier.parse(did);
        const [didAccount, didBump] = await didSolIdentifier.dataAccount();
        return {
            authority: didSolIdentifier.authority,
            account: didAccount,
            bump: didBump
        };
    }

    private async confirm(txSig: string): Promise<void> {
        const blockhash = await this.program.provider.connection.getLatestBlockhash();
        await this.program.provider.connection.confirmTransaction({
            ...blockhash, signature: txSig
        }, 'confirmed');
    }

    private async init():Promise<void> {
        const [registry, bump] = await this.getRegistryAddressAndBump();

        const registryAccount = await this.program.account.keyRegistry.fetchNullable(registry);

        if (!registryAccount) {
            await this.program.methods
                .createKeyRegistry(bump)
                .accounts({
                    registry,
                    authority: this.authorityKey,
                })
                .rpc().then(txSig => this.confirm(txSig));
        }
    }

    async registerPubkey(didPubkey: PublicKey): Promise<string> {
        return this.register("did:sol:" + didPubkey.toBase58());
    }

    async register(did: string):Promise<string> {
        const account = await this.didToAccount(did);

        await this.init();
        const [registry] = await this.getRegistryAddressAndBump();
        return this.program.methods
            .registerDid(account.bump)
            .accounts({
                registry,
                authority: this.authorityKey,
                did: account.authority,
                didAccount: account.account,
            })
            .rpc();
    }

    async removePubkey(did: PublicKey):Promise<string> {
        const [registry] = await this.getRegistryAddressAndBump();

        return this.program.methods
            .removeDid()
            .accounts({
                registry,
                authority: this.authorityKey,
                did,
            })
            .rpc();
    }

    async remove(did: string):Promise<string> {
        const account = await this.didToAccount(did);
        return this.removePubkey(account.authority);
    }

    async listDIDs():Promise<string[]> {
        const [registry] = await this.getRegistryAddressAndBump();
        const registryAccount = await this.program.account.keyRegistry.fetchNullable(registry);

        if (!registryAccount) return [];

        return registryAccount.dids.map(did => "did:sol:" + did.toBase58());
    }
}