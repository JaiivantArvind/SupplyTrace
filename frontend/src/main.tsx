import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { sepolia, hardhat } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const rawSepoliaRpc = import.meta.env.VITE_SEPOLIA_RPC_URL
const sepoliaRpc = rawSepoliaRpc && !rawSepoliaRpc.includes('your-api-key') ? rawSepoliaRpc : undefined

const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const chains = isLocalDev ? ([hardhat, sepolia] as const) : ([sepolia, hardhat] as const)

const config = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(sepoliaRpc),
    [hardhat.id]: http(isLocalDev ? '/rpc' : 'http://127.0.0.1:8545'),
  },
})

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </BrowserRouter>
  </StrictMode>,
)

