'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context';

export type UserRole =
  | 'administrador'
  | 'administracao'
  | 'recepcao'
  | 'manutencao'
  | 'limpeza'
  | 'visitante';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, loading, profile } = useAuth();
  const router = useRouter();
  const isAuthorized = !allowedRoles || (!!profile && allowedRoles.includes(profile.role));

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!loading && isAuthenticated && profile && !isAuthorized) {
      router.replace(profile.role === 'visitante' ? '/agenda' : '/dashboard');
    }
  }, [isAuthenticated, isAuthorized, loading, profile, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile || !isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
