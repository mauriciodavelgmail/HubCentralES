'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AlertCircle,
  FileText,
  Calendar,
  Package,
  ShoppingCart,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  FileStack,
  HandshakeIcon,
} from 'lucide-react';
import { SIDEBAR_MENU } from '@/constants';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/context';

interface SidebarProps {
  userRole?: string;
  userName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole = 'visitante', userName = 'Usuário' }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      LayoutDashboard: <LayoutDashboard size={20} />,
      AlertCircle: <AlertCircle size={20} />,
      FileText: <FileText size={20} />,
      Calendar: <Calendar size={20} />,
      Package: <Package size={20} />,
      ShoppingCart: <ShoppingCart size={20} />,
      Wrench: <Wrench size={20} />,
      BarChart3: <BarChart3 size={20} />,
      Settings: <Settings size={20} />,
      FileStack: <FileStack size={20} />,
      HandshakeIcon: <HandshakeIcon size={20} />,
    };
    return icons[iconName] || null;
  };

  const filteredMenu = SIDEBAR_MENU.filter((item) => item.roles.includes(userRole as any));

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-blue-600 text-white rounded-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-blue-600 to-blue-700 text-white transform transition-transform duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="px-6 py-6 border-b border-blue-500">
            <h1 className="text-2xl font-bold">HubCentral</h1>
            <p className="text-xs text-blue-200">ES+ Criativo</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {filteredMenu.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-6 py-3 transition-colors',
                    isActive ? 'bg-blue-500 border-l-4 border-white' : 'hover:bg-blue-500/50'
                  )}
                >
                  <span>{getIconComponent(item.icon)}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info & Logout */}
          <div className="border-t border-blue-500 p-4">
            <div className="mb-4">
              <p className="text-xs text-blue-200">Usuário</p>
              <p className="text-sm font-semibold truncate">{userName}</p>
              <p className="text-xs text-blue-200 capitalize">{userRole}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Main content margin */}
      <div className="lg:ml-64" />
    </>
  );
};
