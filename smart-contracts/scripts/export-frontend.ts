import { ethers, artifacts, network } from "hardhat";
import fs from "fs";
import path from "path";

const DEPLOYED_ADDRESS = "0x2d6e1979c944DdfCBF34FE1f172DED5e600bEc60"; // Sepolia UUPS proxy

async function main() {
  let address: string;

  // Try reading proxy address from deployment artifact
  const artifactPath = path.resolve(
    __dirname,
    "../deployments",
    network.name,
    "SupplyTraceProxy.json"
  );

  if (fs.existsSync(artifactPath)) {
    const { proxy } = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    address = proxy;
    console.log(`Resolved proxy address from deployment artifact: ${address}`);
  } else {
    console.warn("No deployment artifact found — falling back to hardcoded address.");
    address = DEPLOYED_ADDRESS;
  }

  // Always export the upgradeable ABI (proxy delegates to it)
  const artifact = await artifacts.readArtifact("SupplyTraceUpgradeable");
  const abi = artifact.abi;

  const output = { address, abi };

  const outDir = path.resolve(__dirname, "../../frontend/src/contracts");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "SupplyTrace.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`Written to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
