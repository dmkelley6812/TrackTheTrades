import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { DbAccount } from '../types'

interface AccountContextValue {
  accounts: DbAccount[]
  activeAccount: DbAccount | null
  loading: boolean
  setActiveAccount: (account: DbAccount) => void
  createAccount: (data: Omit<DbAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<DbAccount>
  updateAccount: (id: string, data: Partial<Omit<DbAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

const STORAGE_KEY = 'ttt_active_account_id'

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<DbAccount[]>([])
  const [activeAccount, setActiveAccountState] = useState<DbAccount | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setAccounts([])
      setActiveAccountState(null)
      setLoading(false)
      return
    }
    void loadAccounts()
  }, [user])

  async function loadAccounts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load accounts', error)
      setLoading(false)
      return
    }

    let accts = (data ?? []) as DbAccount[]

    if (accts.length === 0) {
      const defaultAccount = await createDefaultAccount()
      if (defaultAccount) accts = [defaultAccount]
    }

    setAccounts(accts)

    const savedId = localStorage.getItem(STORAGE_KEY)
    const saved = accts.find(a => a.id === savedId)
    const active = saved ?? accts[0] ?? null
    setActiveAccountState(active)

    // Re-run migration for any rows that still have null account_id
    // (handles the case where the initial migration ran before UPDATE policies existed)
    if (active) {
      await migrateUnassignedData(active.id)
    }

    setLoading(false)
  }

  async function migrateUnassignedData(accountId: string) {
    await Promise.all([
      supabase.from('trades').update({ account_id: accountId }).eq('user_id', user!.id).is('account_id', null),
      supabase.from('orders').update({ account_id: accountId }).eq('user_id', user!.id).is('account_id', null),
      supabase.from('imports').update({ account_id: accountId }).eq('user_id', user!.id).is('account_id', null),
      supabase.from('goals').update({ account_id: accountId }).eq('user_id', user!.id).is('account_id', null),
    ])
  }

  async function createDefaultAccount(): Promise<DbAccount | null> {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: user!.id,
        name: 'My Account',
        account_type: 'paper',
        product_type: 'futures',
        broker: '',
        currency: 'USD',
        starting_balance: null,
        color: '#4a7cf4',
        is_default: true,
        description: null,
      })
      .select()
      .single()

    if (error) return null
    return data as DbAccount
  }

  function setActiveAccount(account: DbAccount) {
    setActiveAccountState(account)
    localStorage.setItem(STORAGE_KEY, account.id)
  }

  const createAccount = useCallback(async (
    data: Omit<DbAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<DbAccount> => {
    const { data: inserted, error } = await supabase
      .from('accounts')
      .insert({ ...data, user_id: user!.id })
      .select()
      .single()
    if (error) throw error
    const account = inserted as DbAccount
    setAccounts(prev => [...prev, account])
    return account
  }, [user])

  const updateAccount = useCallback(async (
    id: string,
    data: Partial<Omit<DbAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<void> => {
    const { error } = await supabase
      .from('accounts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user!.id)
    if (error) throw error
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
    setActiveAccountState(prev => prev?.id === id ? { ...prev, ...data } : prev)
  }, [user])

  const deleteAccount = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user!.id)
    if (error) throw error
    setAccounts(prev => {
      const next = prev.filter(a => a.id !== id)
      if (activeAccount?.id === id) {
        const fallback = next[0] ?? null
        setActiveAccountState(fallback)
        if (fallback) localStorage.setItem(STORAGE_KEY, fallback.id)
        else localStorage.removeItem(STORAGE_KEY)
      }
      return next
    })
  }, [user, activeAccount])

  return (
    <AccountContext.Provider value={{ accounts, activeAccount, loading, setActiveAccount, createAccount, updateAccount, deleteAccount }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
