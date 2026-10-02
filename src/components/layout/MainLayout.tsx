'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
  userRole?: string;
  userName?: string;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  notificationsCount?: number;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  userRole = 'visitante',
  userName = 'Usuário',
  title,
  subtitle,
  showSearch = true,
  onSearch,
  notificationsCount = 0,
}) => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar userRole={userRole} userName={userName} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          title={title}
          subtitle={subtitle}
          showSearch={showSearch}
          onSearch={onSearch}
          notificationsCount={notificationsCount}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
