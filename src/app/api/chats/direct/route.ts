import { NextRequest, NextResponse } from 'next/server';
import { getUserDirectChats, findOrCreateDirectChat, findUserById } from '@/lib/mongodb';
import { cookies } from 'next/headers';
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
  } catch (err) {
    return null;
  }
}

// GET - List all direct chats for the current user
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chats = await getUserDirectChats(currentUser._id);
    
    // Populate chat data with other user info for each chat
    const populatedChats = await Promise.all(chats.map(async (chat) => {
      // Find the other user in the conversation
      const otherUserIds = chat.participants.filter(
        (id: ObjectId) => id.toString() !== currentUser._id.toString()
      );
      
      if (!otherUserIds.length) {
        // Fallback for self-chat or invalid chat
        return {
          id: chat._id.toString(),
          name: 'Unknown User',
          type: 'direct',
        };
      }
      
      const otherUser = await findUserById(otherUserIds[0]);
      
      return {
        id: chat._id.toString(),
        name: otherUser ? otherUser.name : 'Unknown User',
        type: 'direct',
        // Additional chat metadata could be added here
      };
    }));

    return NextResponse.json(populatedChats);
  } catch (error) {
    console.error('Error fetching direct chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch direct chats' }, 
      { status: 500 }
    );
  }
}

// POST - Create a new direct chat with another user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' }, 
        { status: 400 }
      );
    }

    // Check if the target user exists
    const targetUser = await findUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    // Create or get existing chat
    const chat = await findOrCreateDirectChat(currentUser._id, targetUser._id);

    return NextResponse.json({
      id: chat._id.toString(),
      name: targetUser.name,
      type: 'direct',
    });
  } catch (error) {
    console.error('Error creating direct chat:', error);
    return NextResponse.json(
      { error: 'Failed to create direct chat' }, 
      { status: 500 }
    );
  }
} 