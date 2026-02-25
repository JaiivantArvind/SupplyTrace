/**
 * Grant MANUFACTURER_ROLE, DISTRIBUTOR_ROLE, and RETAILER_ROLE to a wallet.
 *
 * Usage:
 *   GRANT_ADDRESS=0xYourWalletAddress npx hardhat run scripts/grant-roles.ts --network sepolia
 */
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const target = process.env.GRANT_ADDRESS;
  if (!target) {
    throw new Error(
      "Set GRANT_ADDRESS env variable to the wallet address you want to grant roles to.\n" +
      "Example: GRANT_ADDRESS=0xAbC... npx hardhat run scripts/grant-roles.ts --network sepolia"
    );
  }

  // Basic validation
  if (!/^0x[0-9a-fA-F]{40}$/.test(target)) {
    throw new Error(
      `"${target}" is not a valid Ethereum address.\n` +
      "It must be 0x followed by exactly 40 hex characters (42 chars total).\n" +
      "Copy it from MetaMask — click your account name at the top."
    );
  }

  // Read proxy address from deployment artifact
  const artifactPath = path.resolve(
    __dirname, "../deployments/sepolia/SupplyTraceProxy.json"
  );
  const { proxy: proxyAddress } = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  const contract = await ethers.getContractAt("SupplyTraceUpgradeable", proxyAddress);
  const [deployer] = await ethers.getSigners();

  console.log(`Proxy:    ${proxyAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Target:   ${target}`);
  console.log("─".repeat(60));

  const roles = [
    { name: "MANUFACTURER_ROLE", key: await contract.MANUFACTURER_ROLE() },
    { name: "DISTRIBUTOR_ROLE",  key: await contract.DISTRIBUTOR_ROLE() },
    { name: "RETAILER_ROLE",     key: await contract.RETAILER_ROLE() },
  ];

  for (const role of roles) {
    const already = await contract.hasRole(role.key, target);
    if (already) {
      console.log(`✓ ${role.name} — already granted`);
      continue;
    }
    process.stdout.write(`  Granting ${role.name}… `);
    const tx = await contract.grantRole(role.key, target);
    await tx.wait();
    console.log(`✓ tx: ${tx.hash}`);
  }

  console.log("─".repeat(60));
  console.log("Done. Wallet now has all three supply chain roles.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
