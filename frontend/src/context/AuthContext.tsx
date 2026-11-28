import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

import * as authApi from '@/api/auth'
import {
  AUTH_INVALIDATED_EVENT,
  clearTokens,
  getAccessToken,
  setTokens,
} from '@/lib/tokenStorage'
import type { SignupResponse, User } from '@/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  /** Returns the backend message and verification flag; never logs the user in. */
  signup: (email: string, password: string) => Promise<SignupResponse>
  logout: () => Promise<void>
  /** Re-read the session from GET /auth/me. */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const loadUser = useCallback(async () => {
    try {
      const me = await authApi.me()
      setUser(me)
      setStatus('authenticated')
    } catch {
      clearTokens()
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      setStatus('anonymous')
      return
    }
    await loadUser()
  }, [loadUser])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!getAccessToken()) {
        if (!cancelled) {
          setUser(null)
          setStatus('anonymous')
        }
        return
      }
      try {
        const me = await authApi.me()
        if (!cancelled) {
          setUser(me)
          setStatus('authenticated')
        }
      } catch {
        if (!cancelled) {
          clearTokens()
          setUser(null)
          setStatus('anonymous')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleInvalidation = () => {
      clearTokens()
      setUser(null)
      setStatus('anonymous')
    }
    window.addEventListener(AUTH_INVALIDATED_EVENT, handleInvalidation)
    return () => window.removeEventListener(AUTH_INVALIDATED_EVENT, handleInvalidation)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login({ email, password })
    setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    })
    const me = await authApi.me()
    setUser(me)
    setStatus('authenticated')
  }, [])

  const signup = useCallback(async (email: string, password: string) => {
    return authApi.signup({ email, password })
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // The server may be unreachable; clearing local tokens still ends the session.
    }
    clearTokens()
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, signup, logout, refresh }),
    [user, status, login, signup, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
