export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export interface PasswordChecks {
  length: boolean
  letter: boolean
  digit: boolean
}

/** Mirrors the backend rules in app/schemas/auth.py (8 chars, 1 letter, 1 digit). */
export function passwordChecks(value: string): PasswordChecks {
  return {
    length: value.length >= 8,
    letter: /[A-Za-z]/.test(value),
    digit: /\d/.test(value),
  }
}

export function passwordValid(value: string): boolean {
  const checks = passwordChecks(value)
  return checks.length && checks.letter && checks.digit
}

/** 0..4 strength score for the meter (backend minimum alone scores 2). */
export function passwordScore(value: string): number {
  if (!value) return 0
  const checks = passwordChecks(value)
  let score = 0
  if (checks.length) score += 1
  if (checks.letter) score += 1
  if (checks.digit) score += 1
  if (value.length >= 12 && /[^A-Za-z0-9]/.test(value)) score += 1
  return Math.min(score, 4)
}
