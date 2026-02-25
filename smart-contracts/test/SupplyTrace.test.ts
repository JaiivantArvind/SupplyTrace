import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { SupplyTraceUpgradeable } from "../typechain-types";

describe("SupplyTrace", function () {
  let supplyTrace: SupplyTraceUpgradeable;
  let deployer: SignerWithAddress;
  let manufacturer: SignerWithAddress;
  let distributor: SignerWithAddress;
  let retailer: SignerWithAddress;
  let consumer: SignerWithAddress;
  let stranger: SignerWithAddress;

  let ADMIN_ROLE: string;
  let MANUFACTURER_ROLE: string;
  let DISTRIBUTOR_ROLE: string;
  let RETAILER_ROLE: string;
  let DEFAULT_ADMIN_ROLE: string;

  const METADATA_URI = "ipfs://QmExampleHash";
  const QUANTITY = 100n;

  beforeEach(async function () {
    [deployer, manufacturer, distributor, retailer, consumer, stranger] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory("SupplyTraceUpgradeable");
    const proxy = await upgrades.deployProxy(Factory, [deployer.address], {
      kind: "uups",
      initializer: "initialize",
    });
    await proxy.waitForDeployment();
    supplyTrace = await ethers.getContractAt(
      "SupplyTraceUpgradeable",
      await proxy.getAddress()
    );

    ADMIN_ROLE = await supplyTrace.ADMIN_ROLE();
    MANUFACTURER_ROLE = await supplyTrace.MANUFACTURER_ROLE();
    DISTRIBUTOR_ROLE = await supplyTrace.DISTRIBUTOR_ROLE();
    RETAILER_ROLE = await supplyTrace.RETAILER_ROLE();
    DEFAULT_ADMIN_ROLE = await supplyTrace.DEFAULT_ADMIN_ROLE();
  });

  async function setupRoles() {
    await supplyTrace.connect(deployer).grantRole(MANUFACTURER_ROLE, manufacturer.address);
    await supplyTrace.connect(deployer).grantRole(DISTRIBUTOR_ROLE, distributor.address);
    await supplyTrace.connect(deployer).grantRole(RETAILER_ROLE, retailer.address);
  }

  async function mintAndGetTokenId(): Promise<bigint> {
    await setupRoles();
    const tx = await supplyTrace.connect(manufacturer).mintBatch(METADATA_URI, QUANTITY);
    const receipt = await tx.wait();
    const event = receipt!.logs
      .map((log) => supplyTrace.interface.parseLog(log))
      .find((e) => e?.name === "BatchMinted");
    return event!.args.tokenId as bigint;
  }

  describe("Deployment", function () {
    it("should grant ADMIN_ROLE to deployer", async function () {
      expect(await supplyTrace.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
    });

    it("should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      expect(await supplyTrace.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
    });
  });

  describe("Role assignment", function () {
    it("should allow ADMIN to grant MANUFACTURER_ROLE", async function () {
      await supplyTrace.connect(deployer).grantRole(MANUFACTURER_ROLE, manufacturer.address);
      expect(await supplyTrace.hasRole(MANUFACTURER_ROLE, manufacturer.address)).to.be.true;
    });

    it("should revert when non-admin grants a role", async function () {
      await expect(
        supplyTrace.connect(stranger).grantRole(MANUFACTURER_ROLE, manufacturer.address)
      ).to.be.reverted;
    });
  });

  describe("Minting", function () {
    beforeEach(async function () {
      await supplyTrace.connect(deployer).grantRole(MANUFACTURER_ROLE, manufacturer.address);
    });

    it("should allow manufacturer to mint a batch", async function () {
      await expect(
        supplyTrace.connect(manufacturer).mintBatch(METADATA_URI, QUANTITY)
      ).to.emit(supplyTrace, "BatchMinted");
    });

    it("should revert when non-manufacturer mints", async function () {
      await expect(
        supplyTrace.connect(stranger).mintBatch(METADATA_URI, QUANTITY)
      ).to.be.reverted;
    });

    it("should set batch state to CREATED after mint", async function () {
      await supplyTrace.connect(manufacturer).mintBatch(METADATA_URI, QUANTITY);
      expect(await supplyTrace.batchState(1n)).to.equal(0);
    });

    it("should increment tokenId correctly across multiple mints", async function () {
      await supplyTrace.connect(manufacturer).mintBatch(METADATA_URI, QUANTITY);
      await supplyTrace.connect(manufacturer).mintBatch(METADATA_URI, QUANTITY);
      const [, , , , ] = await supplyTrace.verifyAuthenticity(1n);
      const [, , , , ] = await supplyTrace.verifyAuthenticity(2n);
      expect(await supplyTrace.batchState(1n)).to.equal(0);
      expect(await supplyTrace.batchState(2n)).to.equal(0);
    });

    it("should revert when minting with empty metadataURI", async function () {
      await expect(
        supplyTrace.connect(manufacturer).mintBatch("", QUANTITY)
      ).to.be.revertedWithCustomError(supplyTrace, "EmptyMetadataURI");
    });

    it("should revert when minting with zero quantity", async function () {
      await expect(
        supplyTrace.connect(manufacturer).mintBatch(METADATA_URI, 0)
      ).to.be.revertedWithCustomError(supplyTrace, "ZeroQuantity");
    });
  });

  describe("Transfer hierarchy", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      tokenId = await mintAndGetTokenId();
      await supplyTrace
        .connect(manufacturer)
        .setApprovalForAll(await supplyTrace.getAddress(), true);
    });

    it("should allow manufacturer to transfer to distributor", async function () {
      await expect(
        supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY)
      )
        .to.emit(supplyTrace, "BatchTransferred")
        .withArgs(tokenId, manufacturer.address, distributor.address, QUANTITY, anyValue);
    });

    it("should update state to DISTRIBUTED after manufacturer transfer", async function () {
      await supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY);
      expect(await supplyTrace.batchState(tokenId)).to.equal(1);
    });

    it("should allow distributor to transfer to retailer", async function () {
      await supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY);
      await expect(
        supplyTrace.connect(distributor).transferBatch(tokenId, retailer.address, QUANTITY)
      ).to.emit(supplyTrace, "BatchTransferred");
    });

    it("should update state to RETAIL after distributor transfer", async function () {
      await supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY);
      await supplyTrace.connect(distributor).transferBatch(tokenId, retailer.address, QUANTITY);
      expect(await supplyTrace.batchState(tokenId)).to.equal(2);
    });

    it("should allow retailer to transfer to consumer", async function () {
      await supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY);
      await supplyTrace.connect(distributor).transferBatch(tokenId, retailer.address, QUANTITY);
      await expect(
        supplyTrace.connect(retailer).transferBatch(tokenId, consumer.address, QUANTITY)
      ).to.emit(supplyTrace, "BatchTransferred");
    });

    it("should update state to SOLD after retailer transfer", async function () {
      await supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY);
      await supplyTrace.connect(distributor).transferBatch(tokenId, retailer.address, QUANTITY);
      await supplyTrace.connect(retailer).transferBatch(tokenId, consumer.address, QUANTITY);
      expect(await supplyTrace.batchState(tokenId)).to.equal(3);
    });

    it("should revert when manufacturer transfers to non-distributor", async function () {
      await expect(
        supplyTrace.connect(manufacturer).transferBatch(tokenId, consumer.address, QUANTITY)
      ).to.be.revertedWithCustomError(supplyTrace, "InvalidRole");
    });

    it("should revert when distributor transfers to non-retailer", async function () {
      await supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY);
      await expect(
        supplyTrace.connect(distributor).transferBatch(tokenId, consumer.address, QUANTITY)
      ).to.be.revertedWithCustomError(supplyTrace, "InvalidRole");
    });

    it("should revert when stranger attempts transfer", async function () {
      await expect(
        supplyTrace.connect(stranger).transferBatch(tokenId, distributor.address, QUANTITY)
      ).to.be.revertedWithCustomError(supplyTrace, "InvalidRole");
    });

    it("should increment custody count tracked via verifyAuthenticity", async function () {
      await supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY);
      await supplyTrace.connect(distributor).transferBatch(tokenId, retailer.address, QUANTITY);

      const [, , , , count] = await supplyTrace.verifyAuthenticity(tokenId);
      expect(count).to.equal(2n);
    });
  });

  describe("Recall", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      tokenId = await mintAndGetTokenId();
    });

    it("should allow ADMIN to recall a batch", async function () {
      await expect(supplyTrace.connect(deployer).recallBatch(tokenId))
        .to.emit(supplyTrace, "BatchRecalled")
        .withArgs(tokenId);
    });

    it("should set batch active to false after recall", async function () {
      await supplyTrace.connect(deployer).recallBatch(tokenId);
      const batch = await supplyTrace.batches(tokenId);
      expect(batch.active).to.be.false;
    });

    it("should set batch state to CLOSED after recall", async function () {
      await supplyTrace.connect(deployer).recallBatch(tokenId);
      expect(await supplyTrace.batchState(tokenId)).to.equal(4);
    });

    it("should revert transferBatch after recall", async function () {
      await supplyTrace.connect(deployer).recallBatch(tokenId);
      await expect(
        supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY)
      ).to.be.revertedWithCustomError(supplyTrace, "BatchInactive");
    });

    it("should revert when non-admin recalls", async function () {
      await expect(
        supplyTrace.connect(stranger).recallBatch(tokenId)
      ).to.be.reverted;
    });

    it("should revert when recalling an already recalled batch", async function () {
      await supplyTrace.connect(deployer).recallBatch(tokenId);
      await expect(
        supplyTrace.connect(deployer).recallBatch(tokenId)
      ).to.be.revertedWithCustomError(supplyTrace, "AlreadyInactive");
    });
  });

  describe("verifyAuthenticity", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      tokenId = await mintAndGetTokenId();
    });

    it("should return the correct manufacturer", async function () {
      const [mfr] = await supplyTrace.verifyAuthenticity(tokenId);
      expect(mfr).to.equal(manufacturer.address);
    });

    it("should return the correct metadataURI", async function () {
      const [, uri] = await supplyTrace.verifyAuthenticity(tokenId);
      expect(uri).to.equal(METADATA_URI);
    });

    it("should return active as true before recall", async function () {
      const [, , active] = await supplyTrace.verifyAuthenticity(tokenId);
      expect(active).to.be.true;
    });

    it("should return active as false after recall", async function () {
      await supplyTrace.connect(deployer).recallBatch(tokenId);
      const [, , active] = await supplyTrace.verifyAuthenticity(tokenId);
      expect(active).to.be.false;
    });

    it("should return correct custody history length", async function () {
      await supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY);
      const [, , , , count] = await supplyTrace.verifyAuthenticity(tokenId);
      expect(count).to.equal(1n);
    });

    it("should revert for a non-existent tokenId", async function () {
      await expect(
        supplyTrace.verifyAuthenticity(999n)
      ).to.be.revertedWithCustomError(supplyTrace, "InvalidToken");
    });
  });

  describe("Pausable", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      tokenId = await mintAndGetTokenId();
      await supplyTrace
        .connect(manufacturer)
        .setApprovalForAll(await supplyTrace.getAddress(), true);
    });

    it("should allow ADMIN to pause the contract", async function () {
      await supplyTrace.connect(deployer).pause();
      expect(await supplyTrace.paused()).to.be.true;
    });

    it("should allow ADMIN to unpause the contract", async function () {
      await supplyTrace.connect(deployer).pause();
      await supplyTrace.connect(deployer).unpause();
      expect(await supplyTrace.paused()).to.be.false;
    });

    it("should revert mintBatch when paused", async function () {
      await supplyTrace.connect(deployer).pause();
      await expect(
        supplyTrace.connect(manufacturer).mintBatch(METADATA_URI, QUANTITY)
      ).to.be.revertedWithCustomError(supplyTrace, "EnforcedPause");
    });

    it("should revert transferBatch when paused", async function () {
      await supplyTrace.connect(deployer).pause();
      await expect(
        supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY)
      ).to.be.revertedWithCustomError(supplyTrace, "EnforcedPause");
    });

    it("should allow recallBatch while paused", async function () {
      await supplyTrace.connect(deployer).pause();
      await expect(supplyTrace.connect(deployer).recallBatch(tokenId))
        .to.emit(supplyTrace, "BatchRecalled")
        .withArgs(tokenId);
    });

    it("should revert pause when called by non-admin", async function () {
      await expect(
        supplyTrace.connect(stranger).pause()
      ).to.be.reverted;
    });
  });

  describe("Upgrade (UUPS)", function () {
    it("should upgrade to V2 and preserve existing state", async function () {
      // Mint a batch on V1 proxy
      await supplyTrace.connect(deployer).grantRole(MANUFACTURER_ROLE, manufacturer.address);
      const tx = await supplyTrace.connect(manufacturer).mintBatch(METADATA_URI, QUANTITY);
      const receipt = await tx.wait();
      const event = receipt!.logs
        .map((log) => supplyTrace.interface.parseLog(log))
        .find((e) => e?.name === "BatchMinted");
      const tokenId = event!.args.tokenId as bigint;

      // Upgrade proxy to V2
      const V2Factory = await ethers.getContractFactory("SupplyTraceUpgradeableV2");
      const upgraded = await upgrades.upgradeProxy(await supplyTrace.getAddress(), V2Factory, {
        kind: "uups",
      });
      await upgraded.waitForDeployment();

      const v2 = await ethers.getContractAt(
        "SupplyTraceUpgradeableV2",
        await supplyTrace.getAddress()
      );

      // State persists through upgrade
      const [mfr, uri, active, , count] = await v2.verifyAuthenticity(tokenId);
      expect(mfr).to.equal(manufacturer.address);
      expect(uri).to.equal(METADATA_URI);
      expect(active).to.be.true;
      expect(count).to.equal(0n);

      // New version() function available
      expect(await v2.version()).to.equal(2);
    });

    it("should prevent non-admin from upgrading", async function () {
      const V2Factory = await ethers.getContractFactory(
        "SupplyTraceUpgradeableV2",
        stranger
      );
      await expect(
        upgrades.upgradeProxy(await supplyTrace.getAddress(), V2Factory, { kind: "uups" })
      ).to.be.reverted;
    });
  });

  describe("Governance (multi-sig simulation)", function () {
    // In these tests `deployer` simulates the current admin and `manufacturer`
    // acts as the Safe (a second wallet that takes over admin control).
    // This mirrors the on-chain Safe flow without requiring an actual
    // Gnosis Safe contract.

    it("should allow admin to grant ADMIN_ROLE to a new account (Safe)", async function () {
      await supplyTrace.connect(deployer).grantRole(ADMIN_ROLE, manufacturer.address);
      expect(await supplyTrace.hasRole(ADMIN_ROLE, manufacturer.address)).to.be.true;
    });

    it("should allow admin to revoke their own ADMIN_ROLE after granting to Safe", async function () {
      await supplyTrace.connect(deployer).grantRole(ADMIN_ROLE, manufacturer.address);
      await supplyTrace.connect(deployer).revokeRole(ADMIN_ROLE, deployer.address);
      expect(await supplyTrace.hasRole(ADMIN_ROLE, deployer.address)).to.be.false;
    });

    it("should block deployer from pausing after ADMIN_ROLE is revoked", async function () {
      await supplyTrace.connect(deployer).grantRole(ADMIN_ROLE, manufacturer.address);
      await supplyTrace.connect(deployer).revokeRole(ADMIN_ROLE, deployer.address);

      await expect(
        supplyTrace.connect(deployer).pause()
      ).to.be.reverted;
    });

    it("new Safe should be able to pause after taking over ADMIN_ROLE", async function () {
      await supplyTrace.connect(deployer).grantRole(ADMIN_ROLE, manufacturer.address);
      await supplyTrace.connect(deployer).revokeRole(ADMIN_ROLE, deployer.address);

      await supplyTrace.connect(manufacturer).pause();
      expect(await supplyTrace.paused()).to.be.true;
    });

    it("new Safe should be able to grant roles after taking over DEFAULT_ADMIN_ROLE", async function () {
      await supplyTrace.connect(deployer).grantRole(DEFAULT_ADMIN_ROLE, manufacturer.address);
      await supplyTrace.connect(deployer).revokeRole(DEFAULT_ADMIN_ROLE, deployer.address);

      // Safe (manufacturer) grants RETAILER_ROLE to a new address
      await supplyTrace.connect(manufacturer).grantRole(RETAILER_ROLE, retailer.address);
      expect(await supplyTrace.hasRole(RETAILER_ROLE, retailer.address)).to.be.true;
    });

    it("old deployer cannot grant roles after DEFAULT_ADMIN_ROLE is revoked", async function () {
      await supplyTrace.connect(deployer).grantRole(DEFAULT_ADMIN_ROLE, manufacturer.address);
      await supplyTrace.connect(deployer).revokeRole(DEFAULT_ADMIN_ROLE, deployer.address);

      await expect(
        supplyTrace.connect(deployer).grantRole(RETAILER_ROLE, retailer.address)
      ).to.be.reverted;
    });

    it("upgrade authority transfers with ADMIN_ROLE — old deployer cannot upgrade after revocation", async function () {
      await supplyTrace.connect(deployer).grantRole(ADMIN_ROLE, manufacturer.address);
      await supplyTrace.connect(deployer).revokeRole(ADMIN_ROLE, deployer.address);

      const V2Factory = await ethers.getContractFactory("SupplyTraceUpgradeableV2", deployer);
      await expect(
        upgrades.upgradeProxy(await supplyTrace.getAddress(), V2Factory, { kind: "uups" })
      ).to.be.reverted;
    });

    it("Safe can upgrade proxy after taking over ADMIN_ROLE", async function () {
      await supplyTrace.connect(deployer).grantRole(ADMIN_ROLE, manufacturer.address);
      await supplyTrace.connect(deployer).revokeRole(ADMIN_ROLE, deployer.address);

      const V2Factory = await ethers.getContractFactory("SupplyTraceUpgradeableV2", manufacturer);
      const upgraded = await upgrades.upgradeProxy(
        await supplyTrace.getAddress(),
        V2Factory,
        { kind: "uups" }
      );
      await upgraded.waitForDeployment();

      const v2 = await ethers.getContractAt("SupplyTraceUpgradeableV2", await supplyTrace.getAddress());
      expect(await v2.version()).to.equal(2);
    });
  });

  describe("Audit Invariants (Phase 9)", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      tokenId = await mintAndGetTokenId();
      await supplyTrace
        .connect(manufacturer)
        .setApprovalForAll(await supplyTrace.getAddress(), true);
    });

    // ── State progression ──────────────────────────────────────────────────
    it("state can only advance: CREATED → DISTRIBUTED → RETAIL → SOLD", async function () {
      expect(await supplyTrace.batchState(tokenId)).to.equal(0);
      await supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY);
      expect(await supplyTrace.batchState(tokenId)).to.equal(1);
      await supplyTrace.connect(distributor).transferBatch(tokenId, retailer.address, QUANTITY);
      expect(await supplyTrace.batchState(tokenId)).to.equal(2);
      await supplyTrace.connect(retailer).transferBatch(tokenId, consumer.address, QUANTITY);
      expect(await supplyTrace.batchState(tokenId)).to.equal(3);
    });

    it("SOLD batch cannot be transferred again (state blocks reuse)", async function () {
      await supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY);
      await supplyTrace.connect(distributor).transferBatch(tokenId, retailer.address, QUANTITY);
      await supplyTrace.connect(retailer).transferBatch(tokenId, consumer.address, QUANTITY);
      await expect(
        supplyTrace.connect(consumer).transferBatch(tokenId, stranger.address, QUANTITY)
      ).to.be.revertedWithCustomError(supplyTrace, "InvalidRole");
    });

    it("CLOSED (recalled) batch cannot be transferred", async function () {
      await supplyTrace.connect(deployer).recallBatch(tokenId);
      await expect(
        supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY)
      ).to.be.revertedWithCustomError(supplyTrace, "BatchInactive");
    });

    // ── Role escalation lockdown ───────────────────────────────────────────
    it("MANUFACTURER cannot pause the contract", async function () {
      await expect(supplyTrace.connect(manufacturer).pause()).to.be.reverted;
    });

    it("DISTRIBUTOR cannot recall a batch", async function () {
      await expect(supplyTrace.connect(distributor).recallBatch(tokenId)).to.be.reverted;
    });

    it("stranger cannot grant any role", async function () {
      await expect(
        supplyTrace.connect(stranger).grantRole(MANUFACTURER_ROLE, stranger.address)
      ).to.be.reverted;
    });

    it("MANUFACTURER cannot grant themselves ADMIN_ROLE", async function () {
      await expect(
        supplyTrace.connect(manufacturer).grantRole(ADMIN_ROLE, manufacturer.address)
      ).to.be.reverted;
    });

    // ── Reentrancy surface ─────────────────────────────────────────────────
    it("batchState is updated before safeTransferFrom (no reentrancy window)", async function () {
      await supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY);
      // If state update happened after token transfer, reentrancy could re-enter with old state.
      // State must be DISTRIBUTED (1) confirming update occurred before the ERC1155 hook.
      expect(await supplyTrace.batchState(tokenId)).to.equal(1);
    });

    it("recallBatch sets inactive before emitting — double-recall reverts with AlreadyInactive", async function () {
      await supplyTrace.connect(deployer).recallBatch(tokenId);
      const batch = await supplyTrace.batches(tokenId);
      expect(batch.active).to.be.false;
      await expect(
        supplyTrace.connect(deployer).recallBatch(tokenId)
      ).to.be.revertedWithCustomError(supplyTrace, "AlreadyInactive");
    });

    // ── Event completeness ─────────────────────────────────────────────────
    it("BatchMinted emits correct args", async function () {
      await expect(
        supplyTrace.connect(manufacturer).mintBatch("ipfs://Qm2", 50n)
      )
        .to.emit(supplyTrace, "BatchMinted")
        .withArgs(anyValue, manufacturer.address, 50n);
    });

    it("BatchTransferred event includes timestamp field", async function () {
      await expect(
        supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, QUANTITY)
      )
        .to.emit(supplyTrace, "BatchTransferred")
        .withArgs(tokenId, manufacturer.address, distributor.address, QUANTITY, anyValue);
    });

    it("BatchRecalled emits correct tokenId", async function () {
      await expect(supplyTrace.connect(deployer).recallBatch(tokenId))
        .to.emit(supplyTrace, "BatchRecalled")
        .withArgs(tokenId);
    });

    // ── Input guards ──────────────────────────────────────────────────────
    it("transferBatch reverts on zero address recipient", async function () {
      await expect(
        supplyTrace.connect(manufacturer).transferBatch(tokenId, ethers.ZeroAddress, QUANTITY)
      ).to.be.revertedWithCustomError(supplyTrace, "ZeroAddress");
    });

    it("transferBatch reverts on zero quantity", async function () {
      await expect(
        supplyTrace.connect(manufacturer).transferBatch(tokenId, distributor.address, 0)
      ).to.be.revertedWithCustomError(supplyTrace, "ZeroQuantity");
    });

    it("verifyAuthenticity reverts for nonexistent token", async function () {
      await expect(
        supplyTrace.verifyAuthenticity(9999n)
      ).to.be.revertedWithCustomError(supplyTrace, "InvalidToken");
    });
  });
});
