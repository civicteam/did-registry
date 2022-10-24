import os from "os";
import { EthRegistry, Registry } from "../../src";
import {
  Connection,
  Keypair,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import { Wallet as EthWallet } from "@ethersproject/wallet";

const secretKeySol = require(os.homedir() + "/.config/solana/id.json");
const keypair = Keypair.fromSecretKey(Buffer.from(secretKeySol));

const secretKeyEth = process.env.ETH_PRIVATE_KEY;

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

export const ethRegistry = (address: string) =>
  EthRegistry.forEthAddress(
    address,
    toWallet(keypair),
    new Connection(
      process.env.RPC_URL || clusterApiUrl("mainnet-beta"),
      "confirmed"
    )
  );

export const getEthWallet = () => new EthWallet(secretKeyEth);
