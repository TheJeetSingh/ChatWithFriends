'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

type NavBarProps = {
  username: string;
};

export default function NavBar({ username }: NavBarProps) {
  const { logout } = useAuth();
  const router = useRouter();
  
  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  return (
    <header className="bg-blue-500 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chat App</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm hidden sm:block">
            Logged in as <span className="font-semibold">{username}</span>
          </p>
          <button
            onClick={handleLogout}
            className="bg-white text-blue-600 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
} 