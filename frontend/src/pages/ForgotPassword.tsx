import { ArrowRight, Check, Loader2, MailCheck, Send } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { forgotPassword } from '@/api/auth'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { GlowButton } from '@/components/GlowButton'
import { SuccessRipple } from '@/components/GlowRipple'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { describeAuthError } from '@/lib/authErrors'
import { isValidEmail } from '@/lib/validation'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFieldError('')
    setFormError('')
    if (!isValidEmail(email)) {
      setFieldError('Enter a valid email address')
      return
    }
    setSubmitting(true)
    try {
      // The backend always returns the same message, so accounts cannot be guessed.
      const response = await forgotPassword({ email: email.trim() })
      setMessage(response.message)
    } catch (cause) {
      setFormError(
        describeAuthError(cause, 'Could not send the reset link right now.')
          .message,
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (message) {
    return (
      <AuthSplitLayout
        title="Check your email"
        subtitle="If the account exists, a reset link is on its way."
        footer={
          <Link to="/login" className="font-medium text-brand hover:underline">
            Back to log in
          </Link>
        }
      >
        <div className="relative grid size-12 place-items-center rounded-full bg-status-done/15 text-status-done glow-sm">
          <MailCheck className="size-6" />
          <SuccessRipple show className="rounded-full" />
        </div>
        <Alert variant="success" className="mt-5">
          <Check />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <p className="mt-4 text-sm text-muted-foreground">
          The link expires shortly and can only be used once.
        </p>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout
      title="Forgot your password?"
      subtitle="Enter your email and we’ll send a reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FloatingInput
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldError}
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
                Sending link…
              </>
            ) : (
              <>
                <Send className="size-4" />
                Send reset link
                <ArrowRight className="size-4" />
              </>
            )}
          </GlowButton>
        </div>
      </form>
    </AuthSplitLayout>
  )
}
