import { format } from 'date-fns';
import { FiMoreHorizontal, FiTrash } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

type MessageProps = {
  content: string;
  sender: {
    name: string;
  };
  timestamp: Date;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  showName?: boolean;
  showTimestamp?: boolean;
  messageId: string;
  onDeleteMessage?: (messageId: string) => void;
};

export default function Message({ 
  content, 
  sender, 
  timestamp, 
  isCurrentUser,
  showAvatar = true,
  showName = true,
  showTimestamp = true,
  messageId,
  onDeleteMessage
}: MessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const [imageData, setImageData] = useState('');
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (content.startsWith('[file]') && 
        (content.includes('data:image/') || 
         content.includes('base64'))) {
      try {
        const base64Match = content.match(/data:image\/[^;]+;base64,[^"]+/);
        if (base64Match) {
          setIsImage(true);
          setImageData(base64Match[0]);
        }
      } catch (error) {
        console.error('Error parsing image data:', error);
      }
    }
  }, [content]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDelete = () => {
    if (onDeleteMessage && isCurrentUser) {
      onDeleteMessage(messageId);
      setShowActions(false);
    }
  };

  return (
    <div className={`group flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {showAvatar ? (
        <div className="flex-shrink-0 w-8 h-8">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
            {sender.name.charAt(0)}
          </div>
        </div>
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}
      
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {showName && !isCurrentUser && (
          <div className="text-sm text-gray-500 mb-1 px-2">
            {sender.name}
          </div>
        )}
        
        <div className="group relative">
          <div className={`px-4 py-2 rounded-2xl ${
            isCurrentUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isImage ? (
              <div className="max-w-xs">
                <Image 
                  src={imageData} 
                  alt="Shared image" 
                  width={300}
                  height={200}
                  style={{ maxHeight: '15rem', objectFit: 'contain' }}
                  className="rounded max-h-60 max-w-full"
                />
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words">{content}</p>
            )}
          </div>
          
          <div className={`absolute top-0 ${
            isCurrentUser ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
          } h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity`}>
            <button 
              className="p-1 hover:bg-gray-100 rounded-full"
              onClick={() => setShowActions(!showActions)}
            >
              <FiMoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>
            
            {showActions && isCurrentUser && (
              <div 
                ref={actionsRef}
                className="absolute bottom-0 mb-8 bg-white shadow-lg rounded-lg py-1 z-10"
              >
                <button 
                  onClick={handleDelete}
                  className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full"
                >
                  <FiTrash className="mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        
        {showTimestamp && (
          <div className="text-xs text-gray-400 mt-1 px-2">
            {format(timestamp, 'h:mm a')}
          </div>
        )}
      </div>
    </div>
  );
} 