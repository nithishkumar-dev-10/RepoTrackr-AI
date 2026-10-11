import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/Logo'
import { NodeNetwork } from '@/components/auth/NodeNetwork'
import { PageTransition } from '@/components/PageTransition'

export function AuthSplitLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <PageTransition>
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col justify-center px-5 py-12 sm:px-10">
          <div className="mx-auto w-full max-w-sm">
            <Link to="/" className="inline-block">
              <Logo />
            </Link>
            <h1 className="mt-8 text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {footer ? (
              <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
            ) : null}
          </div>
        </div>

        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E2A78] via-[#3B5BFF] to-[#8B5CF6]" />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(700px circle at 70% 20%, rgba(255,255,255,0.35), transparent 60%)',
            }}
          />
          <div className="relative flex h-full flex-col p-12">
            <div className="flex-1">
              <NodeNetwork />
            </div>
            <div className="text-white/90">
              <p className="max-w-sm text-lg font-medium leading-snug">
                Static analysis decides what is true. AI only retrieves and
                explains.
              </p>
              <p className="mt-3 font-mono text-xs text-white/70">
                Every claim cites real code (file:line).
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
