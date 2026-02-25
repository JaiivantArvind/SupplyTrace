import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import * as fs from "fs";
import * as path from "path";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { getNamedAccounts, ethers, upgrades, network } = hre;
  const { deployer } = await getNamedAccounts();

  console.log("----------------------------------------------------");
  console.log(`Deploying SupplyTrace on network: ${network.name}`);
  console.log(`Deployer: ${deployer}`);

  const Factory = await ethers.getContractFactory("SupplyTraceUpgradeable");

  const proxy = await upgrades.deployProxy(Factory, [deployer], {
    kind: "uups",
    initializer: "initialize",
  });
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`SupplyTrace proxy deployed to:          ${proxyAddress}`);
  console.log(`SupplyTrace implementation deployed to: ${implAddress}`);

  // Persist proxy address for upgrade script
  const addressesDir = path.resolve(__dirname, "../deployments", network.name);
  fs.mkdirSync(addressesDir, { recursive: true });
  fs.writeFileSync(
    path.join(addressesDir, "SupplyTraceProxy.json"),
    JSON.stringify({ proxy: proxyAddress, implementation: implAddress }, null, 2)
  );

  const contract = await ethers.getContractAt("SupplyTraceUpgradeable", proxyAddress);
  const MANUFACTURER_ROLE = await contract.MANUFACTURER_ROLE();
  const DISTRIBUTOR_ROLE  = await contract.DISTRIBUTOR_ROLE();
  const RETAILER_ROLE     = await contract.RETAILER_ROLE();

  if (network.name === "hardhat" || network.name === "localhost") {
    const signers = await ethers.getSigners();
    const distributorAddr = signers[1].address;
    const retailerAddr    = signers[2].address;

    await (await contract.grantRole(MANUFACTURER_ROLE, deployer)).wait();
    console.log(`MANUFACTURER_ROLE granted to deployer: ${deployer}`);

    await (await contract.grantRole(DISTRIBUTOR_ROLE, distributorAddr)).wait();
    console.log(`DISTRIBUTOR_ROLE granted to distributor: ${distributorAddr}`);

    await (await contract.grantRole(RETAILER_ROLE, retailerAddr)).wait();
    console.log(`RETAILER_ROLE granted to retailer: ${retailerAddr}`);
  }
};

func.tags = ["SupplyTrace"];

export default func;

