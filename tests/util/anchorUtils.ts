import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Provider } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { DidRegistry } from "../../target/types/did_registry";

const envProvider = anchor.AnchorProvider.env();
const envProgram = anchor.workspace.DidRegistry;

if (!process.env.QUIET) {
  const logListener = envProvider.connection.onLogs("all", (log) =>
    console.log(log.logs)
  );

  after("Remove log listener", () => {
    envProvider.connection.removeOnLogsListener(logListener);
  });
}

// The exported Anchor wallet type is messed up at the moment, so we define it indirectly here
export type Wallet = AnchorProvider["wallet"];

export const fund = async (
  publicKey: PublicKey,
  amount: number = LAMPORTS_PER_SOL
) => {
  const blockhash = await envProvider.connection.getLatestBlockhash();
  const tx = await envProvider.connection.requestAirdrop(publicKey, amount);
  // wait for the airdrop
  await envProvider.connection.confirmTransaction(
    {
      ...blockhash,
      signature: tx,
    },
    "confirmed"
  );
};

export const balanceOf = (publicKey: PublicKey): Promise<number> =>
  envProvider.connection
    .getAccountInfo(publicKey)
    .then((a) => (a ? a.lamports : 0));

export type TestContext = {
  program: Program<DidRegistry>;
  provider: Provider;
  authority: Wallet;
  keypair: Keypair;
};

export const createTestContext = (): TestContext => {
  const keypair = anchor.web3.Keypair.generate();
  const anchorProvider = new AnchorProvider(
    envProvider.connection,
    new anchor.Wallet(keypair),
    envProvider.opts
  );

  const program = new Program<DidRegistry>(
    envProgram.idl,
    envProgram.programId,
    anchorProvider
  );
  const provider = program.provider as anchor.AnchorProvider;
  const authority = provider.wallet;

  return {
    program,
    provider,
    authority,
    keypair,
  };
};
