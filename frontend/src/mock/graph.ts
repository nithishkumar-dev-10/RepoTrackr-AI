import type { Graph, GraphCluster, GraphEdge, GraphNode, NodeKind } from '@/types'

/**
 * Deterministic mock of a small Python web API ("acme-api").
 * Roughly 80 nodes across 6 clusters, with module/import and call edges.
 * `centrality` is derived from node degree so the galaxy has a real hierarchy.
 */

interface SymbolSpec {
  name: string
  kind: Extract<NodeKind, 'function' | 'class'>
}

interface ModuleSpec {
  id: string
  label: string
  cluster: string
  file: string
  isEntry?: boolean
  symbols: SymbolSpec[]
}

const CLUSTERS: GraphCluster[] = [
  { id: 'core', label: 'Core & Config' },
  { id: 'api', label: 'HTTP API' },
  { id: 'auth', label: 'Authentication' },
  { id: 'models', label: 'Data Models' },
  { id: 'services', label: 'Services' },
  { id: 'utils', label: 'Utilities' },
  { id: 'tests', label: 'Tests' },
]

const MODULES: ModuleSpec[] = [
  {
    id: 'core.main',
    label: 'app/main.py',
    cluster: 'core',
    file: 'app/main.py',
    isEntry: true,
    symbols: [
      { name: 'create_app', kind: 'function' },
      { name: 'lifespan', kind: 'function' },
    ],
  },
  {
    id: 'core.config',
    label: 'app/config.py',
    cluster: 'core',
    file: 'app/config.py',
    symbols: [
      { name: 'Settings', kind: 'class' },
      { name: 'get_settings', kind: 'function' },
    ],
  },
  {
    id: 'core.pkg',
    label: 'app/__init__.py',
    cluster: 'core',
    file: 'app/__init__.py',
    isEntry: true,
    symbols: [],
  },
  {
    id: 'api.routes',
    label: 'app/api/routes.py',
    cluster: 'api',
    file: 'app/api/routes.py',
    symbols: [
      { name: 'health', kind: 'function' },
      { name: 'list_routes', kind: 'function' },
    ],
  },
  {
    id: 'api.repos',
    label: 'app/api/repos.py',
    cluster: 'api',
    file: 'app/api/repos.py',
    symbols: [
      { name: 'add_repo', kind: 'function' },
      { name: 'list_repos', kind: 'function' },
      { name: 'delete_repo', kind: 'function' },
    ],
  },
  {
    id: 'api.deps',
    label: 'app/api/deps.py',
    cluster: 'api',
    file: 'app/api/deps.py',
    symbols: [
      { name: 'get_db', kind: 'function' },
      { name: 'current_user', kind: 'function' },
    ],
  },
  {
    id: 'api.plan',
    label: 'app/api/plan.py',
    cluster: 'api',
    file: 'app/api/plan.py',
    symbols: [
      { name: 'create_plan', kind: 'function' },
      { name: 'get_plan', kind: 'function' },
    ],
  },
  {
    id: 'api.reader',
    label: 'app/api/reader.py',
    cluster: 'api',
    file: 'app/api/reader.py',
    symbols: [{ name: 'get_reader', kind: 'function' }],
  },
  {
    id: 'api.context',
    label: 'app/api/context.py',
    cluster: 'api',
    file: 'app/api/context.py',
    symbols: [
      { name: 'pack_context', kind: 'function' },
      { name: 'run_query', kind: 'function' },
    ],
  },
  {
    id: 'auth.security',
    label: 'app/auth/security.py',
    cluster: 'auth',
    file: 'app/auth/security.py',
    symbols: [
      { name: 'hash_password', kind: 'function' },
      { name: 'verify_password', kind: 'function' },
      { name: 'create_token', kind: 'function' },
    ],
  },
  {
    id: 'auth.service',
    label: 'app/auth/service.py',
    cluster: 'auth',
    file: 'app/auth/service.py',
    symbols: [
      { name: 'signup', kind: 'function' },
      { name: 'login', kind: 'function' },
      { name: 'refresh', kind: 'function' },
    ],
  },
  {
    id: 'auth.tokens',
    label: 'app/auth/tokens.py',
    cluster: 'auth',
    file: 'app/auth/tokens.py',
    symbols: [
      { name: 'encode_token', kind: 'function' },
      { name: 'decode_token', kind: 'function' },
    ],
  },
  {
    id: 'auth.deps',
    label: 'app/auth/deps.py',
    cluster: 'auth',
    file: 'app/auth/deps.py',
    symbols: [{ name: 'rate_limit', kind: 'function' }],
  },
  {
    id: 'models.user',
    label: 'app/models/user.py',
    cluster: 'models',
    file: 'app/models/user.py',
    symbols: [{ name: 'User', kind: 'class' }],
  },
  {
    id: 'models.repo',
    label: 'app/models/repo.py',
    cluster: 'models',
    file: 'app/models/repo.py',
    symbols: [{ name: 'Repo', kind: 'class' }],
  },
  {
    id: 'models.plan',
    label: 'app/models/plan.py',
    cluster: 'models',
    file: 'app/models/plan.py',
    symbols: [
      { name: 'PlanItem', kind: 'class' },
      { name: 'Plan', kind: 'class' },
    ],
  },
  {
    id: 'models.base',
    label: 'app/models/base.py',
    cluster: 'models',
    file: 'app/models/base.py',
    symbols: [
      { name: 'Base', kind: 'class' },
      { name: 'TimestampMixin', kind: 'class' },
    ],
  },
  {
    id: 'services.indexer',
    label: 'app/services/indexer.py',
    cluster: 'services',
    file: 'app/services/indexer.py',
    symbols: [
      { name: 'build_index', kind: 'function' },
      { name: 'parse_ast', kind: 'function' },
    ],
  },
  {
    id: 'services.graph',
    label: 'app/services/graph.py',
    cluster: 'services',
    file: 'app/services/graph.py',
    symbols: [
      { name: 'build_graph', kind: 'function' },
      { name: 'centrality', kind: 'function' },
    ],
  },
  {
    id: 'services.reader',
    label: 'app/services/reader.py',
    cluster: 'services',
    file: 'app/services/reader.py',
    symbols: [{ name: 'reading_order', kind: 'function' }],
  },
  {
    id: 'services.packer',
    label: 'app/services/packer.py',
    cluster: 'services',
    file: 'app/services/packer.py',
    symbols: [
      { name: 'estimate_tokens', kind: 'function' },
      { name: 'pack', kind: 'function' },
      { name: 'tier_symbols', kind: 'function' },
    ],
  },
  {
    id: 'services.planner',
    label: 'app/services/planner.py',
    cluster: 'services',
    file: 'app/services/planner.py',
    symbols: [
      { name: 'load_plan', kind: 'function' },
      { name: 'check_item', kind: 'function' },
      { name: 'verify_plan', kind: 'function' },
    ],
  },
  {
    id: 'services.clone',
    label: 'app/services/clone.py',
    cluster: 'services',
    file: 'app/services/clone.py',
    symbols: [
      { name: 'clone_repo', kind: 'function' },
      { name: 'cache_repo', kind: 'function' },
    ],
  },
  {
    id: 'utils.logging',
    label: 'app/utils/logging.py',
    cluster: 'utils',
    file: 'app/utils/logging.py',
    symbols: [{ name: 'get_logger', kind: 'function' }],
  },
  {
    id: 'utils.text',
    label: 'app/utils/text.py',
    cluster: 'utils',
    file: 'app/utils/text.py',
    symbols: [
      { name: 'slugify', kind: 'function' },
      { name: 'truncate', kind: 'function' },
    ],
  },
  {
    id: 'utils.git',
    label: 'app/utils/git.py',
    cluster: 'utils',
    file: 'app/utils/git.py',
    symbols: [
      { name: 'parse_github_url', kind: 'function' },
      { name: 'is_public', kind: 'function' },
    ],
  },
  {
    id: 'tests.test_api',
    label: 'tests/test_api.py',
    cluster: 'tests',
    file: 'tests/test_api.py',
    symbols: [
      { name: 'test_health', kind: 'function' },
      { name: 'test_add_repo', kind: 'function' },
    ],
  },
  {
    id: 'tests.test_auth',
    label: 'tests/test_auth.py',
    cluster: 'tests',
    file: 'tests/test_auth.py',
    symbols: [
      { name: 'test_login', kind: 'function' },
      { name: 'test_signup', kind: 'function' },
    ],
  },
  {
    id: 'tests.test_indexer',
    label: 'tests/test_indexer.py',
    cluster: 'tests',
    file: 'tests/test_indexer.py',
    symbols: [
      { name: 'test_build_index', kind: 'function' },
      { name: 'test_parse_ast', kind: 'function' },
    ],
  },
  {
    id: 'tests.test_graph',
    label: 'tests/test_graph.py',
    cluster: 'tests',
    file: 'tests/test_graph.py',
    symbols: [{ name: 'test_centrality', kind: 'function' }],
  },
]

/** module-level imports: [from, to] */
const MODULE_IMPORTS: [string, string][] = [
  ['core.main', 'core.config'],
  ['core.main', 'api.routes'],
  ['core.main', 'api.repos'],
  ['core.main', 'api.plan'],
  ['core.main', 'api.reader'],
  ['core.main', 'api.context'],
  ['api.routes', 'core.config'],
  ['api.repos', 'api.deps'],
  ['api.repos', 'models.repo'],
  ['api.repos', 'utils.git'],
  ['api.deps', 'models.user'],
  ['api.plan', 'services.planner'],
  ['api.reader', 'services.reader'],
  ['api.context', 'services.packer'],
  ['api.context', 'services.planner'],
  ['auth.service', 'auth.security'],
  ['auth.service', 'auth.tokens'],
  ['auth.service', 'models.user'],
  ['auth.security', 'core.config'],
  ['auth.deps', 'auth.tokens'],
  ['services.indexer', 'services.graph'],
  ['services.indexer', 'services.clone'],
  ['services.graph', 'utils.text'],
  ['services.packer', 'utils.text'],
  ['services.planner', 'models.plan'],
  ['services.reader', 'services.graph'],
  ['services.clone', 'utils.git'],
  ['models.user', 'models.base'],
  ['models.repo', 'models.base'],
  ['models.plan', 'models.base'],
  ['tests.test_api', 'core.main'],
  ['tests.test_auth', 'auth.service'],
  ['tests.test_indexer', 'services.indexer'],
  ['tests.test_graph', 'services.graph'],
]

/** function/class-level calls: [fromNodeId, toNodeId] using symbol ids */
const SYMBOL_CALLS: [string, string][] = [
  ['sym:core.main:create_app', 'sym:api.routes:health'],
  ['sym:core.config:get_settings', 'sym:core.config:Settings'],
  ['sym:api.repos:add_repo', 'sym:api.deps:current_user'],
  ['sym:api.repos:add_repo', 'sym:utils.git:parse_github_url'],
  ['sym:api.deps:current_user', 'sym:auth.tokens:decode_token'],
  ['sym:auth.service:signup', 'sym:auth.security:hash_password'],
  ['sym:auth.service:login', 'sym:auth.security:verify_password'],
  ['sym:auth.service:login', 'sym:auth.security:create_token'],
  ['sym:services.indexer:build_index', 'sym:services.indexer:parse_ast'],
  ['sym:services.indexer:build_index', 'sym:services.graph:build_graph'],
  ['sym:services.graph:build_graph', 'sym:services.graph:centrality'],
  ['sym:services.reader:reading_order', 'sym:services.graph:centrality'],
  ['sym:services.packer:pack', 'sym:services.packer:tier_symbols'],
  ['sym:services.packer:tier_symbols', 'sym:services.packer:estimate_tokens'],
  ['sym:services.planner:verify_plan', 'sym:services.planner:check_item'],
  ['sym:services.clone:clone_repo', 'sym:utils.git:is_public'],
]

function moduleNodeId(id: string): string {
  return `mod:${id}`
}

function symbolNodeId(moduleId: string, name: string): string {
  return `sym:${moduleId}:${name}`
}

function buildGraph(): Graph {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const degree = new Map<string, number>()

  const bump = (id: string, by = 1) => {
    degree.set(id, (degree.get(id) ?? 0) + by)
  }

  for (const mod of MODULES) {
    const modId = moduleNodeId(mod.id)
    nodes.push({
      id: modId,
      label: mod.label,
      kind: 'module',
      cluster: mod.cluster,
      centrality: 0,
      file: mod.file,
      line: 1,
      isEntry: Boolean(mod.isEntry),
    })
    bump(modId)

    let line = 8
    for (const sym of mod.symbols) {
      const symId = symbolNodeId(mod.id, sym.name)
      nodes.push({
        id: symId,
        label: sym.name,
        kind: sym.kind,
        cluster: mod.cluster,
        centrality: 0,
        file: mod.file,
        line,
        isEntry: false,
      })
      edges.push({ source: modId, target: symId, type: 'call' })
      bump(symId)
      line += 6
    }
  }

  for (const [from, to] of MODULE_IMPORTS) {
    const a = moduleNodeId(from)
    const b = moduleNodeId(to)
    edges.push({ source: a, target: b, type: 'import' })
    bump(a)
    bump(b)
  }

  for (const [from, to] of SYMBOL_CALLS) {
    edges.push({ source: from, target: to, type: 'call' })
    bump(from)
    bump(to)
  }

  const degrees = [...degree.values()]
  const min = Math.min(...degrees)
  const max = Math.max(...degrees)
  const span = max - min || 1

  for (const node of nodes) {
    const d = degree.get(node.id) ?? 0
    // Modules read as structural anchors, so lift their normalized degree.
    const base = (d - min) / span
    node.centrality = node.kind === 'module' ? Math.min(1, base * 0.7 + 0.3) : base
  }

  return { nodes, edges, clusters: CLUSTERS }
}

export const mockGraph: Graph = buildGraph()
