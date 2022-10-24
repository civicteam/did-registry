import { ethRegistry, getEthWallet } from "./util/util";

(async () => {
  const ethAddress = process.argv[2];

  const dids = await ethRegistry(ethAddress).listDIDs();
  console.log("Registered DIDs:", dids);

  if (process.argv.length > 3) {
    const didToRegister = process.argv[3];

    await ethRegistry(ethAddress)
      .registerSigned(didToRegister, getEthWallet())
      .then((execution) => execution.rpc());
    console.log("Registered DID: " + didToRegister);
  }
})().catch(console.error);
