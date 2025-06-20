import { MongoClient, ObjectId, Document, Filter, UpdateFilter } from 'mongodb';
import bcrypt from 'bcryptjs';

// Use the connection string from environment variable
if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const uri = process.env.MONGODB_URI;

// MongoDB Client
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof global & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;

// MongoDB Schema Types
export type User = {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DirectChat = {
  _id?: ObjectId;
  participants: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type Group = {
  _id?: ObjectId;
  name: string;
  description?: string;
  createdBy: ObjectId;
  members: ObjectId[];
  admins: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type MessageType = 'direct' | 'group';

export type Message = {
  _id?: ObjectId;
  content: string;
  senderId: ObjectId;
  chatId: ObjectId;
  chatType: MessageType;
  createdAt: Date;
}

// Helper functions for common database operations
export async function getCollection(collectionName: string) {
  const client = await clientPromise;
  const db = client.db();
  return db.collection(collectionName);
}

// User operations
export async function findUserById(userId: string | ObjectId) {
  try {
    const collection = await getCollection('users');
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const user = await collection.findOne({ _id: objectId });
    return user;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    return null;
  }
}

export async function findUserByEmail(email: string) {
  const collection = await getCollection('users');
  return await collection.findOne({ email: email.toLowerCase() });
}

export async function createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>) {
  const collection = await getCollection('users');
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  const newUser = {
    ...userData,
    email: userData.email.toLowerCase(),
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await collection.insertOne(newUser);
  return { ...newUser, _id: result.insertedId };
}

export async function validateUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;
  
  return user;
}

// Direct chat operations
export async function findOrCreateDirectChat(user1Id: string | ObjectId, user2Id: string | ObjectId) {
  const collection = await getCollection('directChats');
  const user1ObjectId = typeof user1Id === 'string' ? new ObjectId(user1Id) : user1Id;
  const user2ObjectId = typeof user2Id === 'string' ? new ObjectId(user2Id) : user2Id;
  
  // Check if chat already exists
  const existingChat = await collection.findOne({
    participants: { 
      $all: [user1ObjectId, user2ObjectId] 
    }
  });
  
  if (existingChat) {
    return existingChat;
  }
  
  // Create new chat
  const newChat: DirectChat = {
    participants: [user1ObjectId, user2ObjectId],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await collection.insertOne(newChat);
  return { ...newChat, _id: result.insertedId };
}

export async function getUserDirectChats(userId: string | ObjectId) {
  const collection = await getCollection('directChats');
  const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
  
  return await collection.find({
    participants: { $in: [userObjectId] }
  }).toArray();
}

// Group operations
export async function createGroup(groupData: {
  name: string;
  description?: string;
  createdBy: string | ObjectId;
  members: (string | ObjectId)[];
}) {
  const collection = await getCollection('groups');
  const createdByObj = typeof groupData.createdBy === 'string' 
    ? new ObjectId(groupData.createdBy) 
    : groupData.createdBy;
  
  const memberObjects = groupData.members.map(member => 
    typeof member === 'string' ? new ObjectId(member) : member
  );
  
  const newGroup: Group = {
    name: groupData.name,
    description: groupData.description,
    createdBy: createdByObj,
    members: [createdByObj, ...memberObjects.filter(m => !m.equals(createdByObj))],
    admins: [createdByObj],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await collection.insertOne(newGroup);
  return { ...newGroup, _id: result.insertedId };
}

export async function getUserGroups(userId: string | ObjectId) {
  const collection = await getCollection('groups');
  const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
  
  return await collection.find({
    members: { $in: [userObjectId] }
  }).toArray();
}

export async function getGroupMembers(groupId: string | ObjectId) {
  const collection = await getCollection('groups');
  const usersCollection = await getCollection('users');
  const groupObjectId = typeof groupId === 'string' ? new ObjectId(groupId) : groupId;
  
  const group = await collection.findOne({ _id: groupObjectId });
  if (!group) return [];
  
  return await usersCollection.find({
    _id: { $in: group.members }
  }).toArray();
}

// Message operations
export async function createMessage(messageData: {
  content: string;
  senderId: string | ObjectId;
  chatId: string | ObjectId;
  chatType: MessageType;
}) {
  const collection = await getCollection('messages');
  const senderObjectId = typeof messageData.senderId === 'string' 
    ? new ObjectId(messageData.senderId) 
    : messageData.senderId;
  
  const chatObjectId = typeof messageData.chatId === 'string' 
    ? new ObjectId(messageData.chatId) 
    : messageData.chatId;
  
  const newMessage: Message = {
    content: messageData.content,
    senderId: senderObjectId,
    chatId: chatObjectId,
    chatType: messageData.chatType,
    createdAt: new Date()
  };
  
  const result = await collection.insertOne(newMessage);
  return { ...newMessage, _id: result.insertedId };
}

export async function getMessages(chatId: string | ObjectId, chatType: MessageType, limit = 50) {
  const collection = await getCollection('messages');
  const chatObjectId = typeof chatId === 'string' ? new ObjectId(chatId) : chatId;
  
  const messages = await collection.find({
    chatId: chatObjectId,
    chatType
  })
  .sort({ createdAt: 1 })
  .limit(limit)
  .toArray();
  
  return messages;
}

export async function getMessagesWithUserDetails(chatId: string | ObjectId, chatType: MessageType, limit = 50) {
  const messagesCollection = await getCollection('messages');
  const usersCollection = await getCollection('users');
  
  const chatObjectId = typeof chatId === 'string' ? new ObjectId(chatId) : chatId;
  
  const messages = await messagesCollection.find({
    chatId: chatObjectId,
    chatType
  })
  .sort({ createdAt: 1 })
  .limit(limit)
  .toArray();
  
  // Get unique sender IDs
  const senderIds = [...new Set(messages.map(msg => msg.senderId))];
  
  // Fetch all users in one query
  const users = await usersCollection.find({
    _id: { $in: senderIds }
  }).toArray();
  
  // Create a map for quick lookup
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user._id.toString(), {
      id: user._id.toString(),
      name: user.name
    });
  });
  
  // Attach user info to messages
  return messages.map(msg => ({
    ...msg,
    _id: msg._id.toString(),
    senderId: msg.senderId.toString(),
    chatId: msg.chatId.toString(),
    user: userMap.get(msg.senderId.toString()) || { id: 'unknown', name: 'Unknown User' }
  }));
}

export async function findDocuments(collectionName: string, query = {}, options = {}) {
  const collection = await getCollection(collectionName);
  return collection.find(query, options).toArray();
}

export async function findOneDocument(collectionName: string, query = {}) {
  const collection = await getCollection(collectionName);
  return collection.findOne(query);
}

export async function insertDocument(collectionName: string, document: Document) {
  const collection = await getCollection(collectionName);
  return await collection.insertOne(document);
}

export async function updateDocument(collectionName: string, filter: Filter<Document>, update: UpdateFilter<Document>) {
  const collection = await getCollection(collectionName);
  return await collection.updateOne(filter, update);
}

export async function deleteDocument(collectionName: string, filter: Filter<Document>) {
  const collection = await getCollection(collectionName);
  return await collection.deleteOne(filter);
} 