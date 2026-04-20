import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

async function handleAuthenticatedUser(
  user: { id: string; email_confirmed_at?: string | null },
  origin: string,
  searchParams: URLSearchParams
) {
  const type = searchParams.get('type')

  // Check if this is a password recovery
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  // Check if the user just confirmed their email
  if (user.email_confirmed_at) {
    const admin = createAdminClient()
    await admin
      .from('profiles')
      .update({ email_confirmed: true })
      .eq('id', user.id)

    const { data: profile } = await admin
      .from('profiles')
      .select('role, email_confirmed')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'homeowner') {
      return NextResponse.redirect(`${origin}/email-confirmed`)
    }
  }

  // Default: redirect to next or login
  const next = searchParams.get('next') ?? '/login'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/login'
  return NextResponse.redirect(`${origin}${safeNext}`)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as
    | 'signup'
    | 'recovery'
    | 'invite'
    | 'magiclink'
    | 'email'
    | null

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // PKCE flow: exchange authorization code for session
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      return handleAuthenticatedUser(data.user, origin, searchParams)
    }

    console.error('Code exchange failed:', error?.message, { code: code?.slice(0, 8) + '...' })
  }

  // Token hash flow: verify OTP (fallback when PKCE cookies are missing,
  // e.g. user opens confirmation email in a different browser/device)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error && data.user) {
      return handleAuthenticatedUser(data.user, origin, searchParams)
    }

    console.error('OTP verification failed:', error?.message, { type, token_hash: token_hash?.slice(0, 8) + '...' })
  }

  if (!code && !token_hash) {
    console.error('Auth callback called with no code or token_hash. Params:', Object.fromEntries(searchParams.entries()))
  }

  return NextResponse.redirect(`${origin}/login?message=auth_error`)
}
