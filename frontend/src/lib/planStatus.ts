import { STATUS_COLOR } from '@/lib/designTokens'
import type { PlanItemStatus } from '@/types'

/** Shared color + label for plan verification statuses (3D, 2D, panel, ring). */
export const PLAN_STATUS_META: Record<
  PlanItemStatus,
  { label: string; color: string }
> = {
  done: { label: 'Done', color: STATUS_COLOR.done },
  partial: { label: 'Partial', color: STATUS_COLOR.partial },
  missing: { label: 'Missing', color: STATUS_COLOR.missing },
  unknown: { label: 'Unknown', color: STATUS_COLOR.unknown },
}
