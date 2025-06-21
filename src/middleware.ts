import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not defined in environment variables');
}

// Fallback secret for development only - should be configured properly in production
const SECRET = JWT_SECRET || 'development_fallback_not_for_production';

// Create a TextEncoder for the secret
const secretKey = new TextEncoder().encode(SECRET);

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

export async function middleware(request: NextRequest) {
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
        await jose.jwtVerify(token, secretKey);
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
      console.log('[middleware] Attempting to verify token:', token.substring(0, 10) + '...');
      
      // Verify token
      await jose.jwtVerify(token, secretKey);
      console.log('[middleware] Token successfully verified');
      return NextResponse.next();
    } catch (err) {
      const error = err as Error;
      console.log('[middleware] Invalid token for API route. Error:', error.message);
      console.log('[middleware] Error name:', error.name);
      console.log('[middleware] Full error:', error);
      
      return new NextResponse(
        JSON.stringify({ error: 'Invalid token', details: error.message }),
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