/**
 * Central token persistence. Kept separate from the auth store so the API
 * client can read tokens without importing React/store code (avoids cycles).
 */
const ACCESS_KEY = 'rt.access_token'
const REFRESH_KEY = 'rt.refresh_token'

/** Fired once the API client decides a session can no longer be refreshed. */
export const AUTH_INVALIDATED_EVENT = 'rt:auth-invalidated'

let tokenGeneration = 0

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function getTokenGeneration(): number {
  return tokenGeneration
}

/** Writes are ignored if a logout/invalidation happened while a refresh ran. */
export function setTokens(pair: TokenPair, expectedGeneration = tokenGeneration): void {
  if (expectedGeneration !== tokenGeneration) return
  localStorage.setItem(ACCESS_KEY, pair.accessToken)
  localStorage.setItem(REFRESH_KEY, pair.refreshToken)
}

export function clearTokens(): void {
  tokenGeneration += 1
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
