import type { QueryIntent, QueryResponse } from '@/types'

/**
 * One canned response per intent. Citations point at the same files/lines
 * used by the mock graph so the galaxy can highlight them.
 */

export const mockReaderResponse: QueryResponse = {
  intent: 'reader',
  answer:
    'Start at **app/main.py**, where `create_app` wires routers together — that is the composition root. ' +
    'From there follow the request path: routes delegate to `app/api/deps.py` for the database session and ' +
    'the current user, and `current_user` decodes the JWT via `app/auth/tokens.py`. Authentication itself ' +
    'lives in `app/auth/service.py`: `login` verifies the password and mints tokens. Read in this order to ' +
    'understand the app without jumping around.',
  citations: [
    {
      file: 'app/main.py',
      line: 12,
      snippet:
        'def create_app() -> FastAPI:\n    app = FastAPI(lifespan=lifespan)\n    app.include_router(repos.router)',
    },
    {
      file: 'app/api/deps.py',
      line: 9,
      snippet:
        'def current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:',
    },
    {
      file: 'app/auth/tokens.py',
      line: 11,
      snippet: 'def decode_token(token: str) -> dict:\n    return jwt.decode(token, settings.SECRET_KEY)',
    },
    {
      file: 'app/auth/service.py',
      line: 18,
      snippet:
        'def login(email: str, password: str, db: Session) -> TokenPair:\n    user = get_user_by_email(db, email)',
    },
  ],
  readingOrder: [
    'sym:core.main:create_app',
    'mod:api.routes',
    'sym:api.deps:current_user',
    'sym:auth.tokens:decode_token',
    'sym:auth.service:login',
    'sym:auth.security:verify_password',
  ],
}

export const mockPlanResponse: QueryResponse = {
  intent: 'plan',
  answer:
    '2 of 5 plan items are done, 1 is partial, 1 is missing and 1 could not be determined. ' +
    'Evidence for each item is linked below; the “missing” item has no matching code in the index.',
  citations: [
    {
      file: 'app/auth/security.py',
      line: 6,
      snippet: 'def hash_password(raw: str) -> str:\n    return ph.hash(raw)',
    },
    {
      file: 'app/auth/deps.py',
      line: 4,
      snippet: 'def rate_limit(request: Request) -> None:\n    _check_bucket(request.client.host)',
    },
  ],
  planItems: [
    {
      id: 'plan-1',
      text: 'Password hashing with argon2',
      status: 'done',
      evidence: [
        {
          file: 'app/auth/security.py',
          line: 6,
          snippet: 'def hash_password(raw: str) -> str:\n    return ph.hash(raw)',
        },
      ],
    },
    {
      id: 'plan-2',
      text: 'JWT access + refresh tokens',
      status: 'done',
      evidence: [
        {
          file: 'app/auth/tokens.py',
          line: 11,
          snippet: 'def decode_token(token: str) -> dict: ...',
        },
      ],
    },
    {
      id: 'plan-3',
      text: 'Per-IP rate limiting on auth endpoints',
      status: 'partial',
      evidence: [
        {
          file: 'app/auth/deps.py',
          line: 4,
          snippet: 'def rate_limit(request: Request) -> None:\n    _check_bucket(request.client.host)',
        },
      ],
    },
    {
      id: 'plan-4',
      text: 'OAuth login with GitHub',
      status: 'missing',
      evidence: [],
    },
    {
      id: 'plan-5',
      text: 'Audit log for auth events',
      status: 'unknown',
      evidence: [],
    },
  ],
}

export const mockContextPackResponse: QueryResponse = {
  intent: 'context_pack',
  answer:
    'Packed the auth slice within a 8,000-token budget: 3 files in full and 4 as signatures only. ' +
    'The markdown context and a ready-to-use prompt are below.',
  citations: [
    {
      file: 'app/auth/service.py',
      line: 18,
      snippet:
        'def login(email: str, password: str, db: Session) -> TokenPair:\n    user = get_user_by_email(db, email)',
    },
  ],
  packed: {
    markdown: [
      '# Context: add "login with GitHub"',
      '',
      '## app/auth/service.py (full)',
      '```python',
      'def login(email: str, password: str, db: Session) -> TokenPair:',
      '    user = get_user_by_email(db, email)',
      '    if not user or not verify_password(password, user.password_hash):',
      '        raise AuthError("invalid credentials")',
      '    return issue_tokens(user)',
      '```',
      '',
      '## app/auth/tokens.py (signature)',
      '```python',
      'def encode_token(payload: dict) -> str: ...',
      'def decode_token(token: str) -> dict: ...',
      '```',
      '',
      '## app/models/user.py (signature)',
      '```python',
      'class User(Base): ...',
      '```',
    ].join('\n'),
    prompt: [
      'You are extending the auth slice of a FastAPI service.',
      'Goal: add GitHub OAuth login that issues the same JWT pair as the password flow.',
      'Constraints:',
      '- Reuse issue_tokens() from app/auth/service.py.',
      '- Do not change the existing login() signature.',
      '- Cite any file you rely on as file:line.',
    ].join('\n'),
    tokenBudget: 8000,
    tokensUsed: 5240,
    tiers: {
      full: [
        'sym:auth.service:login',
        'sym:auth.service:signup',
        'sym:auth.security:verify_password',
      ],
      signature: [
        'sym:auth.tokens:encode_token',
        'sym:auth.tokens:decode_token',
        'sym:models.user:User',
        'sym:api.deps:current_user',
      ],
    },
  },
}

export function mockResponseForIntent(intent: QueryIntent): QueryResponse {
  switch (intent) {
    case 'reader':
      return mockReaderResponse
    case 'plan':
      return mockPlanResponse
    case 'context_pack':
      return mockContextPackResponse
  }
}

/** Cheap keyword router so the mock behaves like the real intent router. */
export function detectIntent(query: string): QueryIntent {
  const q = query.toLowerCase()
  if (/\b(plan|left|todo|done|remaining|roadmap|missing)\b/.test(q)) return 'plan'
  if (/\b(add|build|implement|pack|context|prompt|integrate)\b/.test(q)) {
    return 'context_pack'
  }
  return 'reader'
}

export const mockQueryResponses = {
  reader: mockReaderResponse,
  plan: mockPlanResponse,
  context_pack: mockContextPackResponse,
} as const
