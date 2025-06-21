import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { findUserById } from '@/lib/mongodb';
import * as jose from 'jose';

// Get JWT Secret from environment variable with fallback for development
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not defined in environment variables');
}
const SECRET = JWT_SECRET || 'development_fallback_not_for_production';

// Create a TextEncoder for the secret
const secretKey = new TextEncoder().encode(SECRET);

// Helper function to get current user from JWT
async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    console.log('No auth token found in cookies');
    return null;
  }

  try {
    const decoded = await jose.jwtVerify(token, secretKey);
    const userId = decoded.payload.id as string;
    
    if (!ObjectId.isValid(userId)) {
      console.error('Invalid ObjectId in token:', userId);
      return null;
    }
    
    const user = await findUserById(new ObjectId(userId));
    if (!user) {
      console.log('User not found for id:', userId);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// GET - List all group chats for the current user
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Find all groups where the user is a member
    const groups = await db.collection('groupChats').find({
      members: currentUser._id
    }).toArray();
    
    // Transform for response
    const transformedGroups = groups.map(group => ({
      id: group._id.toString(),
      name: group.name,
      type: 'group',
      memberCount: group.members.length,
      lastMessage: group.lastMessage,
      lastMessageTime: group.lastMessageTime
    }));

    return NextResponse.json(transformedGroups);
  } catch (error) {
    console.error('Error fetching group chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group chats' },
      { status: 500 }
    );
  }
}

// POST - Create a new group chat
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Create new group with current user as first member
    const result = await db.collection('groupChats').insertOne({
      name,
      members: [currentUser._id],
      createdBy: currentUser._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({
      id: result.insertedId.toString(),
      name,
      type: 'group',
      memberCount: 1
    });
  } catch (error) {
    console.error('Error creating group chat:', error);
    return NextResponse.json(
      { error: 'Failed to create group chat' },
      { status: 500 }
    );
  }
} 