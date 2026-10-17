import { ApiError } from '@/api/client'

export interface AuthErrorInfo {
  message: string
  /** True when the email exists but is not verified yet. */
  unverified: boolean
}

/** Turns an ApiError from the auth endpoints into copy for the UI. */
export function describeAuthError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): AuthErrorInfo {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return {
        message:
          error.message ||
          'Please verify your email before logging in.',
        unverified: true,
      }
    }
    if (error.status === 401) {
      return { message: 'Invalid email or password.', unverified: false }
    }
    if (error.status === 429) {
      return {
        message: 'Too many attempts. Please wait a moment and try again.',
        unverified: false,
      }
    }
    if (error.status === 409) {
      return {
        message: error.message || 'That email is already registered.',
        unverified: false,
      }
    }
    return { message: error.message || fallback, unverified: false }
  }
  return { message: fallback, unverified: false }
}
