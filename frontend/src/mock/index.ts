/**
 * Mock data for endpoints the backend still returns 501 for.
 * The only consumer is `src/api/galaxy.ts`, which falls back to these on
 * 501/failure and marks the response as demo data.
 */
export * from './auth'
export * from './graph'
export * from './pipeline'
export * from './queries'
export * from './util'
