import type { PlanItemStatus } from '@/types'

/** Shared color + label for plan verification statuses (3D, 2D, panel, ring). */
export const PLAN_STATUS_META: Record<
  PlanItemStatus,
  { label: string; color: string }
> = {
  done: { label: 'Done', color: '#16A34A' },
  partial: { label: 'Partial', color: '#F59E0B' },
  missing: { label: 'Missing', color: '#DC2626' },
  unknown: { label: 'Unknown', color: '#64748B' },
}
