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
import { initialSync, uploadPendingPhotos } from '../lib/sync'

interface AuthState {
  loading: boolean
  authenticated: boolean
  cloudEnabled: boolean
  userEmail: string | null
  syncMessage: string
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>
  requestEmailChange: (newEmail: string) => Promise<void>
  confirmEmailChange: (code: string) => Promise<void>
  signOut: () => void
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const cloudEnabled = isCloudSyncEnabled()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
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
        setUserEmail(await cognito.getSignedInEmail())
        await runInitialSync()
      } else {
        setUserEmail(null)
      }
    } catch {
      setAuthenticated(false)
      setUserEmail(null)
    } finally {
      setLoading(false)
    }
  }, [cloudEnabled, runInitialSync])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  useEffect(() => {
    if (!cloudEnabled || !authenticated) return

    function onOnline() {
      void uploadPendingPhotos()
    }

    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [cloudEnabled, authenticated])

  const signIn = useCallback(
    async (email: string, password: string) => {
      await cognito.signIn(email, password)
      setAuthenticated(true)
      setUserEmail(email.trim())
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

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await cognito.changePassword(currentPassword, newPassword)
  }, [])

  const forgotPassword = useCallback(async (email: string) => {
    await cognito.forgotPassword(email)
  }, [])

  const confirmForgotPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await cognito.confirmForgotPassword(email, code, newPassword)
    },
    [],
  )

  const requestEmailChange = useCallback(async (newEmail: string) => {
    await cognito.requestEmailChange(newEmail)
  }, [])

  const confirmEmailChange = useCallback(async (code: string) => {
    await cognito.confirmEmailChange(code)
    setUserEmail(await cognito.getSignedInEmail())
  }, [])

  const signOut = useCallback(() => {
    cognito.signOut()
    setAuthenticated(false)
    setUserEmail(null)
    setSyncMessage('')
  }, [])

  const value = useMemo(
    () => ({
      loading,
      authenticated,
      cloudEnabled,
      userEmail,
      syncMessage,
      signIn,
      signUp,
      confirmSignUp,
      changePassword,
      forgotPassword,
      confirmForgotPassword,
      requestEmailChange,
      confirmEmailChange,
      signOut,
      refreshSession,
    }),
    [
      loading,
      authenticated,
      cloudEnabled,
      userEmail,
      syncMessage,
      signIn,
      signUp,
      confirmSignUp,
      changePassword,
      forgotPassword,
      confirmForgotPassword,
      requestEmailChange,
      confirmEmailChange,
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
