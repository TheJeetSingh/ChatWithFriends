import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { findDocuments, insertDocument } from '@/lib/mongodb';
import { Document } from 'mongodb';

type Message = {
  _id: string;
  content: string;
  createdAt: Date;
  userId?: string;
  user: {
    id: string;
    name: string;
  };
};

export async function GET() {
  try {
    // Fetch messages from MongoDB
    const messages = await findDocuments('messages', {}, {
      sort: { createdAt: 1 }, // Sort by creation date ascending
      limit: 50, // Limit to avoid large payloads
    });
    
    // Transform MongoDB ObjectId to string for JSON serialization
    const formattedMessages = messages.map((msg: Document) => ({
      _id: msg._id.toString(),
      content: msg.content as string,
      createdAt: msg.createdAt as Date,
      userId: msg.userId?.toString(),
      user: msg.user as Message['user']
    }));
    
    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from request cookies
    const userCookieValue = request.cookies.get('chatUser')?.value;
    
    if (!userCookieValue) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
      // Parse the user from cookie
      const user = JSON.parse(decodeURIComponent(userCookieValue));
      
      if (!user || !user.id || !user.name) {
        return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
      }
      
      // Parse request body
      const { content } = await request.json();
      
      if (!content || typeof content !== 'string') {
        return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
      }
      
      // Create a new message for MongoDB
      const newMessage = {
        content,
        createdAt: new Date(),
        userId: user.id,
        user: {
          id: user.id,
          name: user.name
        }
      };
      
      // Insert into MongoDB
      const result = await insertDocument('messages', newMessage);
      
      // Get the generated _id and convert to string for response
      const messageWithId = {
        ...newMessage,
        _id: result.insertedId.toString()
      };
      
      // Broadcast the new message via Pusher
      await pusherServer.trigger('chat', 'new-message', messageWithId);
      
      return NextResponse.json(messageWithId);
    } catch (err) {
      console.error('Invalid user cookie:', err);
      return NextResponse.json({ error: 'Invalid user data' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 