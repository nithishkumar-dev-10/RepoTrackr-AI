import { Eye, EyeOff } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useId, useState } from 'react'

import { cn } from '@/lib/utils'

interface FloatingInputProps extends Omit<ComponentProps<'input'>, 'placeholder'> {
  label: string
  error?: string
  hint?: string
}

export function FloatingInput({
  label,
  error,
  hint,
  type = 'text',
  id,
  className,
  ...props
}: FloatingInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [reveal, setReveal] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword && reveal ? 'text' : type

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          id={inputId}
          type={resolvedType}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          className={cn(
            'peer h-12 w-full rounded-xl border bg-surface px-3.5 pb-1 pt-5 text-sm text-foreground transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring/60',
            isPassword && 'pr-11',
            error
              ? 'border-destructive focus:ring-destructive/40'
              : 'border-input focus:border-brand',
            className,
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'pointer-events-none absolute left-3.5 top-3.5 origin-left text-sm text-muted-foreground transition-all duration-150',
            'peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-brand',
            'peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs',
            error && 'text-destructive peer-focus:text-destructive',
          )}
        >
          {label}
        </label>
        {isPassword ? (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={reveal ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {reveal ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
