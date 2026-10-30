"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { signIn, signUp } from "@/lib/supabase/auth";

const OFFICIAL_LOGO_URL =
  "https://esmaiscriativo.es.gov.br/hubesmais/wp-content/uploads/sites/2/2024/03/HubES_Logo.png";

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    if (isAuthenticated && user && profile && !loading) {
      router.replace(profile.role === "visitante" ? "/agenda" : "/dashboard");
    }
  }, [isAuthenticated, user, profile, loading, router]);

  const changeMode = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setPassword("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      if (mode === "signup") {
        const result = await signUp(email, password, fullName.trim());
        setSuccess(
          result.session
            ? "Usuário cadastrado com sucesso. Preparando seu acesso..."
            : "Usuário cadastrado com sucesso! Enviamos um link de confirmação para o seu e-mail.",
        );
        setMode("login");
        setPassword("");
        setFullName("");
      } else {
        await signIn(email, password);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível processar a solicitação. Tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#e15936]/20 border-t-[#e15936]" />
          <p className="mt-4 text-sm font-medium text-[#535353]">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f3ea] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#272727] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -left-32 top-28 h-80 w-80 rounded-full border-[48px] border-[#40b4f5]/80" />
        <div className="absolute -right-28 bottom-16 h-72 w-72 rounded-[5rem] border-[42px] border-[#e15936]" />
        <div className="absolute right-24 top-20 h-24 w-24 rounded-3xl bg-[#f4ad2e]" />

        <div className="relative z-10">
          <div className="inline-flex rounded-2xl bg-[#f7f3ea] px-6 py-4 shadow-xl">
            <Image
              src={OFFICIAL_LOGO_URL}
              alt="HUB ES+"
              width={246}
              height={70}
              priority
              className="h-auto w-52"
            />
          </div>
        </div>

        <div className="relative z-10 max-w-xl pb-10">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-[#40b4f5]">
            Plataforma de gestão integrada
          </p>
          <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">
            Cultura, criatividade e inovação capixaba conectadas.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
            Acesse os serviços, eventos e espaços do primeiro hub público de
            economia criativa do Espírito Santo.
          </p>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#40b4f5]/15 lg:hidden" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#e15936]/15 lg:hidden" />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src={OFFICIAL_LOGO_URL}
              alt="HUB ES+"
              width={246}
              height={70}
              priority
              className="h-auto w-48"
            />
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(39,39,39,0.12)] backdrop-blur sm:p-9">
            <div className="mb-7">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#e15936]">
                {mode === "login" ? "Bem-vindo de volta" : "Faça parte"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-[#272727]">
                {mode === "login" ? "Acesse sua conta" : "Crie sua conta"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#535353]">
                {mode === "login"
                  ? "Entre com suas credenciais para continuar."
                  : "Preencha seus dados para acessar a plataforma."}
              </p>
            </div>

            {success && (
              <div
                role="status"
                aria-live="polite"
                className="mb-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm leading-relaxed text-emerald-800">
                  {success}
                </p>
              </div>
            )}

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <p className="text-sm leading-relaxed text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#272727]">
                    Nome completo
                  </span>
                  <span className="relative block">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a5a49f]" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full rounded-xl border border-[#d6d4cd] bg-white py-3 pl-11 pr-4 text-[#272727] outline-none transition placeholder:text-[#a5a49f] focus:border-[#e15936] focus:ring-4 focus:ring-[#e15936]/10"
                      placeholder="Como você deseja ser chamado"
                      autoComplete="name"
                      required
                    />
                  </span>
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#272727]">
                  E-mail
                </span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a5a49f]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-[#d6d4cd] bg-white py-3 pl-11 pr-4 text-[#272727] outline-none transition placeholder:text-[#a5a49f] focus:border-[#e15936] focus:ring-4 focus:ring-[#e15936]/10"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#272727]">
                  Senha
                </span>
                <span className="relative block">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a5a49f]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-[#d6d4cd] bg-white py-3 pl-11 pr-4 text-[#272727] outline-none transition placeholder:text-[#a5a49f] focus:border-[#e15936] focus:ring-4 focus:ring-[#e15936]/10"
                    placeholder="Digite sua senha"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={6}
                    required
                  />
                </span>
              </label>

              {mode === "login" && (
                <div className="text-right">
                  <Link
                    href="#"
                    className="text-sm font-semibold text-[#e15936] transition hover:text-[#c24a2d]"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                className="w-full rounded-xl bg-[#e15936] py-3 font-semibold text-white shadow-lg shadow-[#e15936]/20 transition hover:bg-[#c24a2d]"
                loading={isLoading}
              >
                {mode === "login" ? "Entrar" : "Cadastrar usuário"}
              </Button>
            </form>

            <div className="mt-7 border-t border-[#d6d4cd] pt-6 text-center">
              <p className="text-sm text-[#535353]">
                {mode === "login"
                  ? "Ainda não tem uma conta?"
                  : "Já possui uma conta?"}{" "}
                <button
                  type="button"
                  onClick={() =>
                    changeMode(mode === "login" ? "signup" : "login")
                  }
                  className="font-bold text-[#e15936] transition hover:text-[#c24a2d]"
                >
                  {mode === "login" ? "Cadastre-se" : "Faça login"}
                </button>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[#535353]">
            HUB ES+ · Economia criativa, cultura e inovação
          </p>
        </div>
      </section>
    </main>
  );
}
