import { ArrowRight, Check, KeyRound, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { resetPassword } from '@/api/auth'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { PasswordStrength } from '@/components/auth/PasswordStrength'
import { GlowButton } from '@/components/GlowButton'
import { SuccessRipple } from '@/components/GlowRipple'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { describeAuthError } from '@/lib/authErrors'
import { passwordValid } from '@/lib/validation'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{
    token?: string
    password?: string
    confirm?: string
  }>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  function validate(): boolean {
    const next: typeof errors = {}
    if (!token.trim()) next.token = 'Paste the token from your email'
    if (!password) next.password = 'Password is required'
    else if (!passwordValid(password)) {
      next.password = 'Use 8+ characters with at least one letter and one number'
    }
    if (confirm !== password) next.confirm = 'Passwords do not match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFormError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      const response = await resetPassword({
        token: token.trim(),
        new_password: password,
      })
      setDone(response.message)
    } catch (cause) {
      setFormError(
        describeAuthError(cause, 'This reset link is invalid or expired.')
          .message,
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthSplitLayout
        title="Password updated"
        subtitle="You can now log in with your new password."
        footer={
          <Link to="/login" className="font-medium text-brand hover:underline">
            Back to log in
          </Link>
        }
      >
        <div className="relative grid size-12 place-items-center rounded-full bg-status-done/15 text-status-done glow-sm">
          <Check className="size-6" />
          <SuccessRipple show className="rounded-full" />
        </div>
        <Alert variant="success" className="mt-5">
          <Check />
          <AlertDescription>{done}</AlertDescription>
        </Alert>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout
      title="Choose a new password"
      subtitle="Paste the reset token and pick a strong password."
      footer={
        <>
          Need a new link?{' '}
          <Link to="/forgot-password" className="font-medium text-brand hover:underline">
            Request another
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FloatingInput
          label="Reset token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          error={errors.token}
          hint="The token is the part after ?token= in the emailed link."
          disabled={submitting}
        />
        <div className="space-y-2">
          <FloatingInput
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            disabled={submitting}
          />
          <PasswordStrength value={password} />
        </div>
        <FloatingInput
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={errors.confirm}
          disabled={submitting}
        />

        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="relative">
          <GlowButton
            type="submit"
            variant="brand"
            size="lg"
            className="w-full"
            magnetic={false}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <KeyRound className="size-4" />
                Set new password
                <ArrowRight className="size-4" />
              </>
            )}
          </GlowButton>
        </div>
      </form>
    </AuthSplitLayout>
  )
}
