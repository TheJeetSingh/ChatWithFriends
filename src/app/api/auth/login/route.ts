import { NextRequest, NextResponse } from 'next/server';
import { validateUser } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

// Get JWT Secret from environment variable with fallback for development
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not defined in environment variables');
}
const SECRET = JWT_SECRET || 'development_fallback_not_for_production';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { email, password } = await request.json();
    
    // Check if email and password are provided
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' }, 
        { status: 400 }
      );
    }
    
    // Validate user
    const user = await validateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' }, 
        { status: 401 }
      );
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      SECRET,
      { expiresIn: '7d' }
    );
    
    // Set cookie
    const response = NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
    
    // Get the request host
    const host = process.env.VERCEL_URL 
      ? `.${process.env.VERCEL_URL.split(':')[0]}`  // Extract domain without port
      : undefined;     // For local development
    
    // Cookie settings based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
      domain: isProduction ? host : undefined,
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 