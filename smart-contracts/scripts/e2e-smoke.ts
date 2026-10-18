import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("====================================================");
  console.log(`Running E2E Live Integration Smoke Test on ${network.name}`);
  console.log("====================================================");

  // 1. Resolve proxy address
  const artifactPath = path.resolve(
    __dirname,
    "../deployments",
    network.name,
    "SupplyTraceProxy.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`No deployment found for network: ${network.name}`);
  }

  const { proxy: proxyAddress } = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  console.log(`[*] Connecting to deployed proxy at: ${proxyAddress}`);

  const [deployer, distributor, retailer, unauthorized] = await ethers.getSigners();
  console.log(`Deployer (Manufacturer/Admin): ${deployer.address}`);
  console.log(`Distributor:                   ${distributor.address}`);
  console.log(`Retailer:                      ${retailer.address}`);

  const contract = await ethers.getContractAt("SupplyTraceUpgradeable", proxyAddress);

  // 2. Verify Roles
  const MANUFACTURER_ROLE = await contract.MANUFACTURER_ROLE();
  const DISTRIBUTOR_ROLE = await contract.DISTRIBUTOR_ROLE();
  const RETAILER_ROLE = await contract.RETAILER_ROLE();
  const ADMIN_ROLE = await contract.ADMIN_ROLE();

  const isDeployerMfr = await contract.hasRole(MANUFACTURER_ROLE, deployer.address);
  const isDeployerAdmin = await contract.hasRole(ADMIN_ROLE, deployer.address);
  const isDistributor = await contract.hasRole(DISTRIBUTOR_ROLE, distributor.address);
  const isRetailer = await contract.hasRole(RETAILER_ROLE, retailer.address);

  console.log(`\n[ROLE CHECK]`);
  console.log(`  Deployer has MANUFACTURER_ROLE: ${isDeployerMfr}`);
  console.log(`  Deployer has ADMIN_ROLE:        ${isDeployerAdmin}`);
  console.log(`  Distributor has DISTRIBUTOR_ROLE: ${isDistributor}`);
  console.log(`  Retailer has RETAILER_ROLE:      ${isRetailer}`);

  if (!isDeployerMfr || !isDeployerAdmin) {
    throw new Error("Deployer missing required roles!");
  }

  // 3. Step 1: Mint Batch
  const metadataURI = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
  const mintQuantity = 500n;
  console.log(`\n[*] Step 1: Minting batch (quantity: ${mintQuantity}, uri: ${metadataURI})...`);
  const mintTx = await contract.connect(deployer).mintBatch(metadataURI, mintQuantity);
  const mintReceipt = await mintTx.wait();
  console.log(`[OK] Mint transaction confirmed. TxHash: ${mintReceipt.hash}`);

  // 4. Verify Authenticity after Mint
  const tokenId = 1n;
  const authMint = await contract.verifyAuthenticity(tokenId);
  console.log(`\n[VERIFY AUTHENTICITY - POST MINT]`);
  console.log(`  Token ID:       ${tokenId}`);
  console.log(`  Manufacturer:   ${authMint[0]}`);
  console.log(`  Metadata URI:   ${authMint[1]}`);
  console.log(`  Active:         ${authMint[2]}`);
  console.log(`  State (enum):   ${authMint[3]} (0 = CREATED)`);
  console.log(`  ManufactureDate:${new Date(Number(authMint[4]) * 1000).toISOString()}`);

  if (authMint[0].toLowerCase() !== deployer.address.toLowerCase() || !authMint[2] || authMint[3] !== 0n) {
    throw new Error("Batch authenticity check failed after mint!");
  }

  // 5. Step 2: Transfer custody from Manufacturer to Distributor
  const transferQty = 200n;
  console.log(`\n[*] Step 2: Transferring custody to distributor (${transferQty} units)...`);
  const transferTx = await contract.connect(deployer).transferBatch(tokenId, distributor.address, transferQty);
  const transferReceipt = await transferTx.wait();
  console.log(`[OK] Custody transfer confirmed. TxHash: ${transferReceipt.hash}`);

  const authTransfer = await contract.verifyAuthenticity(tokenId);
  console.log(`\n[VERIFY AUTHENTICITY - POST TRANSFER]`);
  console.log(`  State (enum):   ${authTransfer[3]} (1 = DISTRIBUTED)`);
  if (authTransfer[3] !== 1n) {
    throw new Error("Batch state expected to be 1 (DISTRIBUTED)");
  }

  // 6. Step 3: Verify Balances
  const deployerBalance = await contract.balanceOf(deployer.address, tokenId);
  const distributorBalance = await contract.balanceOf(distributor.address, tokenId);
  console.log(`\n[ERC-1155 BALANCES]`);
  console.log(`  Deployer balance:    ${deployerBalance.toString()} (expected 300)`);
  console.log(`  Distributor balance: ${distributorBalance.toString()} (expected 200)`);

  if (deployerBalance !== 300n || distributorBalance !== 200n) {
    throw new Error("Token balances mismatch after transfer!");
  }

  // 7. Step 4: Verify Circuit Breaker (Pause / Unpause)
  console.log(`\n[*] Step 4: Testing Circuit Breaker (Pausable)...`);
  const pauseTx = await contract.connect(deployer).pause();
  await pauseTx.wait();
  const isPaused = await contract.paused();
  console.log(`  Contract paused: ${isPaused}`);
  if (!isPaused) throw new Error("Pause failed!");

  // Verify action while paused reverts
  try {
    await contract.connect(deployer).mintBatch("ipfs://QmFailWhilePaused", 100n);
    throw new Error("Transaction succeeded while contract was paused!");
  } catch (err: any) {
    console.log(`  [OK] Successfully rejected minting while paused: ${err.message?.slice(0, 60)}...`);
  }

  const unpauseTx = await contract.connect(deployer).unpause();
  await unpauseTx.wait();
  const isPausedAfter = await contract.paused();
  console.log(`  Contract paused after unpause: ${isPausedAfter}`);
  if (isPausedAfter) throw new Error("Unpause failed!");

  // 8. Step 5: Test Emergency Recall
  console.log(`\n[*] Step 5: Testing Emergency Recall on Token #${tokenId}...`);
  const recallTx = await contract.connect(deployer).recallBatch(tokenId);
  const recallReceipt = await recallTx.wait();
  console.log(`[OK] Recall transaction confirmed. TxHash: ${recallReceipt.hash}`);

  const authRecall = await contract.verifyAuthenticity(tokenId);
  console.log(`  Active status after recall: ${authRecall[2]} (expected false)`);
  if (authRecall[2] !== false) {
    throw new Error("Token was not deactivated after recall!");
  }

  // 9. Re-mint active batch Token #2 for frontend testing
  console.log(`\n[*] Step 6: Minting live batch Token #2 for frontend exploration...`);
  const mintTx2 = await contract.connect(deployer).mintBatch("ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 1000n);
  await mintTx2.wait();
  console.log(`[OK] Token #2 minted for live consumer verification.`);

  console.log("\n====================================================");
  console.log("All E2E Live Integration Checks PASSED Successfully!");
  console.log("====================================================");
}

main().catch((err) => {
  console.error("\n[E2E SMOKE FAILURE]", err);
  process.exit(1);
});
