import { request } from '@/api/client'
import { getRefreshToken } from '@/lib/tokenStorage'
import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  ResendVerificationRequest,
  ResetPasswordRequest,
  SignupRequest,
  SignupResponse,
  TokenResponse,
  User,
  VerifyEmailRequest,
} from '@/types/auth'

/**
 * Real auth endpoints from backend/app/features/auth/router.py.
 * Public calls send no bearer token; session calls require one.
 */

/** POST /auth/signup — creates an account. By default it emails a verification
 *  link and does NOT log the user in. When the backend has verification
 *  disabled, the response carries `verification_required: false`. */
export function signup(payload: SignupRequest): Promise<SignupResponse> {
  return request<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: payload,
    auth: false,
  })
}

/** POST /auth/login — returns the access/refresh pair. An unverified email
 *  is still a neutral 401; it is identified by `error.code ===
 *  'email_not_verified'` (see `describeAuthError`). */
export function login(payload: LoginRequest): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: payload,
    auth: false,
  })
}

/** POST /auth/verify-email — consumes the token from the emailed link. */
export function verifyEmail(payload: VerifyEmailRequest): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/verify-email', {
    method: 'POST',
    body: payload,
    auth: false,
  })
}

/** POST /auth/resend-verification — always returns a generic message. */
export function resendVerification(
  payload: ResendVerificationRequest,
): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/resend-verification', {
    method: 'POST',
    body: payload,
    auth: false,
  })
}

/** GET /auth/me — the current session user. */
export function me(): Promise<User> {
  return request<User>('/auth/me')
}

/** POST /auth/logout — revokes the refresh token, then the client clears tokens. */
export function logout(): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/logout', {
    method: 'POST',
    body: { refresh_token: getRefreshToken() },
  })
}

/** POST /auth/forgot-password — always returns a generic message. */
export function forgotPassword(
  payload: ForgotPasswordRequest,
): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: payload,
    auth: false,
  })
}

/** POST /auth/reset-password — sets a new password from a reset token. */
export function resetPassword(
  payload: ResetPasswordRequest,
): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: payload,
    auth: false,
  })
}

/** POST /auth/change-password — requires the current password. */
export function changePassword(
  payload: ChangePasswordRequest,
): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/change-password', {
    method: 'POST',
    body: payload,
  })
}

/** DELETE /auth/account — deletes the current user. */
export function deleteAccount(): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/account', { method: 'DELETE' })
}
