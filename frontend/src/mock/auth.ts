import type { Repo, TokenResponse, User } from '@/types'

export const mockUser: User = {
  id: 1,
  email: 'demo@repotrackr.ai',
  is_verified: true,
  created_at: '2026-10-10T12:00:00Z',
}

export const mockTokens: TokenResponse = {
  access_token: 'mock.access.token',
  refresh_token: 'mock.refresh.token',
  token_type: 'bearer',
}

export const mockRepos: Repo[] = [
  {
    id: 10,
    url: 'https://github.com/psf/requests',
    owner: 'psf',
    name: 'requests',
    status: 'indexed',
    created_at: '2026-10-09T09:15:00Z',
  },
  {
    id: 11,
    url: 'https://github.com/tiangolo/fastapi',
    owner: 'tiangolo',
    name: 'fastapi',
    status: 'indexing',
    created_at: '2026-10-10T08:30:00Z',
  },
  {
    id: 12,
    url: 'https://github.com/pallets/flask',
    owner: 'pallets',
    name: 'flask',
    status: 'added',
    created_at: '2026-10-10T11:45:00Z',
  },
]
