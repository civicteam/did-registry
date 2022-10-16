import os from "os";
import { Registry } from "../../src";
import {
  Connection,
  Keypair,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";

const secretKey = require(os.homedir() + "/.config/solana/id.json");
const keypair = Keypair.fromSecretKey(Buffer.from(secretKey));

const toWallet = (keypair: Keypair) => ({
  publicKey: keypair.publicKey,
  signTransaction: async (transaction: Transaction) => {
    transaction.partialSign(keypair);
    return transaction;
  },
  signAllTransactions: async (transactions: Transaction[]) => {
    transactions.forEach((t) => t.partialSign(keypair));
    return transactions;
  },
});

export const registry = new Registry(
  toWallet(keypair),
  new Connection(
    process.env.RPC_URL || clusterApiUrl("mainnet-beta"),
    "confirmed"
  )
);
