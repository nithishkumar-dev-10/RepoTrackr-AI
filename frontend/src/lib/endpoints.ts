/** Catalog of backend routes surfaced on the Developer page. */

export type EndpointAvailability = 'live' | 'demo'

export interface EndpointSpec {
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  availability: EndpointAvailability
  description: string
}

export const ENDPOINTS: EndpointSpec[] = [
  {
    method: 'POST',
    path: '/auth/signup',
    availability: 'live',
    description: 'Create an account; sends a verification email.',
  },
  {
    method: 'POST',
    path: '/auth/login',
    availability: 'live',
    description: 'Password login; returns access + refresh tokens.',
  },
  {
    method: 'POST',
    path: '/auth/verify-email',
    availability: 'live',
    description: 'Confirm an email from the verification token.',
  },
  {
    method: 'POST',
    path: '/auth/resend-verification',
    availability: 'live',
    description: 'Re-send the verification email.',
  },
  {
    method: 'POST',
    path: '/auth/refresh',
    availability: 'live',
    description: 'Exchange a refresh token for a new token pair.',
  },
  {
    method: 'GET',
    path: '/auth/me',
    availability: 'live',
    description: 'Current user profile.',
  },
  {
    method: 'GET',
    path: '/repos',
    availability: 'live',
    description: "List the user's tracked repositories.",
  },
  {
    method: 'POST',
    path: '/repos',
    availability: 'live',
    description: 'Track a public GitHub repository by URL.',
  },
  {
    method: 'GET',
    path: '/repos/{id}',
    availability: 'live',
    description: 'Fetch a single owned repository.',
  },
  {
    method: 'DELETE',
    path: '/repos/{id}',
    availability: 'live',
    description: 'Remove a tracked repository.',
  },
  {
    method: 'POST',
    path: '/repos/{id}/index',
    availability: 'demo',
    description: 'Start indexing; returns 501, falls back to demo data.',
  },
  {
    method: 'GET',
    path: '/repos/{id}/index/status',
    availability: 'demo',
    description: 'Indexing progress; demo data drives the timeline.',
  },
  {
    method: 'GET',
    path: '/repos/{id}/index/summary',
    availability: 'demo',
    description: 'Index summary; demo data.',
  },
  {
    method: 'GET',
    path: '/repos/{id}/reader',
    availability: 'demo',
    description: 'Reader-mode answer + reading order; demo data.',
  },
  {
    method: 'GET',
    path: '/repos/{id}/plan',
    availability: 'demo',
    description: 'Plan verification; demo data.',
  },
  {
    method: 'POST',
    path: '/repos/{id}/plan',
    availability: 'demo',
    description: 'Upload a plan file; demo data.',
  },
  {
    method: 'POST',
    path: '/repos/{id}/context',
    availability: 'demo',
    description: 'Pack token-budgeted context; demo data.',
  },
  {
    method: 'POST',
    path: '/repos/{id}/query',
    availability: 'demo',
    description: 'Ask a question in a chosen mode; demo data.',
  },
  {
    method: 'GET',
    path: '/repos/{id}/agent/trace',
    availability: 'demo',
    description: 'Agent trace; demo data.',
  },
  {
    method: 'GET',
    path: '/evals',
    availability: 'demo',
    description: 'Evaluation results; demo data.',
  },
]
