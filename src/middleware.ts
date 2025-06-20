import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not defined in environment variables');
}

// Fallback secret for development only - should be configured properly in production
const SECRET = JWT_SECRET || 'development_fallback_not_for_production';

// List of public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/_next',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/session',
  '/api/auth/logout'
];

export function middleware(request: NextRequest) {
  // Check if the requested path is public
  const path = request.nextUrl.pathname;
  
  // Debugging
  console.log('[middleware] Processing request for path:', path);
  const token = request.cookies.get('auth_token')?.value;
  console.log('[middleware] Auth token present:', !!token);
  
  if (publicRoutes.some(route => path.startsWith(route))) {
    console.log('[middleware] Public route, allowing access');
    return NextResponse.next();
  }
  
  // Special case for homepage
  if (path === '/') {
    console.log('[middleware] Homepage request');
    if (token) {
      try {
        // Verify token
        jwt.verify(token, SECRET);
        console.log('[middleware] Valid token found, redirecting to dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch (err) {
        console.log('[middleware] Invalid token:', err);
      }
    }
    return NextResponse.next();
  }
  
  // For API routes (except auth), check for authentication
  if (path.startsWith('/api') && !path.startsWith('/api/auth')) {
    console.log('[middleware] Protected API route');
    
    if (!token) {
      console.log('[middleware] No token found for API route');
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    try {
      // Verify token
      jwt.verify(token, SECRET);
      console.log('[middleware] Valid token for API route');
      return NextResponse.next();
    } catch (err) {
      console.log('[middleware] Invalid token for API route:', err);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  // For regular routes, check authentication and redirect if needed
  console.log('[middleware] Regular route check');
  
  if (!token) {
    console.log('[middleware] No token found, redirecting to login');
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', encodeURI(request.nextUrl.pathname));
    return NextResponse.redirect(url);
  }
  
  // NOTE: Avoid heavy JWT verification in Edge Middleware.
  // Just check that the cookie is present; actual validation happens in API routes.
  console.log('[middleware] Token present for regular route, proceeding');
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}; 