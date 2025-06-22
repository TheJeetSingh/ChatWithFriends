import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { findUserById } from '@/lib/mongodb';
import * as jose from 'jose';
import { pusherServer } from '@/lib/pusher';
/* eslint-disable @typescript-eslint/no-explicit-any */

// Get JWT Secret from environment variable with fallback for development
const JWT_SECRET = process.env.JWT_SECRET;
const SECRET = JWT_SECRET || 'development_fallback_not_for_production';
const secretKey = new TextEncoder().encode(SECRET);

// Helper to get current user from JWT cookie
async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  try {
    const decoded = await jose.jwtVerify(token, secretKey);
    const userId = decoded.payload.id as string;
    if (!ObjectId.isValid(userId)) return null;
    return await findUserById(new ObjectId(userId));
  } catch {
    return null;
  }
}

// Verify that the user is a member of the group
async function verifyGroupMembership(groupId: string, userId: ObjectId) {
  const client = await clientPromise;
  const db = client.db();
  const group = await db.collection('groupChats').findOne({
    _id: new ObjectId(groupId),
    members: { $in: [userId] }
  });
  return !!group;
}

// GET messages for a group chat
export async function GET(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = context?.params?.id;
    if (!ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    // Verify membership
    const isMember = await verifyGroupMembership(groupId, currentUser._id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not authorized to access this group' }, { status: 403 });
    }

    const { getMessagesWithUserDetails } = await import('@/lib/mongodb');
    const messages = await getMessagesWithUserDetails(
      new ObjectId(groupId),
      'group',
      50
    );

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST a message to a group chat
export async function POST(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = context?.params?.id;
    if (!ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    // Verify membership
    const isMember = await verifyGroupMembership(groupId, currentUser._id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not authorized to access this group' }, { status: 403 });
    }

    const { content } = await request.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const messageDoc = {
      chatId: new ObjectId(groupId),
      chatType: 'group',
      senderId: currentUser._id,
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('messages').insertOne(messageDoc);

    // Format message for response and broadcasting
    const messageWithUser = {
      ...messageDoc,
      _id: result.insertedId.toString(),
      senderId: currentUser._id.toString(),
      chatId: groupId,
      user: {
        id: currentUser._id.toString(),
        name: currentUser.name
      }
    };

    // Broadcast via Pusher
    try {
      await pusherServer.trigger(
        `group-${groupId}`,
        'new-message',
        messageWithUser
      );
    } catch (pusherErr) {
      console.error('Error triggering Pusher event:', pusherErr);
      // Continue with the request even if Pusher fails
    }

    return NextResponse.json(messageWithUser);
  } catch (error) {
    console.error('Error posting group message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 