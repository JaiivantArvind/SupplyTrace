import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { contractAddress, contractAbi } from '@/lib/contract'
import { useRole } from '@/hooks/useRole'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldCheck, AlertCircle } from 'lucide-react'
import { keccak256, toBytes } from 'viem'

const ROLE_OPTIONS = [
  { label: 'MANUFACTURER_ROLE', value: keccak256(toBytes('MANUFACTURER_ROLE')) },
  { label: 'DISTRIBUTOR_ROLE',  value: keccak256(toBytes('DISTRIBUTOR_ROLE')) },
  { label: 'RETAILER_ROLE',     value: keccak256(toBytes('RETAILER_ROLE')) },
  { label: 'INSPECTOR_ROLE',    value: keccak256(toBytes('INSPECTOR_ROLE')) },
  { label: 'ADMIN_ROLE',        value: keccak256(toBytes('ADMIN_ROLE')) },
]

export default function AdminPanel() {
  const { isAdmin, isConnected } = useRole()

  // Recall state
  const [recallTokenId, setRecallTokenId] = useState('')
  const { data: recallHash, writeContract: writeRecall, isPending: recallPending, error: recallError } = useWriteContract()
  const { isLoading: recallConfirming, isSuccess: recallSuccess } = useWaitForTransactionReceipt({ hash: recallHash })

  // Role grant state
  const [grantAddress, setGrantAddress] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [grantAction, setGrantAction] = useState<'grant' | 'revoke'>('grant')
  const { data: roleHash, writeContract: writeRole, isPending: rolePending, error: roleError } = useWriteContract()
  const { isLoading: roleConfirming, isSuccess: roleSuccess } = useWaitForTransactionReceipt({ hash: roleHash })

  const handleRecall = () => {
    if (!recallTokenId) return
    writeRecall({
      address: contractAddress,
      abi: contractAbi,
      functionName: 'recallBatch',
      args: [BigInt(recallTokenId)],
    })
  }

  const handleRoleChange = () => {
    if (!grantAddress || !selectedRole) return
    writeRole({
      address: contractAddress,
      abi: contractAbi,
      functionName: grantAction === 'grant' ? 'grantRole' : 'revokeRole',
      args: [selectedRole as `0x${string}`, grantAddress as `0x${string}`],
    })
  }

  if (!isConnected) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Connect your wallet to access the admin panel.</AlertDescription>
      </Alert>
    )
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>You need ADMIN_ROLE to access this panel.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">Recall batches and manage role assignments.</p>
      </div>

      {/* Recall */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Recall Batch</CardTitle>
          <CardDescription>
            Permanently deactivates a batch. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recall-id">Token ID</Label>
            <Input
              id="recall-id"
              type="number"
              min="1"
              placeholder="1"
              value={recallTokenId}
              onChange={(e) => setRecallTokenId(e.target.value)}
            />
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleRecall}
            disabled={recallPending || recallConfirming || !recallTokenId}
          >
            {recallPending ? 'Confirm in MetaMask…' : recallConfirming ? 'Confirming…' : 'Recall Batch'}
          </Button>
          {recallError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{recallError.message}</AlertDescription>
            </Alert>
          )}
          {recallSuccess && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>Batch recalled successfully.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Role management */}
      <Card>
        <CardHeader>
          <CardTitle>Role Management</CardTitle>
          <CardDescription>Grant or revoke supply chain roles for an address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-addr">Wallet Address</Label>
            <Input
              id="role-addr"
              placeholder="0x..."
              value={grantAddress}
              onChange={(e) => setGrantAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={grantAction} onValueChange={(v) => setGrantAction(v as 'grant' | 'revoke')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grant">Grant Role</SelectItem>
                <SelectItem value="revoke">Revoke Role</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            variant={grantAction === 'revoke' ? 'destructive' : 'default'}
            onClick={handleRoleChange}
            disabled={rolePending || roleConfirming || !grantAddress || !selectedRole}
          >
            {rolePending ? 'Confirm in MetaMask…' : roleConfirming ? 'Confirming…' : grantAction === 'grant' ? 'Grant Role' : 'Revoke Role'}
          </Button>
          {roleError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{roleError.message}</AlertDescription>
            </Alert>
          )}
          {roleSuccess && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>Role {grantAction === 'grant' ? 'granted' : 'revoked'} successfully.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
