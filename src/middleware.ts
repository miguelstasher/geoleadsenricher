import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - require authentication
  const protectedRoutes = ['/', '/leads', '/campaigns', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route) && 
    request.nextUrl.pathname !== '/login' && 
    request.nextUrl.pathname !== '/signup'
  )
  
  // Allow specific API routes for background processing
  const allowedApiRoutes = [
    '/api/scrape-google-maps',
    '/api/extraction-direct',
    '/api/progress',
    '/api/enrich-leads',
    '/api/enrich-leads-enhanced',
    '/api/social-enhanced',
    '/api/campaigns/sync',
    '/api/campaigns/upload-enhanced',
    '/api/test-connection',
    '/api/test-api',
    '/api/system-diagnostics',
    '/api/delete-stuck-searches',
    '/api/manual-fix-status',
    '/api/retry-stuck-search',
    '/api/fix-stuck-searches',
    '/api/users'
  ]
  
  const isAllowedApiRoute = allowedApiRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirect to login if accessing protected route without auth
  // But allow background processing APIs to work without auth
  if (isProtectedRoute && !user && !isAllowedApiRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect to home if accessing auth pages while logged in
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login, signup (auth pages)
     */
    '/((?!_next/static|_next/image|favicon.ico|login|signup|api/auth).*)',
  ],
}
