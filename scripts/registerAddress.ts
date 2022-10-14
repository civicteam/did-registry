import { registry } from "./util/solana";

(async () => {
  const dids = await registry.listDIDs();
  console.log("Registered DIDs:", dids);

  if (process.argv.length > 2) {
    const didToRegister = process.argv[2];

    await registry.register(didToRegister);
    console.log("Registered DID: " + didToRegister);
  }
})().catch(console.error);
