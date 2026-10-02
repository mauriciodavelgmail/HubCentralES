'use client';

import React, { useState } from 'react';
import { Bell, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  notificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showSearch = true,
  onSearch,
  notificationsCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-6 py-4">
        {/* Logo/Title for mobile */}
        <div className="lg:hidden mb-4">
          <h2 className="text-xl font-bold text-blue-600">HubCentral ES+</h2>
        </div>

        <div className="flex gap-4 items-center justify-between">
          {/* Left: Title */}
          {(title || subtitle) && (
            <div>
              {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          )}

          {/* Middle: Search */}
          {showSearch && (
            <div className="hidden md:flex flex-1 max-w-xs mx-4">
              <div className="relative w-full">
                <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Global search mobile */}
            <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Search size={20} className="text-gray-600" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell size={20} className="text-gray-600" />
                {notificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {notificationsCount > 9 ? '9+' : notificationsCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Notificações</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Nenhuma notificação pendente
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User profile */}
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <User size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
