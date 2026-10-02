'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { signIn, signUp } from '@/lib/supabase/auth';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signIn(email, password);
      // Auth state change will trigger redirect
    } catch (err: any) {
      const message = err?.message || 'Erro ao fazer login';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signUp(email, password, fullName);
      setError('');
      setMode('login');
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (err: any) {
      const message = err?.message || 'Erro ao criar conta';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-700 text-white items-center justify-center p-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">HubCentral ES+</h1>
          <p className="text-xl text-blue-100 mb-8">
            Gestão Integrada do HUB ES+
          </p>
          <p className="text-blue-200 max-w-md">
            Centralizando documentos, ocorrências, agenda, compras, insumos, equipamentos e comunicação
          </p>
          
          <div className="mt-12 space-y-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📋</div>
              <div className="text-left">
                <h3 className="font-semibold">Documentação</h3>
                <p className="text-sm text-blue-200">Gestão centralizada de documentos</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="text-left">
                <h3 className="font-semibold">Ocorrências</h3>
                <p className="text-sm text-blue-200">Rastreamento de problemas em tempo real</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-2xl">📅</div>
              <div className="text-left">
                <h3 className="font-semibold">Agenda</h3>
                <p className="text-sm text-blue-200">Agendamento de eventos e espaços</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-2xl">📊</div>
              <div className="text-left">
                <h3 className="font-semibold">Indicadores</h3>
                <p className="text-sm text-blue-200">Análise de dados em tempo real</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">HubCentral</h1>
            <p className="text-gray-600">ES+ Criativo</p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Tabs */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  mode === 'login'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  mode === 'signup'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cadastro
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Test Credentials Info */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-1">Dados de Teste:</p>
              <p className="text-xs text-blue-800">Email: admin@hubcentral.es</p>
              <p className="text-xs text-blue-800">Senha: senha123</p>
            </div>

            {/* Form */}
            <form onSubmit={mode === 'login' ? handleSignIn : handleSignUp} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu Nome"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              {/* Email input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Password input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {mode === 'login' && (
                <div className="text-right">
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-700">
                    Esqueceu a senha?
                  </Link>
                </div>
              )}

              {/* Buttons */}
              <Button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
                loading={isLoading}
              >
                {mode === 'login' ? 'Entrar' : 'Criar Conta'}
              </Button>
            </form>

            {/* Footer */}
            {mode === 'login' ? (
              <p className="mt-6 text-center text-sm text-gray-600">
                Não tem conta?{' '}
                <button
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Cadastre-se aqui
                </button>
              </p>
            ) : (
              <p className="mt-6 text-center text-sm text-gray-600">
                Já tem conta?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Faça login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
                <div className="text-right">
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-700">
                    Esqueceu a senha?
                  </Link>
                </div>
              )}

              {/* Buttons */}
              <Button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
                loading={isLoading}
              >
                {mode === 'login' ? 'Entrar' : 'Criar Conta'}
              </Button>
            </form>

            {/* Footer */}
            {mode === 'login' ? (
              <p className="mt-6 text-center text-sm text-gray-600">
                Não tem conta?{' '}
                <button
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Cadastre-se aqui
                </button>
              </p>
            ) : (
              <p className="mt-6 text-center text-sm text-gray-600">
                Já tem conta?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Faça login
                </button>
              </p>
            )}
              <p className="mt-6 text-center text-sm text-gray-600">
                Não tem conta?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Cadastre-se aqui
                </button>
              </p>
            ) : (
              <p className="mt-6 text-center text-sm text-gray-600">
                Já tem conta?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Faça login
                </button>
              </p>
            )}
          </div>

          {/* Demo info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Credenciais de demonstração:</strong> Use qualquer email e senha para testar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
