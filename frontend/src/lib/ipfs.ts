const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'

export function resolveIpfsUri(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return IPFS_GATEWAY + uri.slice(7)
  }
  return uri
}
