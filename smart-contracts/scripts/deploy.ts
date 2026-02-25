import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying SupplyTrace...");
  console.log("Deployer address:", deployer.address);
  console.log("Network:", network.name);

  const SupplyTrace = await ethers.getContractFactory("SupplyTrace");
  const supplyTrace = await SupplyTrace.deploy("ipfs://");
  await supplyTrace.waitForDeployment();

  console.log("SupplyTrace deployed to:", await supplyTrace.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
