import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getDashboardPath } from '@/lib/routes'

function redirectWithCookies(url: URL, supabaseResponse: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  return redirectResponse
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes — always allowed (even when not authenticated)
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/email-confirmed', '/visit', '/auth/callback']
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )

  // Landing page "/" is public for unauthenticated users
  if (pathname === '/' && !user) {
    return supabaseResponse
  }

  // Authenticated user on landing page → redirect to their dashboard
  if (pathname === '/' && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return redirectWithCookies(
      new URL(getDashboardPath(profile?.role ?? ''), request.url),
      supabaseResponse
    )
  }

  if (isPublicRoute) {
    return supabaseResponse
  }

  // Not authenticated — redirect to landing
  if (!user) {
    return redirectWithCookies(new URL('/', request.url), supabaseResponse)
  }

  // Fetch profile to check role + status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return redirectWithCookies(new URL('/', request.url), supabaseResponse)
  }

  const { role, status } = profile

  // Homeowner status checks
  if (role === 'homeowner' && status === 'pending') {
    const url = new URL('/login', request.url)
    url.searchParams.set('message', 'awaiting_approval')
    return redirectWithCookies(url, supabaseResponse)
  }

  if (role === 'homeowner' && status === 'rejected') {
    const url = new URL('/login', request.url)
    url.searchParams.set('message', 'rejected')
    return redirectWithCookies(url, supabaseResponse)
  }

  // Role-based route protection
  const adminRoutes = pathname.startsWith('/admin')
  const guardRoutes = pathname.startsWith('/guard')
  const homeownerRoutes = pathname.startsWith('/homeowner')

  if (adminRoutes && role !== 'admin') {
    return redirectWithCookies(new URL(getDashboardPath(role), request.url), supabaseResponse)
  }

  if (guardRoutes && role !== 'guard') {
    return redirectWithCookies(new URL(getDashboardPath(role), request.url), supabaseResponse)
  }

  if (homeownerRoutes && role !== 'homeowner') {
    return redirectWithCookies(new URL(getDashboardPath(role), request.url), supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
