import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://jddicptamwwfqpnhhobl.supabase.co'

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZGljcHRhbXd3ZnFwbmhob2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzU4MzIsImV4cCI6MjA5MTY1MTgzMn0.M7ZUuieqKIXBpBhWYRYtaG8U_iitSMGwHiUzNBaSES4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export interface DbRoleApplication {
  id: string
  wallet_address: string
  organization_name: string
  registration_number: string
  contact_email: string
  requested_role: 'MANUFACTURER' | 'DISTRIBUTOR' | 'RETAILER' | 'INSPECTOR'
  scope_description: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewed_by: string | null
  tx_hash: string | null
  created_at: string
  reviewed_at: string | null
}

export interface DbOrganization {
  id: string
  wallet_address: string
  organization_name: string
  registration_number: string
  role: string
  contact_email: string | null
  website: string | null
  verified: boolean
  created_at: string
}

// ── Database Access Operations ───────────────────────────────────────────────

export async function getDbRoleApplications(): Promise<DbRoleApplication[]> {
  try {
    const { data, error } = await supabase
      .from('supplytrace_role_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase fetch error, fallback active:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('Failed to connect to Supabase:', err)
    return []
  }
}

export async function insertDbRoleApplication(app: {
  wallet_address: string
  organization_name: string
  registration_number: string
  contact_email: string
  requested_role: 'MANUFACTURER' | 'DISTRIBUTOR' | 'RETAILER' | 'INSPECTOR'
  scope_description?: string
}): Promise<DbRoleApplication | null> {
  try {
    const { data, error } = await supabase
      .from('supplytrace_role_applications')
      .insert([app])
      .select()
      .single()

    if (error) {
      console.warn('Failed to insert role application into Supabase:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn('Supabase insert error:', err)
    return null
  }
}

export async function updateDbRoleApplicationStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  txHash?: string,
  reviewerAddress?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('supplytrace_role_applications')
      .update({
        status,
        tx_hash: txHash || null,
        reviewed_by: reviewerAddress || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.warn('Failed to update application status in Supabase:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase update error:', err)
    return false
  }
}

export async function upsertDbOrganization(org: {
  wallet_address: string
  organization_name: string
  registration_number: string
  role: string
  contact_email?: string
  website?: string
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('supplytrace_organizations')
      .upsert([org], { onConflict: 'wallet_address' })

    if (error) {
      console.warn('Failed to upsert organization into Supabase:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase upsert error:', err)
    return false
  }
}
