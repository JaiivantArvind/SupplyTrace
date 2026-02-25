import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config();

/**
 * Transfers ADMIN_ROLE and DEFAULT_ADMIN_ROLE to a Gnosis Safe.
 *
 * Prerequisites:
 *   1. Deploy a Safe at https://app.safe.global (Sepolia)
 *   2. Set SAFE_ADDRESS in smart-contracts/.env
 *   3. Ensure PRIVATE_KEY in .env is the current admin (deployer)
 *
 * Usage:
 *   npx hardhat run scripts/transfer-admin-to-safe.ts --network sepolia
 *
 * What it does:
 *   1. Grants ADMIN_ROLE to Safe
 *   2. Grants DEFAULT_ADMIN_ROLE to Safe
 *   3. Revokes ADMIN_ROLE from deployer
 *   4. Revokes DEFAULT_ADMIN_ROLE from deployer
 *   5. Verifies Safe has both roles, deployer has neither
 *
 * ⚠️  IRREVERSIBLE if run on mainnet without a working Safe.
 *     Test on Sepolia first.
 */
async function main() {
  const SAFE_ADDRESS = process.env.SAFE_ADDRESS;
  if (!SAFE_ADDRESS) {
    throw new Error(
      "SAFE_ADDRESS not set in .env\n" +
        "1. Create a Safe at https://app.safe.global (select Sepolia)\n" +
        "2. Add SAFE_ADDRESS=0x... to smart-contracts/.env\n" +
        "3. Re-run this script"
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log("Network:  ", network.name);
  console.log("Deployer: ", deployer.address);
  console.log("Safe:     ", SAFE_ADDRESS);
  console.log();

  // Resolve proxy address from deployment artifact
  const artifactPath = path.resolve(
    __dirname,
    "../deployments",
    network.name,
    "SupplyTraceProxy.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `No deployment artifact at ${artifactPath}.\n` +
        `Deploy first: npx hardhat deploy --network ${network.name} --reset`
    );
  }

  const { proxy: proxyAddress } = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  console.log("Proxy:    ", proxyAddress);
  console.log();

  const contract = await ethers.getContractAt("SupplyTraceUpgradeable", proxyAddress);

  const ADMIN_ROLE         = await contract.ADMIN_ROLE();
  const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();

  // ── Pre-flight checks ────────────────────────────────────────────────────
  const deployerHasAdmin    = await contract.hasRole(ADMIN_ROLE, deployer.address);
  const deployerHasDefault  = await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);

  if (!deployerHasAdmin || !deployerHasDefault) {
    throw new Error(
      "Deployer does not currently hold ADMIN_ROLE or DEFAULT_ADMIN_ROLE.\n" +
        "Make sure you are running with the correct PRIVATE_KEY."
    );
  }

  console.log("Pre-flight ✓ — deployer holds both roles.");
  console.log();

  // ── Step 1: Grant ADMIN_ROLE to Safe ────────────────────────────────────
  console.log("1/4 Granting ADMIN_ROLE to Safe...");
  await (await contract.grantRole(ADMIN_ROLE, SAFE_ADDRESS)).wait();
  console.log("    ✓ ADMIN_ROLE granted to Safe");

  // ── Step 2: Grant DEFAULT_ADMIN_ROLE to Safe ─────────────────────────────
  console.log("2/4 Granting DEFAULT_ADMIN_ROLE to Safe...");
  await (await contract.grantRole(DEFAULT_ADMIN_ROLE, SAFE_ADDRESS)).wait();
  console.log("    ✓ DEFAULT_ADMIN_ROLE granted to Safe");

  // ── Step 3: Revoke ADMIN_ROLE from deployer ──────────────────────────────
  console.log("3/4 Revoking ADMIN_ROLE from deployer...");
  await (await contract.revokeRole(ADMIN_ROLE, deployer.address)).wait();
  console.log("    ✓ ADMIN_ROLE revoked from deployer");

  // ── Step 4: Revoke DEFAULT_ADMIN_ROLE from deployer ──────────────────────
  // Note: this must be done AFTER granting to Safe (DEFAULT_ADMIN_ROLE holder
  // is required for future role management)
  console.log("4/4 Revoking DEFAULT_ADMIN_ROLE from deployer...");
  await (await contract.revokeRole(DEFAULT_ADMIN_ROLE, deployer.address)).wait();
  console.log("    ✓ DEFAULT_ADMIN_ROLE revoked from deployer");

  console.log();

  // ── Verification ─────────────────────────────────────────────────────────
  const safeHasAdmin    = await contract.hasRole(ADMIN_ROLE, SAFE_ADDRESS);
  const safeHasDefault  = await contract.hasRole(DEFAULT_ADMIN_ROLE, SAFE_ADDRESS);
  const deployerHasAdminNow   = await contract.hasRole(ADMIN_ROLE, deployer.address);
  const deployerHasDefaultNow = await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);

  console.log("── Verification ─────────────────────────────────────");
  console.log(`Safe      ADMIN_ROLE:         ${safeHasAdmin    ? "✓ YES" : "✗ NO"}`);
  console.log(`Safe      DEFAULT_ADMIN_ROLE: ${safeHasDefault  ? "✓ YES" : "✗ NO"}`);
  console.log(`Deployer  ADMIN_ROLE:         ${deployerHasAdminNow   ? "✗ STILL HAS" : "✓ revoked"}`);
  console.log(`Deployer  DEFAULT_ADMIN_ROLE: ${deployerHasDefaultNow ? "✗ STILL HAS" : "✓ revoked"}`);

  if (!safeHasAdmin || !safeHasDefault || deployerHasAdminNow || deployerHasDefaultNow) {
    throw new Error("Verification failed — manual check required.");
  }

  console.log();
  console.log("✅ Admin control transferred to Safe successfully.");
  console.log();
  console.log("Next steps:");
  console.log("  1. Go to https://app.safe.global");
  console.log("  2. Load your Safe on Sepolia");
  console.log("  3. Propose a transaction (e.g. grantRole or pause)");
  console.log("  4. Collect required owner signatures");
  console.log("  5. Execute — this proves governance enforcement");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
