import { BigInt } from "@graphprotocol/graph-ts"
import {
  BatchMinted as BatchMintedEvent,
  BatchTransferred as BatchTransferredEvent,
  BatchRecalled as BatchRecalledEvent,
  SupplyTraceUpgradeable,
} from "../generated/SupplyTraceUpgradeable/SupplyTraceUpgradeable"
import { Batch, CustodyTransfer, Recall } from "../generated/schema"

// ── BatchMinted ──────────────────────────────────────────────────────────────

export function handleBatchMinted(event: BatchMintedEvent): void {
  let id = event.params.tokenId.toString()

  let batch = new Batch(id)
  batch.tokenId      = event.params.tokenId
  batch.manufacturer = event.params.manufacturer
  batch.quantity     = event.params.quantity
  batch.active       = true
  batch.state        = 0 // CREATED
  batch.custodyCount = 0
  batch.blockNumber  = event.block.number
  batch.timestamp    = event.block.timestamp

  // Fetch metadataURI via contract call — try_ handles revert gracefully
  let contract = SupplyTraceUpgradeable.bind(event.address)
  let result   = contract.try_verifyAuthenticity(event.params.tokenId)
  if (!result.reverted) {
    batch.metadataURI = result.value.getMetadataURI()
  } else {
    batch.metadataURI = ""
  }

  batch.save()
}

// ── BatchTransferred ─────────────────────────────────────────────────────────

export function handleBatchTransferred(event: BatchTransferredEvent): void {
  // Create immutable CustodyTransfer record
  let transferId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let transfer   = new CustodyTransfer(transferId)

  transfer.tokenId         = event.params.tokenId
  transfer.from            = event.params.from
  transfer.to              = event.params.to
  transfer.quantity        = event.params.quantity
  transfer.timestamp       = event.block.timestamp
  transfer.blockNumber     = event.block.number
  transfer.transactionHash = event.transaction.hash

  transfer.save()

  // Update mutable Batch entity
  let batchId = event.params.tokenId.toString()
  let batch   = Batch.load(batchId)
  if (batch == null) return

  batch.custodyCount = batch.custodyCount + 1

  // Fetch updated state from contract
  let contract    = SupplyTraceUpgradeable.bind(event.address)
  let stateResult = contract.try_batchState(event.params.tokenId)
  if (!stateResult.reverted) {
    batch.state = stateResult.value
  }

  batch.save()
}

// ── BatchRecalled ────────────────────────────────────────────────────────────

export function handleBatchRecalled(event: BatchRecalledEvent): void {
  // Create Recall record
  let recallId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let recall   = new Recall(recallId)

  recall.tokenId         = event.params.tokenId
  recall.timestamp       = event.block.timestamp
  recall.blockNumber     = event.block.number
  recall.transactionHash = event.transaction.hash

  recall.save()

  // Mark batch inactive + CLOSED
  let batchId = event.params.tokenId.toString()
  let batch   = Batch.load(batchId)
  if (batch == null) return

  batch.active = false
  batch.state  = 4 // CLOSED

  batch.save()
}
