// Simple in-memory rate limiter for login brute force protection
// Tracks failed attempts per email and locks out after max attempts

interface AttemptRecord {
  count: number
  firstAttempt: number
  lockedUntil: number | null
}

const attempts = new Map<string, AttemptRecord>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes lockout

export function checkRateLimit(email: string): { allowed: boolean; remainingAttempts: number; lockedUntilMs: number | null } {
  const key = email.toLowerCase().trim()
  const now = Date.now()
  const record = attempts.get(key)

  // No record — first attempt
  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockedUntilMs: null }
  }

  // Check if locked
  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, remainingAttempts: 0, lockedUntilMs: record.lockedUntil }
  }

  // Reset if window expired or lockout expired
  if (now - record.firstAttempt > WINDOW_MS || (record.lockedUntil && now >= record.lockedUntil)) {
    attempts.delete(key)
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockedUntilMs: null }
  }

  // Check if max attempts reached
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS
    return { allowed: false, remainingAttempts: 0, lockedUntilMs: record.lockedUntil }
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.count, lockedUntilMs: null }
}

export function recordFailedAttempt(email: string): void {
  const key = email.toLowerCase().trim()
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now, lockedUntil: null })
    return
  }

  record.count++

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS
  }
}

export function clearAttempts(email: string): void {
  attempts.delete(email.toLowerCase().trim())
}
