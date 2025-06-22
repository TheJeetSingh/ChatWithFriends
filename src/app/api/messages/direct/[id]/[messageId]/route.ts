import { NextRequest, NextResponse } from 'next/server';
import { findUserById } from '@/lib/mongodb';
import { pusherServer } from '@/lib/pusher';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
/* eslint-disable @typescript-eslint/no-explicit-any */

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

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; messageId: string }> | { id: string; messageId: string } }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const { id: chatId, messageId } = resolvedParams;
    
    const client = await import('@/lib/mongodb').then(mod => mod.default);
    const db = (await client).db();
    
    const message = await db.collection('messages').findOne({
      _id: new ObjectId(messageId),
      chatId: new ObjectId(chatId),
      chatType: 'direct',
      senderId: currentUser._id
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found or you do not have permission to delete it' }, 
        { status: 404 }
      );
    }

    await db.collection('messages').deleteOne({
      _id: new ObjectId(messageId)
    });

    try {
      await pusherServer.trigger(
        `direct-${chatId}`,
        'delete-message',
        { messageId }
      );
    } catch (pusherErr) {
      console.error('Error triggering Pusher delete event:', pusherErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' }, 
      { status: 500 }
    );
  }
}