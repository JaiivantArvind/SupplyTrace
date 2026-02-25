import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/lib/theme'
import { Layout } from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import MintBatch from '@/pages/MintBatch'
import TransferBatch from '@/pages/TransferBatch'
import ExploreBatches from '@/pages/ExploreBatches'
import Verify from '@/pages/Verify'
import AdminPanel from '@/pages/AdminPanel'
import Settings from '@/pages/Settings'

function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/"               element={<Dashboard />} />
          <Route path="/mint"           element={<MintBatch />} />
          <Route path="/transfer"       element={<TransferBatch />} />
          <Route path="/explore"        element={<ExploreBatches />} />
          <Route path="/verify/:tokenId" element={<Verify />} />
          <Route path="/admin"          element={<AdminPanel />} />
          <Route path="/settings"       element={<Settings />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App
