// Ordered list of public gateways to try — falls through on 404/timeout
const IPFS_GATEWAYS = [
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
]

export interface BatchMetadata {
  name: string
  description: string
  manufacturer: string
  manufacture_date: string
  certifications: {
    type: string
    document_hash: string
  }[]
  origin_coordinates: {
    lat: number
    lng: number
  }
  image: string
}

export function resolveIPFS(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return IPFS_GATEWAYS[0] + uri.slice(7)
  }
  return uri
}

export async function fetchIPFSMetadata<T = unknown>(uri: string): Promise<T> {
  const cid = uri.startsWith('ipfs://') ? uri.slice(7) : uri
  let lastError: Error = new Error('No gateways available')

  for (const gateway of IPFS_GATEWAYS) {
    const url = gateway + cid
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (response.ok) return response.json() as Promise<T>
      lastError = new Error(`${response.status} (${url})`)
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }

  throw new Error(`Failed to fetch IPFS metadata from all gateways: ${lastError.message}`)
}
