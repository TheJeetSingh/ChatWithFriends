import { NextRequest, NextResponse } from 'next/server';
import { findUserById } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not defined in environment variables');
}
const SECRET = JWT_SECRET || 'development_fallback_not_for_production';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      console.log('No auth token found in cookies');
      return NextResponse.json({ user: null });
    }
    
    try {
      const decoded = jwt.verify(token, SECRET) as { id: string; email: string };
      console.log('Decoded token:', decoded);
      
      if (!ObjectId.isValid(decoded.id)) {
        console.error('Invalid ObjectId in token:', decoded.id);
        return NextResponse.json({ user: null });
      }
      
      const user = await findUserById(new ObjectId(decoded.id));
      
      if (!user) {
        console.log('No user found for ID:', decoded.id);
        return NextResponse.json({ user: null });
      }
      
      return NextResponse.json({
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      });
      
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ user: null });
    }
    
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}