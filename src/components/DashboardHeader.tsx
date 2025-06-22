import { FiSearch } from 'react-icons/fi';
import { FormEvent } from 'react';

type DashboardHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  userName: string;
  onLogout: () => void;
};

export default function DashboardHeader({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  userName,
  onLogout,
}: DashboardHeaderProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearchSubmit();
  };

  return (
    <header className="flex items-center h-20 px-6 border-b border-gray-200 bg-white shadow-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search chat"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-100 pl-10 pr-4 py-3 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white shadow-inner placeholder-gray-500"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center space-x-4">
        <span className="text-sm text-gray-700">{userName}</span>
        <button
          onClick={onLogout}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100"
        >
          Sign out
        </button>
      </div>
    </header>
  );
} 