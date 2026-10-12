import { motion, useAnimationControls } from 'framer-motion'
import { ArrowRight, Check, Loader2, MailWarning } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { GlowButton } from '@/components/GlowButton'
import { SuccessRipple } from '@/components/GlowRipple'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { describeAuthError } from '@/lib/authErrors'
import { isValidEmail } from '@/lib/validation'

interface LocationState {
  from?: string
}

export default function Login() {
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const controls = useAnimationControls()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  function validate(): boolean {
    const next: typeof errors = {}
    if (!email.trim()) next.email = 'Email is required'
    else if (!isValidEmail(email)) next.email = 'Enter a valid email address'
    if (!password) next.password = 'Password is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFormError('')
    setUnverified(false)
    if (!validate()) {
      void controls.start({ x: [0, -8, 8, -6, 6, 0] })
      return
    }
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      setSuccess(true)
      toast({ title: 'Welcome back', variant: 'success' })
      const from = (location.state as LocationState | null)?.from
      window.setTimeout(() => navigate(from ?? '/dashboard', { replace: true }), 550)
    } catch (error) {
      const info = describeAuthError(error)
      setFormError(info.message)
      setUnverified(info.unverified)
      setSubmitting(false)
      void controls.start({ x: [0, -8, 8, -6, 6, 0] })
    }
  }

  return (
    <AuthSplitLayout
      title="Log in"
      subtitle="Welcome back. Pick up where you left off."
      footer={
        <>
          New to RepoTrackr?{' '}
          <Link to="/signup" className="font-medium text-brand hover:underline">
            Create an account
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
          disabled={submitting || success}
        />
        <FloatingInput
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={submitting || success}
        />

        {formError ? (
          <Alert variant={unverified ? 'warning' : 'destructive'}>
            <MailWarning />
            <AlertDescription>
              {formError}
              {unverified ? (
                <>
                  {' '}
                  <Link
                    to={`/verify-email?email=${encodeURIComponent(email.trim())}`}
                    className="font-medium underline"
                  >
                    Go to verification
                  </Link>
                </>
              ) : null}
            </AlertDescription>
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
                Logged in
              </>
            ) : submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Logging in…
              </>
            ) : (
              <>
                Log in
                <ArrowRight className="size-4" />
              </>
            )}
          </GlowButton>
          <SuccessRipple show={success} />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Can’t log in?{' '}
          <Link to="/verify-email" className="text-brand hover:underline">
            Verify your email
          </Link>
        </p>
      </motion.form>
    </AuthSplitLayout>
  )
}
