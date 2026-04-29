import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - api/ routes (each handler does its own auth check via createClient())
     * - favicon.ico and static image files
     *
     * Excluding api/ avoids an extra supabase.auth.getUser() call per API
     * request and ensures unauthenticated API hits receive a JSON 401
     * rather than an HTML redirect to /login.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
