import { NextRequest, NextResponse } from 'next/server';
import { createUser, findUserByEmail } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

// Get JWT Secret from environment variable with fallback for development
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not defined in environment variables');
}
const SECRET = JWT_SECRET || 'development_fallback_not_for_production';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { name, email, password } = await request.json();

    // Validate inputs
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const user = await createUser({ name, email, password });

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      SECRET,
      { expiresIn: '7d' }
    );

    // Set response with user data
    const response = NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
    
    // Add auth token cookie with domain settings
    const domain = process.env.VERCEL_URL 
      ? process.env.VERCEL_URL  // Use the full Vercel URL for production
      : undefined;     // For local development
    
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
      domain: domain,
    });
    
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
} 