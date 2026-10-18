import { ethers, upgrades, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying SupplyTraceUpgradeable...");
  console.log("Deployer address:", deployer.address);
  console.log("Network:", network.name);

  const SupplyTraceUpgradeable = await ethers.getContractFactory("SupplyTraceUpgradeable");
  const supplyTrace = await upgrades.deployProxy(SupplyTraceUpgradeable, ["ipfs://"], {
    initializer: "initialize",
    kind: "uups",
  });
  await supplyTrace.waitForDeployment();

  const proxyAddress = await supplyTrace.getAddress();
  console.log("SupplyTraceUpgradeable proxy deployed to:", proxyAddress);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
