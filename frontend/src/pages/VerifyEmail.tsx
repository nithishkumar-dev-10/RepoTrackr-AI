import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, MailCheck, Send, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { resendVerification, verifyEmail } from '@/api/auth'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { SuccessRipple } from '@/components/GlowRipple'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'
import { describeAuthError } from '@/lib/authErrors'
import { isValidEmail } from '@/lib/validation'

type Status = 'idle' | 'verifying' | 'success' | 'error'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const { toast } = useToast()
  const tokenParam = params.get('token') ?? ''
  const emailParam = params.get('email') ?? ''

  const [status, setStatus] = useState<Status>(tokenParam ? 'verifying' : 'idle')
  const [message, setMessage] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [manualError, setManualError] = useState('')
  const [resendEmail, setResendEmail] = useState(emailParam)
  const [resendError, setResendError] = useState('')
  const [resending, setResending] = useState(false)
  const ranToken = useRef<string | null>(null)

  const verify = useCallback(
    async (token: string) => {
      const value = token.trim()
      if (!value) {
        setManualError('Paste the token from your email')
        setStatus('idle')
        return
      }
      setStatus('verifying')
      setMessage('')
      try {
        const res = await verifyEmail({ token: value })
        setMessage(res.message)
        setStatus('success')
        toast({ title: 'Email verified', variant: 'success' })
      } catch (error) {
        setMessage(describeAuthError(error, 'This verification link is invalid or expired.').message)
        setStatus('error')
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!tokenParam) return
    if (ranToken.current === tokenParam) return
    ranToken.current = tokenParam
    void verify(tokenParam)
  }, [tokenParam, verify])

  async function handleManualSubmit(event: FormEvent) {
    event.preventDefault()
    setManualError('')
    if (!manualToken.trim()) {
      setManualError('Paste the token from your email')
      return
    }
    await verify(manualToken)
  }

  async function handleResend(event: FormEvent) {
    event.preventDefault()
    setResendError('')
    if (!isValidEmail(resendEmail)) {
      setResendError('Enter a valid email address')
      return
    }
    setResending(true)
    try {
      const res = await resendVerification({ email: resendEmail.trim() })
      toast({ title: 'Verification email sent', description: res.message, variant: 'info' })
    } catch (error) {
      setResendError(describeAuthError(error, 'Could not resend right now.').message)
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthSplitLayout
      title="Verify your email"
      subtitle="Open the link from your inbox, or paste the token below."
      footer={
        <Link to="/login" className="font-medium text-brand hover:underline">
          Back to log in
        </Link>
      }
    >
      {status === 'success' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="relative inline-grid">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className="grid size-14 place-items-center rounded-full bg-status-done/15 text-status-done glow-sm"
            >
              <CheckCircle2 className="size-7" />
            </motion.div>
            <SuccessRipple show className="rounded-full" />
          </div>
          <Alert variant="success">
            <CheckCircle2 />
            <AlertDescription>{message || 'Email verified. You can now log in.'}</AlertDescription>
          </Alert>
          <Button asChild variant="brand" size="lg" className="w-full">
            <Link to="/login">Continue to log in</Link>
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {status === 'verifying' ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
              <Loader2 className="size-5 animate-spin text-brand" />
              <span className="text-sm text-muted-foreground">
                Verifying your token…
              </span>
            </div>
          ) : null}

          {status === 'error' ? (
            <Alert variant="destructive">
              <XCircle />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleManualSubmit} className="space-y-3">
            <FloatingInput
              label="Verification token"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              error={manualError}
              hint="Tip: the token is the part after ?token= in the link we emailed."
              disabled={status === 'verifying'}
            />
            <Button
              type="submit"
              variant="brand"
              className="w-full"
              disabled={status === 'verifying'}
            >
              {status === 'verifying' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MailCheck className="size-4" />
              )}
              Verify token
            </Button>
          </form>

          <div className="relative text-center">
            <span className="relative z-10 bg-background px-2 text-xs uppercase tracking-wide text-muted-foreground">
              or
            </span>
            <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
          </div>

          <form onSubmit={handleResend} className="space-y-3">
            <FloatingInput
              label="Email"
              type="email"
              autoComplete="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              error={resendError}
              disabled={resending}
            />
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={resending}
            >
              {resending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Resend verification email
            </Button>
          </form>
        </div>
      )}
    </AuthSplitLayout>
  )
}
