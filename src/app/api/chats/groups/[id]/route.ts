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
  if (!token) return null;

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

// GET - Get details of a specific group chat
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: groupId } = context.params;
    if (!ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Get the group chat and verify user is a member
    const group = await db.collection('groupChats').findOne({
      _id: new ObjectId(groupId),
      members: { $in: [currentUser._id] }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get member details
    const members = await db.collection('users')
      .find({ _id: { $in: group.members } })
      .project({ name: 1, email: 1 })
      .toArray();

    return NextResponse.json({
      id: group._id.toString(),
      name: group.name,
      type: 'group',
      memberCount: group.members.length,
      members: members.map(member => ({
        id: member._id.toString(),
        name: member.name,
        email: member.email
      })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    });
  } catch (error) {
    console.error('Error fetching group chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group chat details' },
      { status: 500 }
    );
  }
}

// PATCH - Update group chat (e.g., add/remove members, change name)
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: groupId } = context.params;
    if (!ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const { name, addMembers, removeMembers } = await request.json();
    
    const client = await clientPromise;
    const db = client.db();
    
    // Get the group and verify user is the creator
    const group = await db.collection('groupChats').findOne({
      _id: new ObjectId(groupId),
      createdBy: currentUser._id
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found or you are not the owner' },
        { status: 404 }
      );
    }

    interface GroupUpdates {
      updatedAt: Date;
      name?: string;
    }

    const updates: GroupUpdates = {
      updatedAt: new Date()
    };

    if (name) {
      updates.name = name;
    }

    if (addMembers) {
      const newMemberIds = addMembers
        .filter((id: string) => ObjectId.isValid(id))
        .map((id: string) => new ObjectId(id));
      
      if (newMemberIds.length > 0) {
        await db.collection('groupChats').updateOne(
          { _id: new ObjectId(groupId) },
          { $addToSet: { members: { $each: newMemberIds } } }
        );
      }
    }

    if (removeMembers) {
      const memberIdsToRemove = removeMembers
        .filter((id: string) => ObjectId.isValid(id))
        .map((id: string) => new ObjectId(id));
      
      if (memberIdsToRemove.length > 0) {
        await db.collection('groupChats').updateOne(
          { _id: new ObjectId(groupId) },
          { $pull: { members: memberIdsToRemove } }
        );
      }
    }

    if (Object.keys(updates).length > 1) { // More than just updatedAt
      await db.collection('groupChats').updateOne(
        { _id: new ObjectId(groupId) },
        { $set: updates }
      );
    }

    // Get updated group details
    const updatedGroup = await db.collection('groupChats').findOne({
      _id: new ObjectId(groupId)
    });

    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Failed to fetch updated group details' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: updatedGroup._id.toString(),
      name: updatedGroup.name,
      type: 'group',
      memberCount: updatedGroup.members.length,
      updatedAt: updatedGroup.updatedAt
    });
  } catch (error) {
    console.error('Error updating group chat:', error);
    return NextResponse.json(
      { error: 'Failed to update group chat' },
      { status: 500 }
    );
  }
} 