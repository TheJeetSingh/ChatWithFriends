import { FiMenu } from 'react-icons/fi';
import { useCallback, useEffect, useState } from 'react';

type ChatType = 'direct' | 'group';

type ChatHeaderProps = {
  chatType?: ChatType;
  chatId?: string;
  onMenuClick: () => void;
};

type ChatDetails = {
  name: string;
  status?: string;
  memberCount?: number;
};

export default function ChatHeader({ chatType, chatId, onMenuClick }: ChatHeaderProps) {
  const [chatDetails, setChatDetails] = useState<ChatDetails | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  const fetchChatDetails = useCallback(async () => {
    if (!chatId || !chatType) {
      setChatDetails({ name: 'Welcome to Chat' });
      return;
    }

    try {
      const endpoint = chatType === 'group'
        ? `/api/chats/groups/${chatId}`
        : `/api/chats/${chatType}/${chatId}`;

      const response = await fetch(endpoint, { credentials: 'include' });
      const data = await response.json();
      
      setChatDetails({
        name: data.name,
        status: data.status,
        memberCount: data.memberCount
      });
      
      if (chatType === 'direct') {
        setIsOnline(data.isOnline || false);
      }
    } catch (error) {
      console.error('Failed to fetch chat details:', error);
    }
  }, [chatId, chatType]);

  useEffect(() => {
    fetchChatDetails();
  }, [fetchChatDetails]);

  if (!chatDetails) return null;

  return (
    <div className="h-16 flex items-center px-4 border-b border-gray-200 bg-white">
      <button 
        onClick={onMenuClick}
        className="p-2 hover:bg-gray-100 rounded-full mr-2"
      >
        <FiMenu className="w-5 h-5 text-gray-600" />
      </button>

      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-medium text-gray-900 truncate">
          {chatDetails.name}
        </h2>
        {chatType === 'direct' && (
          <p className="text-sm text-gray-500 flex items-center">
            <span 
              className={`w-2 h-2 rounded-full mr-2 ${
                isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`} 
            />
            {isOnline ? 'Online' : 'Offline'}
          </p>
        )}
        {chatType === 'group' && chatDetails.memberCount && (
          <p className="text-sm text-gray-500">
            {chatDetails.memberCount} members
          </p>
        )}
      </div>
    </div>
  );
} 