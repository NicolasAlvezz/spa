import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
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

  // Refresh session — must not use supabase between here and return
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const role = (user?.app_metadata?.role ?? null) as 'admin' | 'client' | null

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/admin/login', '/setup']
  if (!user && !publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin-only routes (excluding /admin/login which is public)
  const isAdminRoute =
    (pathname.startsWith('/admin') && pathname !== '/admin/login') ||
    pathname.startsWith('/scan')

  if (isAdminRoute && role !== 'admin') {
    if (!user) return NextResponse.redirect(new URL('/admin/login', request.url))
    // role='client' → their area; unknown role → login (prevents /my-qr ↔ /admin loop)
    return NextResponse.redirect(
      new URL(role === 'client' ? '/my-qr' : '/login?error=no_role', request.url)
    )
  }

  // Client-only routes — covers all pages in the (client) route group
  const isClientRoute =
    pathname.startsWith('/my-qr') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/visits')

  if (isClientRoute && role !== 'client') {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    // role='admin' → their area; unknown role → login (prevents loop)
    return NextResponse.redirect(
      new URL(role === 'admin' ? '/admin' : '/login?error=no_role', request.url)
    )
  }

  // Block admins from hitting /onboarding (they have no client record to fill in)
  if (pathname.startsWith('/onboarding') && role === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Redirect authenticated users away from login pages
  if (user && (pathname === '/login' || pathname === '/admin/login')) {
    const destination = role === 'admin' ? '/admin' : '/my-qr'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  return supabaseResponse
}
