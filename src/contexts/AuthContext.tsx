import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as cognito from '../lib/auth'
import { isCloudSyncEnabled } from '../lib/config'
import { initialSync } from '../lib/sync'

interface AuthState {
  loading: boolean
  authenticated: boolean
  cloudEnabled: boolean
  syncMessage: string
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  signOut: () => void
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const cloudEnabled = isCloudSyncEnabled()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  const runInitialSync = useCallback(async () => {
    const userId = await cognito.getUserId()
    if (!userId) return
    setSyncMessage('同期中…')
    try {
      const { migrated } = await initialSync(userId)
      setSyncMessage(migrated > 0 ? `${migrated} 件をクラウドへ移行しました` : '')
    } catch {
      setSyncMessage('同期に失敗しました。オンライン時に再度お試しください')
    }
  }, [])

  const refreshSession = useCallback(async () => {
    if (!cloudEnabled) {
      setAuthenticated(true)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const session = await cognito.getSession()
      setAuthenticated(Boolean(session))
      if (session) {
        await runInitialSync()
      }
    } catch {
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }, [cloudEnabled, runInitialSync])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const signIn = useCallback(
    async (email: string, password: string) => {
      await cognito.signIn(email, password)
      setAuthenticated(true)
      await runInitialSync()
    },
    [runInitialSync],
  )

  const signUp = useCallback(async (email: string, password: string) => {
    await cognito.signUp(email, password)
  }, [])

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    await cognito.confirmSignUp(email, code)
  }, [])

  const signOut = useCallback(() => {
    cognito.signOut()
    setAuthenticated(false)
    setSyncMessage('')
  }, [])

  const value = useMemo(
    () => ({
      loading,
      authenticated,
      cloudEnabled,
      syncMessage,
      signIn,
      signUp,
      confirmSignUp,
      signOut,
      refreshSession,
    }),
    [
      loading,
      authenticated,
      cloudEnabled,
      syncMessage,
      signIn,
      signUp,
      confirmSignUp,
      signOut,
      refreshSession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
