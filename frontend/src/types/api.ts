/** Shared HTTP error envelope defined in backend/app/schemas/common.py. */

export interface ApiFieldError {
  type?: string
  loc?: (string | number)[]
  msg?: string
  input?: unknown
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: ApiFieldError[] | null
  }
}

export interface HealthResponse {
  status: string
}

export interface NotImplementedResponse {
  status: 'not_implemented'
}
