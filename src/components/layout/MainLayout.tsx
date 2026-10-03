'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/auth';
import { useRouter } from 'next/navigation';

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
  userRole,
  userName,
  title,
  subtitle,
  showSearch = true,
  onSearch,
  notificationsCount = 0,
}) => {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; is_read: boolean; action_url?: string | null }>>([]);
  const resolvedUserRole = userRole ?? profile?.role ?? 'visitante';
  const resolvedUserName = userName ?? profile?.full_name ?? user?.email?.split('@')[0] ?? 'Usuário';

  useEffect(() => {
    if (!user) return;
    const loadNotifications = async () => {
      const { data } = await supabase.from('notifications').select('id, title, message, is_read, action_url')
        .eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(20);
      setNotifications(data || []);
    };
    loadNotifications();
    const channel = supabase.channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, loadNotifications)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const openNotification = async (id: string, actionUrl?: string | null) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, is_read: true } : item));
    if (actionUrl) router.push(actionUrl);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar userRole={resolvedUserRole} userName={resolvedUserName} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          title={title}
          subtitle={subtitle}
          showSearch={showSearch}
          onSearch={onSearch}
          notificationsCount={notificationsCount || notifications.filter((item) => !item.is_read).length}
          notifications={notifications}
          onNotificationClick={openNotification}
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
