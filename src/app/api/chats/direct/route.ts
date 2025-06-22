import { NextRequest, NextResponse } from 'next/server';
import { getUserDirectChats, findOrCreateDirectChat, findUserById } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not defined in environment variables');
}
const SECRET = JWT_SECRET || 'development_fallback_not_for_production';

async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    console.log('No auth token found in cookies');
    return null;
  }

  try {
    const decoded = jwt.verify(token, SECRET) as { id: string; email: string };
    console.log('Decoded token:', decoded);
    
    if (!ObjectId.isValid(decoded.id)) {
      console.error('Invalid ObjectId in token:', decoded.id);
      return null;
    }
    
    const user = await findUserById(new ObjectId(decoded.id));
    if (!user) {
      console.log('User not found for id:', decoded.id);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chats = await getUserDirectChats(currentUser._id);
    
    const populatedChats = await Promise.all(chats.map(async (chat) => {
      const otherUserIds = chat.participants.filter(
        (id: ObjectId) => id.toString() !== currentUser._id.toString()
      );
      
      if (!otherUserIds.length) {
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

    const targetUser = await findUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

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