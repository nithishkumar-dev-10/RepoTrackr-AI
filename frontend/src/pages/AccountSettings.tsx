import { KeyRound, Loader2, MailCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { changePassword, deleteAccount } from '@/api/auth'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { PasswordStrength } from '@/components/auth/PasswordStrength'
import { PageTransition } from '@/components/PageTransition'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { describeAuthError } from '@/lib/authErrors'
import { passwordValid } from '@/lib/validation'

export default function AccountSettings() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{
    current?: string
    password?: string
    confirm?: string
  }>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setFormError('')
    const next: typeof errors = {}
    if (!current) next.current = 'Current password is required'
    if (!password) next.password = 'New password is required'
    else if (!passwordValid(password)) {
      next.password = 'Use 8+ characters with at least one letter and one number'
    }
    if (confirm !== password) next.confirm = 'Passwords do not match'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      const response = await changePassword({
        current_password: current,
        new_password: password,
      })
      setCurrent('')
      setPassword('')
      setConfirm('')
      toast({
        title: 'Password changed',
        description: response.message,
        variant: 'success',
      })
    } catch (cause) {
      setFormError(
        describeAuthError(cause, 'Could not change your password.').message,
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(event: FormEvent) {
    event.preventDefault()
    if (deleting) return
    setDeleteError('')
    if (confirmEmail.trim() !== user?.email) {
      setDeleteError(`Type ${user?.email ?? 'your email'} to confirm`)
      return
    }
    setDeleting(true)
    try {
      await deleteAccount()
      await logout()
      toast({ title: 'Account deleted', variant: 'info' })
      navigate('/login', { replace: true })
    } catch (cause) {
      setDeleteError(
        describeAuthError(cause, 'Could not delete your account.').message,
      )
      setDeleting(false)
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Account settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile, password and account.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>The account you are signed in with.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium text-foreground">{user?.email ?? '—'}</p>
            <span
              className={
                user?.is_verified
                  ? 'inline-flex items-center gap-1 text-status-done'
                  : 'inline-flex items-center gap-1 text-status-partial'
              }
            >
              <MailCheck className="size-3.5" />
              {user?.is_verified ? 'Email verified' : 'Email not verified'}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Use 8 or more characters with at least one letter and one number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} noValidate className="space-y-4">
              <FloatingInput
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                error={errors.current}
                disabled={saving}
              />
              <div className="space-y-2">
                <FloatingInput
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  error={errors.password}
                  disabled={saving}
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
                disabled={saving}
              />
              {formError ? (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" variant="brand" disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Delete account</CardTitle>
            <CardDescription>
              This permanently removes your account and saved repositories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDelete} noValidate className="space-y-4">
              <FloatingInput
                label={`Type ${user?.email ?? 'your email'} to confirm`}
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
                error={deleteError}
                disabled={deleting}
              />
              <Button type="submit" variant="destructive" disabled={deleting}>
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete my account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
