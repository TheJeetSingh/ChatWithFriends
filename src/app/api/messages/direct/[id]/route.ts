/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getMessagesWithUserDetails, createMessage, findUserById } from '@/lib/mongodb';
import { pusherServer } from '@/lib/pusher';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not defined in environment variables');
}
const SECRET = JWT_SECRET || 'development_fallback_not_for_production';

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
    
    const hasAccess = await verifyDirectChatAccess(chatId, currentUser._id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Not authorized to access this chat' }, { status: 403 });
    }

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

export async function POST(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chatId = context?.params?.id;
    
    const hasAccess = await verifyDirectChatAccess(chatId, currentUser._id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Not authorized to access this chat' }, { status: 403 });
    }

    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const message = await createMessage({
      content,
      senderId: currentUser._id,
      chatId: new ObjectId(chatId),
      chatType: 'direct'
    });

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

    try {
    await pusherServer.trigger(
      `direct-${chatId}`,
      'new-message',
      messageWithUser
    );
    } catch (pusherErr) {
      console.error('Error triggering Pusher event:', pusherErr);
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