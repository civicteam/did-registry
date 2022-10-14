import { registry } from "./util/solana";

(async () => {
  const ethAddress = process.argv[2];

  const dids = await registry.listDIDsForEthAddress(ethAddress);
  console.log("Registered DIDs:", dids);

  if (process.argv.length > 3) {
    const didToRegister = process.argv[3];

    await registry.registerDidForEthAddress(didToRegister, ethAddress);
    console.log("Registered DID: " + didToRegister);
  }
})().catch(console.error);
