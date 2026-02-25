import { ethers, network } from "hardhat";
import * as path from "path";
import * as fs from "fs";

/**
 * Prints all current ADMIN_ROLE and DEFAULT_ADMIN_ROLE holders for a deployed proxy.
 *
 * Usage:
 *   npx hardhat run scripts/check-roles.ts --network sepolia
 *   npx hardhat run scripts/check-roles.ts --network localhost
 */
async function main() {
  console.log("Network:", network.name);

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

  const { proxy: proxyAddress, implementation: implAddress } = JSON.parse(
    fs.readFileSync(artifactPath, "utf-8")
  );

  console.log("Proxy:         ", proxyAddress);
  console.log("Implementation:", implAddress);
  console.log();

  const contract = await ethers.getContractAt("SupplyTraceUpgradeable", proxyAddress);

  const ADMIN_ROLE         = await contract.ADMIN_ROLE();
  const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
  const MANUFACTURER_ROLE  = await contract.MANUFACTURER_ROLE();
  const DISTRIBUTOR_ROLE   = await contract.DISTRIBUTOR_ROLE();
  const RETAILER_ROLE      = await contract.RETAILER_ROLE();
  const INSPECTOR_ROLE     = await contract.INSPECTOR_ROLE();

  const roles: { name: string; hash: string }[] = [
    { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE },
    { name: "ADMIN_ROLE",         hash: ADMIN_ROLE },
    { name: "MANUFACTURER_ROLE",  hash: MANUFACTURER_ROLE },
    { name: "DISTRIBUTOR_ROLE",   hash: DISTRIBUTOR_ROLE },
    { name: "RETAILER_ROLE",      hash: RETAILER_ROLE },
    { name: "INSPECTOR_ROLE",     hash: INSPECTOR_ROLE },
  ];

  // Use RoleGranted events to discover all grantees
  const filter = contract.filters.RoleGranted();
  const events = await contract.queryFilter(filter, 0, "latest");

  // Build a set of (role, account) pairs that have ever been granted
  const granted = new Map<string, Set<string>>();
  for (const e of events) {
    const role    = e.args.role;
    const account = e.args.account;
    if (!granted.has(role)) granted.set(role, new Set());
    granted.get(role)!.add(account);
  }

  console.log("── Role holders ─────────────────────────────────────");
  for (const { name, hash } of roles) {
    const candidates = granted.get(hash) ?? new Set<string>();
    const holders: string[] = [];
    for (const addr of candidates) {
      if (await contract.hasRole(hash, addr)) {
        holders.push(addr);
      }
    }
    console.log(`\n${name}:`);
    if (holders.length === 0) {
      console.log("  (none)");
    } else {
      holders.forEach((h) => console.log(`  ${h}`));
    }
  }

  console.log();
  console.log("Paused:", await contract.paused());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
