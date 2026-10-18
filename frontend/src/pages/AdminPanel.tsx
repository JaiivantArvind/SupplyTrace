import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { contractAddress, contractAbi } from '@/config/contracts'
import { useRole } from '@/hooks/useRole'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ShieldCheck,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
} from 'lucide-react'
import { keccak256, toBytes } from 'viem'
import {
  getRoleApplications,
  updateApplicationStatus,
  ROLE_HASHES,
  type RoleApplication,
} from '@/lib/roleApplications'

const ROLE_OPTIONS = [
  { label: 'MANUFACTURER_ROLE', value: keccak256(toBytes('MANUFACTURER_ROLE')) },
  { label: 'DISTRIBUTOR_ROLE',  value: keccak256(toBytes('DISTRIBUTOR_ROLE')) },
  { label: 'RETAILER_ROLE',     value: keccak256(toBytes('RETAILER_ROLE')) },
  { label: 'INSPECTOR_ROLE',    value: keccak256(toBytes('INSPECTOR_ROLE')) },
  { label: 'ADMIN_ROLE',        value: keccak256(toBytes('ADMIN_ROLE')) },
]

export default function AdminPanel() {
  const { isAdmin, isConnected, address: adminAddress } = useRole()

  // Circuit breaker state
  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'paused',
  })
  const { data: pauseHash, writeContract: writePause, isPending: pausePending, error: pauseError } = useWriteContract()
  const { isLoading: pauseConfirming, isSuccess: pauseSuccess } = useWaitForTransactionReceipt({ hash: pauseHash })

  useEffect(() => {
    if (pauseSuccess) {
      refetchPaused()
    }
  }, [pauseSuccess, refetchPaused])

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

  // Enterprise Role Applications Queue State
  const [applications, setApplications] = useState<RoleApplication[]>(() => getRoleApplications())
  const [approvingAppId, setApprovingAppId] = useState<string | null>(null)

  useEffect(() => {
    const handleAppsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<RoleApplication[]>
      setApplications(customEvent.detail || getRoleApplications())
    }
    window.addEventListener('supplytrace:applications-updated', handleAppsUpdate)
    return () => window.removeEventListener('supplytrace:applications-updated', handleAppsUpdate)
  }, [])

  useEffect(() => {
    if (roleSuccess && approvingAppId) {
      updateApplicationStatus(approvingAppId, 'APPROVED', roleHash, adminAddress)
      setApprovingAppId(null)
    }
  }, [roleSuccess, approvingAppId, roleHash, adminAddress])

  const handleTogglePause = () => {
    writePause({
      address: contractAddress,
      abi: contractAbi,
      functionName: isPaused ? 'unpause' : 'pause',
    })
  }

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

  const handleApproveApplication = (app: RoleApplication) => {
    setApprovingAppId(app.id)
    setGrantAddress(app.address)
    const roleHash = ROLE_HASHES[app.role]
    setSelectedRole(roleHash)
    setGrantAction('grant')

    writeRole({
      address: contractAddress,
      abi: contractAbi,
      functionName: 'grantRole',
      args: [roleHash, app.address],
    })
  }

  const handleRejectApplication = (appId: string) => {
    updateApplicationStatus(appId, 'REJECTED', undefined, adminAddress)
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

  const pendingCount = applications.filter((a) => a.status === 'PENDING').length

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Admin Control Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Emergency circuit breaker controls, batch recall, and enterprise identity approvals.
          </p>
        </div>
      </div>

      {/* ── Enterprise Role Applications Queue ── */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Enterprise Role Applications Queue</CardTitle>
            </div>
            {pendingCount > 0 && (
              <Badge variant="default" className="text-xs">
                {pendingCount} Pending Review
              </Badge>
            )}
          </div>
          <CardDescription>
            Review incoming verification applications from supply chain organizations and grant cryptographic roles on Ethereum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No applications submitted yet.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization / License</TableHead>
                    <TableHead>Applicant Address</TableHead>
                    <TableHead>Requested Role</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="font-medium text-foreground text-sm">
                          {app.organizationName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {app.registrationNumber} • {app.contactEmail}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {app.address.slice(0, 6)}…{app.address.slice(-4)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            app.role === 'ADMIN'
                              ? 'border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold'
                              : ''
                          }`}
                        >
                          {app.role === 'ADMIN' ? 'ADMIN (GOV)' : app.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            app.status === 'APPROVED'
                              ? 'default'
                              : app.status === 'REJECTED'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="capitalize text-xs"
                        >
                          {app.status === 'PENDING' && (
                            <Clock className="h-3 w-3 mr-1 inline animate-pulse" />
                          )}
                          {app.status === 'APPROVED' && (
                            <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                          )}
                          {app.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {app.status === 'PENDING' ? (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleApproveApplication(app)}
                              disabled={rolePending || roleConfirming}
                              className="text-xs h-8 gap-1"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              {approvingAppId === app.id && (rolePending || roleConfirming)
                                ? 'Granting…'
                                : 'Approve On-Chain'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRejectApplication(app.id)}
                              className="text-xs h-8 text-muted-foreground hover:text-destructive"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {app.status === 'APPROVED' ? 'Granted on-chain' : 'Declined'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Circuit breaker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Circuit Breaker
            </CardTitle>
            <CardDescription>
              Emergency pause for all token minting and transfer operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Contract Status:</span>
              <Badge variant={isPaused ? 'destructive' : 'default'}>
                {isPaused ? 'Paused' : 'Active'}
              </Badge>
            </div>
            <Button
              className="w-full"
              variant={isPaused ? 'default' : 'destructive'}
              onClick={handleTogglePause}
              disabled={pausePending || pauseConfirming}
            >
              {pausePending ? (
                'Confirm in MetaMask…'
              ) : pauseConfirming ? (
                'Confirming…'
              ) : isPaused ? (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Resume Contract Operations
                </>
              ) : (
                <>
                  <PauseCircle className="w-4 h-4 mr-2" />
                  Emergency Pause Contract
                </>
              )}
            </Button>
            {pauseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{pauseError.message}</AlertDescription>
              </Alert>
            )}
            {pauseSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>
                  Contract {isPaused ? 'paused' : 'unpaused'} successfully.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Emergency batch recall */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Batch Recall</CardTitle>
            <CardDescription>Deactivate a compromised batch permanently.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recall-token">Token ID</Label>
              <Input
                id="recall-token"
                type="number"
                placeholder="e.g. 1"
                value={recallTokenId}
                onChange={(e) => setRecallTokenId(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              variant="destructive"
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
      </div>

      {/* Manual role management */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Role Assignment</CardTitle>
          <CardDescription>Grant or revoke arbitrary supply chain roles for a specific address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="role-addr">Wallet Address</Label>
              <Input
                id="role-addr"
                placeholder="0x..."
                value={grantAddress}
                onChange={(e) => setGrantAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
