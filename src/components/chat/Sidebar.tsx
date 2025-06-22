import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiMessageSquare, FiUsers, FiSearch } from 'react-icons/fi';

type ChatType = 'direct' | 'group';

type User = {
  id: string;
  name: string;
};

type Chat = {
  id: string;
  name: string;
  type: ChatType;
  lastMessage?: string;
  unreadCount?: number;
  updatedAt: Date;
};

type SidebarProps = {
  currentUser: User;
  selectedChatId?: string;
};

export default function Sidebar({ currentUser, selectedChatId }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'spaces'>('chats');

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      // Fetch direct chats
      const directRes = await fetch('/api/chats/direct', {
        credentials: 'include',
      });
      // If unauthorized, skip (user will be redirected by higher-level logic)
      let directChats: any[] = [];
      if (directRes.ok) {
        directChats = await directRes.json();
      }

      // Fetch group chats
      const groupRes = await fetch('/api/chats/groups', {
        credentials: 'include',
      });
      let groupChats: any[] = [];
      if (groupRes.ok) {
        groupChats = await groupRes.json();
      }

      const combined = [...directChats, ...groupChats];

      // Sort by updatedAt / lastMessageTime if available
      combined.sort((a, b) => {
        const timeA = new Date((a.updatedAt || a.lastMessageTime || 0) as any).getTime();
        const timeB = new Date((b.updatedAt || b.lastMessageTime || 0) as any).getTime();
        return timeB - timeA;
      });

      // Normalize and convert dates
      const normalized = combined.map((chat: any) => ({
        ...chat,
        updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : (chat.lastMessageTime ? new Date(chat.lastMessageTime) : new Date(0)),
      }));

      setChats(normalized);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  };

  const filteredChats = chats.filter(chat => {
    // Filter by tab (direct vs group) and search query
    if (activeTab === 'chats' && chat.type !== 'direct') return false;
    if (activeTab === 'spaces' && chat.type !== 'group') return false;
    return chat.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col bg-white">
      {/* User Profile Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
            {currentUser.name.charAt(0)}
          </div>
          <span className="ml-3 font-medium">{currentUser.name}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'chats'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          <FiMessageSquare className="inline-block mr-2" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('spaces')}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'spaces'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          <FiUsers className="inline-block mr-2" />
          Spaces
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.map(chat => (
          <Link
            key={chat.id}
            href={`/chat/${chat.type}/${chat.id}`}
            className={`block px-4 py-3 hover:bg-gray-100 ${
              selectedChatId === chat.id ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {chat.name}
                </h3>
                {chat.lastMessage && (
                  <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage}
                  </p>
                )}
              </div>
              {chat.unreadCount ? (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                  {chat.unreadCount}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom padding to avoid content sticking to bottom */}
      <div className="h-4" />
    </div>
  );
} 