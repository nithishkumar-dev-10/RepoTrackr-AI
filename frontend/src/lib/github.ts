export interface GithubRepoRef {
  owner: string
  name: string
  /** Normalized https://github.com/owner/name URL. */
  url: string
}

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const NAME_RE = /^[A-Za-z0-9._-]+$/

/**
 * Client-side mirror of backend parse_github_url (app/schemas/repo.py).
 * Accepts github.com/owner/name with optional scheme and .git suffix.
 */
export function parseGithubUrl(input: string): GithubRepoRef | null {
  const raw = input.trim()
  if (!raw) return null
  const candidate = raw.includes('://') ? raw : `https://${raw}`

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  let host = url.hostname.toLowerCase()
  if (host.startsWith('www.')) host = host.slice(4)
  if (host !== 'github.com') return null

  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length !== 2) return null

  let [owner, name] = parts
  if (name.endsWith('.git')) name = name.slice(0, -4)
  if (!OWNER_RE.test(owner) || !NAME_RE.test(name)) return null

  const cleanOwner = owner.toLowerCase()
  const cleanName = name.toLowerCase()
  return {
    owner: cleanOwner,
    name: cleanName,
    url: `https://github.com/${cleanOwner}/${cleanName}`,
  }
}
