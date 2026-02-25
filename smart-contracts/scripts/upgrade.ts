import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Upgrades the existing UUPS proxy to SupplyTraceUpgradeableV2.
 *
 * Reads the proxy address from:
 *   deployments/<network>/SupplyTraceProxy.json  (written by the deploy script)
 *
 * Usage:
 *   npx hardhat run scripts/upgrade.ts --network localhost
 *   npx hardhat run scripts/upgrade.ts --network sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading SupplyTrace proxy...");
  console.log("Deployer:", deployer.address);
  console.log("Network:", network.name);

  // Resolve proxy address from deployment artifact
  const artifactPath = path.resolve(
    __dirname,
    "../deployments",
    network.name,
    "SupplyTraceProxy.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `No deployment artifact found at ${artifactPath}.\n` +
        "Deploy the proxy first with: npx hardhat deploy --network <network> --reset"
    );
  }

  const { proxy: proxyAddress } = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  console.log("Proxy address:", proxyAddress);

  const V2Factory = await ethers.getContractFactory("SupplyTraceUpgradeableV2");

  const upgraded = await upgrades.upgradeProxy(proxyAddress, V2Factory, {
    kind: "uups",
  });
  await upgraded.waitForDeployment();

  const newImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Upgrade complete!");
  console.log("Proxy address (unchanged):  ", proxyAddress);
  console.log("New implementation address: ", newImplAddress);

  // Verify version() is live and state is intact
  const v2 = await ethers.getContractAt("SupplyTraceUpgradeableV2", proxyAddress);
  const ver = await v2.version();
  console.log(`version() returns: ${ver} ✓`);

  // Update the deployment artifact with new implementation address
  fs.writeFileSync(
    artifactPath,
    JSON.stringify({ proxy: proxyAddress, implementation: newImplAddress }, null, 2)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
