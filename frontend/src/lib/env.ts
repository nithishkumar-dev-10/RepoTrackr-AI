/**
 * Typed access to Vite environment variables.
 * Defaults keep the app on the real backend; mocks are opt-in for demos.
 */
const rawBaseUrl = import.meta.env.VITE_API_URL
const rawUseMocks = import.meta.env.VITE_USE_MOCKS

export const env = {
  API_URL: (rawBaseUrl && rawBaseUrl.trim()) || 'http://localhost:8000',
  USE_MOCKS: String(rawUseMocks ?? '').toLowerCase() === 'true',
} as const
