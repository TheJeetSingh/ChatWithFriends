/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
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

// GET - Get details of a specific direct chat
export async function GET(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chatId = context?.params?.id;

    // Get the direct chat
    const client = await import('@/lib/mongodb').then(mod => mod.default);
    const db = (await client).db();
    const chat = await db.collection('directChats').findOne({
      _id: new ObjectId(chatId),
      participants: { $in: [currentUser._id] }
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Find the other participant
    const otherParticipantIds = chat.participants.filter(
      (id: ObjectId) => id.toString() !== currentUser._id.toString()
    );

    if (!otherParticipantIds.length) {
      // Self-chat or error case
      return NextResponse.json({
        id: chat._id.toString(),
        name: 'You',
        type: 'direct'
      });
    }

    // Get other user's details
    const otherUser = await findUserById(otherParticipantIds[0]);

    if (!otherUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: chat._id.toString(),
      name: otherUser.name,
      type: 'direct',
      email: otherUser.email
    });
  } catch (error) {
    console.error('Error fetching direct chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat details' },
      { status: 500 }
    );
  }
} 