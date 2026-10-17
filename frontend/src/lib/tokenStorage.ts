/**
 * Central token persistence. Kept separate from the auth store so the API
 * client can read tokens without importing React/store code (avoids cycles).
 */
const ACCESS_KEY = 'rt.access_token'
const REFRESH_KEY = 'rt.refresh_token'

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

export function setTokens(pair: TokenPair): void {
  localStorage.setItem(ACCESS_KEY, pair.accessToken)
  localStorage.setItem(REFRESH_KEY, pair.refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
