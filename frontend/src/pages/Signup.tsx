import { motion, useAnimationControls } from 'framer-motion'
import { ArrowRight, Check, Loader2, MailCheck, Send } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { PasswordStrength } from '@/components/auth/PasswordStrength'
import { GlowButton } from '@/components/GlowButton'
import { SuccessRipple } from '@/components/GlowRipple'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { resendVerification } from '@/api/auth'
import { describeAuthError } from '@/lib/authErrors'
import { isValidEmail, passwordValid } from '@/lib/validation'

export default function Signup() {
  const { signup } = useAuth()
  const { toast } = useToast()
  const controls = useAnimationControls()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    confirm?: string
  }>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  function validate(): boolean {
    const next: typeof errors = {}
    if (!email.trim()) next.email = 'Email is required'
    else if (!isValidEmail(email)) next.email = 'Enter a valid email address'
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
    if (!validate()) {
      void controls.start({ x: [0, -8, 8, -6, 6, 0] })
      return
    }
    setSubmitting(true)
    try {
      const message = await signup(email.trim(), password)
      setSuccess(true)
      toast({ title: 'Account created', description: 'Check your email to verify.', variant: 'success' })
      window.setTimeout(() => setDone(message), 700)
    } catch (error) {
      setFormError(describeAuthError(error).message)
      setSubmitting(false)
      void controls.start({ x: [0, -8, 8, -6, 6, 0] })
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await resendVerification({ email: email.trim() })
      toast({ title: 'Verification email sent', variant: 'info' })
    } catch {
      toast({ title: 'Could not resend right now', variant: 'error' })
    } finally {
      setResending(false)
    }
  }

  if (done) {
    return (
      <AuthSplitLayout
        title="Check your email"
        subtitle="One more step before you can log in."
        footer={
          <Link to="/login" className="font-medium text-brand hover:underline">
            Back to log in
          </Link>
        }
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="relative grid size-12 place-items-center rounded-full bg-status-done/15 text-status-done glow-sm">
            <MailCheck className="size-6" />
            <SuccessRipple show className="rounded-full" />
          </div>
          <Alert variant="success">
            <MailCheck />
            <AlertDescription>{done}</AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to{' '}
            <span className="font-medium text-foreground">{email}</span>. Open
            the link in that email to verify your account.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Resend verification email
            </Button>
            <Button asChild variant="ghost">
              <Link
                to={`/verify-email?email=${encodeURIComponent(email.trim())}`}
              >
                Paste a token instead
              </Link>
            </Button>
          </div>
        </motion.div>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout
      title="Create your account"
      subtitle="Understand any Python repo. Every claim cites real code."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <motion.form
        animate={controls}
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        <FloatingInput
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() =>
            setErrors((prev) => ({
              ...prev,
              email: email && !isValidEmail(email) ? 'Enter a valid email address' : undefined,
            }))
          }
          error={errors.email}
          disabled={submitting}
        />
        <div className="space-y-2">
          <FloatingInput
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={submitting}
          />
          <PasswordStrength value={password} />
        </div>
        <FloatingInput
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() =>
            setErrors((prev) => ({
              ...prev,
              confirm: confirm !== password ? 'Passwords do not match' : undefined,
            }))
          }
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
            disabled={submitting || success}
          >
            {success ? (
              <>
                <Check className="size-4" />
                Account created
              </>
            ) : submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="size-4" />
              </>
            )}
          </GlowButton>
          <SuccessRipple show={success} />
        </div>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Check className="size-3.5 text-status-done" />
          We’ll email you a link to verify your account.
        </p>
      </motion.form>
    </AuthSplitLayout>
  )
}
