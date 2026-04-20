import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Check rate limit
    const limit = checkRateLimit(email)
    if (!limit.allowed) {
      const minutesLeft = limit.lockedUntilMs
        ? Math.ceil((limit.lockedUntilMs - Date.now()) / 60000)
        : 15
      return NextResponse.json({
        error: 'TOO_MANY_ATTEMPTS',
        message: `Too many failed attempts. Please try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
        lockedUntil: limit.lockedUntilMs,
      }, { status: 429 })
    }

    // Attempt sign in using admin client to verify credentials
    const supabase = createAdminClient()

    // List users by email to check if account exists
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      recordFailedAttempt(email)
      const remaining = limit.remainingAttempts - 1
      return NextResponse.json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        remainingAttempts: remaining,
      }, { status: 401 })
    }

    // Verify password by attempting sign in via Supabase auth
    // We return success/fail — the actual session is created client-side
    // This route only handles rate limiting
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      recordFailedAttempt(email)
      const remaining = limit.remainingAttempts - 1
      return NextResponse.json({
        error: 'INVALID_CREDENTIALS',
        message: remaining <= 2
          ? `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Invalid email or password.',
        remainingAttempts: remaining,
      }, { status: 401 })
    }

    // Success — clear attempts
    clearAttempts(email)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[login] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
