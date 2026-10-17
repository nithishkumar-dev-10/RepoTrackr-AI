/**
 * Typed access to Vite environment variables.
 * The only variable is the backend base URL; everything else is derived.
 */
const rawBaseUrl = import.meta.env.VITE_API_URL

export const env = {
  API_URL: (rawBaseUrl && rawBaseUrl.trim()) || 'http://localhost:8000',
} as const
