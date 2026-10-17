import { MagneticButton } from '@/components/MagneticButton'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Primary action with the shared glow language: colored shadow, a light sweep
 * on hover and an optional magnetic pull (both disabled by reduced-motion).
 */
export function GlowButton({
  children,
  className,
  magnetic = true,
  shimmer = true,
  strength = 0.25,
  ...props
}: ButtonProps & {
  magnetic?: boolean
  shimmer?: boolean
  strength?: number
}) {
  const button = (
    <Button
      {...props}
      className={cn(
        'relative overflow-hidden glow-md hover:glow-lg',
        shimmer && 'shimmer',
        className,
      )}
    >
      {children}
    </Button>
  )

  if (!magnetic) return button

  return (
    <MagneticButton strength={strength} className="inline-flex">
      {button}
    </MagneticButton>
  )
}
