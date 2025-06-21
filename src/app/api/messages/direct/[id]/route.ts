import { NextRequest, NextResponse } from 'next/server';
import { getMessagesWithUserDetails, createMessage, findUserById, findOrCreateDirectChat } from '@/lib/mongodb';
import { pusherServer } from '@/lib/pusher';
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

// Helper function to verify user is part of this direct chat
async function verifyDirectChatAccess(chatId: string, userId: ObjectId) {
  try {
    const client = await import('@/lib/mongodb').then(mod => mod.default);
    const db = (await client).db();
    const chat = await db.collection('directChats').findOne({
      _id: new ObjectId(chatId),
      participants: { $in: [userId] }
    });
    return !!chat;
  } catch {
    return false;
  }
}

// GET messages for a direct chat
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
    
    // Verify user has access to this chat
    const hasAccess = await verifyDirectChatAccess(chatId, currentUser._id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Not authorized to access this chat' }, { status: 403 });
    }

    // Get messages
    const messages = await getMessagesWithUserDetails(
      new ObjectId(chatId), 
      'direct',
      50
    );
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' }, 
      { status: 500 }
    );
  }
}

// POST a new message to a direct chat
export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
    
    // Verify user has access to this chat
    const hasAccess = await verifyDirectChatAccess(chatId, currentUser._id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Not authorized to access this chat' }, { status: 403 });
    }

    // Get message content
    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Create the message
    const message = await createMessage({
      content,
      senderId: currentUser._id,
      chatId: new ObjectId(chatId),
      chatType: 'direct'
    });

    // Transform for response (with user data)
    const messageWithUser = {
      _id: message._id.toString(),
      content: message.content,
      createdAt: message.createdAt,
      chatId: message.chatId.toString(),
      chatType: 'direct',
      user: {
        id: currentUser._id.toString(),
        name: currentUser.name
      }
    };

    // Trigger pusher event (non-blocking)
    try {
    await pusherServer.trigger(
      `direct-${chatId}`,
      'new-message',
      messageWithUser
    );
    } catch (pusherErr) {
      console.error('Error triggering Pusher event:', pusherErr);
      // Do not fail the request if Pusher fails in development
    }

    return NextResponse.json(messageWithUser);
  } catch (error) {
    console.error('Error creating direct message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' }, 
      { status: 500 }
    );
  }
} 