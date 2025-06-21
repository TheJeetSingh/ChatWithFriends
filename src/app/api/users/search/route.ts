import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { findUserById } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

// Get JWT Secret from environment variable with fallback for development
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not defined in environment variables');
}
const SECRET = JWT_SECRET || 'development_fallback_not_for_production';

// Helper function to get current user from JWT
async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, SECRET) as { id: string; email: string };
    const user = await findUserById(new ObjectId(decoded.id));
    return user;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    if (!email && !name) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('users');

    let query = {};
    if (email) {
      // Case-insensitive search by email with regex
      query = { 
        email: { $regex: email, $options: 'i' },
        // Exclude current user
        _id: { $ne: currentUser._id } 
      };
    } else if (name) {
      // Case-insensitive search by name with regex
      query = { 
        name: { $regex: name, $options: 'i' },
        // Exclude current user
        _id: { $ne: currentUser._id } 
      };
    }

    const users = await collection.find(query).limit(10).toArray();

    // Transform data to safe format (exclude sensitive info)
    const safeUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email
    }));

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
} 