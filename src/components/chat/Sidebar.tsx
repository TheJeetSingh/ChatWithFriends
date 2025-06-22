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

type RawChat = Omit<Chat, 'updatedAt'> & {
  updatedAt?: string;
  lastMessageTime?: string;
};

type SidebarProps = {
  currentUser: User;
  selectedChatId?: string;
};

export default function Sidebar({ currentUser, selectedChatId }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'spaces'>('chats');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const directRes = await fetch('/api/chats/direct', {
        credentials: 'include',
      });
      let directChats: RawChat[] = [];
      if (directRes.ok) {
        directChats = (await directRes.json()) as RawChat[];
      }

      const groupRes = await fetch('/api/chats/groups', {
        credentials: 'include',
      });
      let groupChats: RawChat[] = [];
      if (groupRes.ok) {
        groupChats = (await groupRes.json()) as RawChat[];
      }

      const combined: RawChat[] = [...directChats, ...groupChats];

      const normalized: Chat[] = combined.map((chat) => ({
        ...chat,
        updatedAt: chat.updatedAt
          ? new Date(chat.updatedAt)
          : chat.lastMessageTime
          ? new Date(chat.lastMessageTime)
          : new Date(0),
      }));

      normalized.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      setChats(normalized);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    if (activeTab === 'chats' && chat.type !== 'direct') return false;
    if (activeTab === 'spaces' && chat.type !== 'group') return false;
    return chat.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
            {currentUser.name.charAt(0)}
          </div>
          <span className="ml-3 font-medium text-gray-800">{currentUser.name}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
          />
        </div>
      </div>

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

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-4 text-gray-500">{activeTab === 'chats' ? 'Loading chats...' : 'Loading spaces...'}</p>
        ) : filteredChats.length === 0 ? (
          <p className="p-4 text-gray-500">No conversations found.</p>
        ) : (
          filteredChats.map((chat) => (
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
          ))
        )}
      </div>

      <div className="h-4" />
    </div>
  );
} 