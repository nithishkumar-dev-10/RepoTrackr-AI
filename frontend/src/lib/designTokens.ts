/**
 * Canonical RepoTrackr AI color tokens.
 *
 * CSS cannot import TypeScript, so every light-surface value here is mirrored
 * as a custom property in `src/index.css` (`:root`). Keep the two in sync; the
 * README points to this pair as the single design-token source.
 *
 * `graph` colors are the bright variants used on the dark canvas (SVG fills and
 * WebGL materials). `ink` colors are the WCAG-AA variants used as text on the
 * light app shell, and `tint` is their matching soft surface.
 */

export const hues = {
  brand: { graph: '#60A5FA', ink: '#3B5BFF', tint: '#EEF1FF' },
  teal: { graph: '#22D3EE', ink: '#0F766E', tint: '#E6F7F4' },
  violet: { graph: '#A78BFA', ink: '#6D28D9', tint: '#F3EDFF' },
  amber: { graph: '#FBBF24', ink: '#B45309', tint: '#FFF6E8' },
  rose: { graph: '#FB7185', ink: '#BE123C', tint: '#FFF0F3' },
  emerald: { graph: '#34D399', ink: '#047857', tint: '#EAF8F1' },
  slate: { graph: '#94A3B8', ink: '#475569', tint: '#EEF2F7' },
} as const

export type HueName = keyof typeof hues
export type Accent = Exclude<HueName, 'slate'>

export const ACCENTS: readonly Accent[] = [
  'brand',
  'teal',
  'violet',
  'amber',
  'rose',
  'emerald',
] as const

/** Semantic statuses share the same hue families as the graph node types. */
export const STATUS_HUE = {
  done: 'emerald',
  partial: 'amber',
  missing: 'rose',
  unknown: 'slate',
} as const satisfies Record<string, HueName>

export type StatusKey = keyof typeof STATUS_HUE

/** AA-safe text colors for statuses (≥4.5:1 on the #f6f7fb app background). */
export const STATUS_COLOR: Record<StatusKey, string> = {
  done: hues.emerald.ink,
  partial: hues.amber.ink,
  missing: hues.rose.ink,
  unknown: hues.slate.ink,
}
