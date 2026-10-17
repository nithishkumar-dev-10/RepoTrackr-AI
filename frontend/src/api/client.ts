import { addApiLog } from '@/lib/apiLog'
import { env } from '@/lib/env'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/lib/tokenStorage'
import type { ApiErrorBody, ApiFieldError, TokenResponse } from '@/types'

/** Error thrown for any non-2xx API response, carrying the backend envelope. */
export class ApiError extends Error {
  status: number
  code: string
  details: ApiFieldError[] | null

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiFieldError[] | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Multipart form body; mutually exclusive with `body`. */
  form?: FormData
  /** Attach the access token if present. Default true. */
  auth?: boolean
  /** Attempt a token refresh and one retry on 401. Default true. */
  retryOn401?: boolean
}

let refreshPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  const started = performance.now()
  try {
    const res = await fetch(`${env.API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    addApiLog({
      method: 'POST',
      path: '/auth/refresh',
      status: res.status,
      ok: res.ok,
      ms: Math.round(performance.now() - started),
    })
    if (!res.ok) return false
    const data = (await res.json()) as TokenResponse
    setTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Thin fetch wrapper: base URL, JSON body, bearer token, a single
 * refresh-and-retry on 401, and the shared error envelope.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, form, auth = true, retryOn401 = true, headers, ...rest } = options

  const send = (): Promise<Response> => {
    const h = new Headers(headers)
    if (form === undefined && body !== undefined) {
      h.set('Content-Type', 'application/json')
    }
    if (auth) {
      const token = getAccessToken()
      if (token) h.set('Authorization', `Bearer ${token}`)
    }
    return fetch(`${env.API_URL}${path}`, {
      ...rest,
      headers: h,
      body:
        form ??
        (body === undefined ? undefined : JSON.stringify(body)),
    })
  }

  const method = (rest.method ?? 'GET').toString().toUpperCase()
  const started = performance.now()

  let res: Response
  try {
    res = await send()
    if (res.status === 401 && retryOn401 && auth) {
      refreshPromise ??= doRefresh().finally(() => {
        refreshPromise = null
      })
      const refreshed = await refreshPromise
      if (refreshed) {
        res = await send()
      } else {
        clearTokens()
      }
    }
  } catch (error) {
    addApiLog({
      method,
      path,
      status: 0,
      ok: false,
      ms: Math.round(performance.now() - started),
    })
    throw error
  }

  addApiLog({
    method,
    path,
    status: res.status,
    ok: res.ok,
    ms: Math.round(performance.now() - started),
  })

  if (!res.ok) {
    let code = 'http_error'
    let message = res.statusText || `Request failed (${res.status})`
    let details: ApiFieldError[] | null = null
    try {
      const data = (await res.json()) as ApiErrorBody
      if (data?.error) {
        code = data.error.code
        message = data.error.message
        details = data.error.details ?? null
      }
    } catch {
      // Non-JSON error body; keep the status text.
    }
    throw new ApiError(res.status, code, message, details)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
