"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PublicRegistrationPage() {
  const { token } = useParams<{ token: string }>();
  const [event, setEvent] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    document: "",
    age: "",
    city: "",
    neighborhood: "",
    email: "",
    phone: "",
  });
  useEffect(() => {
    void fetch(`/api/public/events/${token}`).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) setError(payload.error);
      else setEvent(payload.event);
    });
  }, [token]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(`/api/public/events/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) setError(payload.error);
    else
      setSuccess("Inscrição realizada. Sua credencial foi enviada por e-mail.");
  };
  return (
    <main className="min-h-screen bg-blue-50 p-4">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-blue-900">
          Inscrição em evento
        </h1>
        {event && (
          <div className="my-4 rounded-lg bg-blue-50 p-4">
            <h2 className="font-semibold">{event.title}</h2>
            <p>
              {new Date(`${event.start_date}T12:00:00`).toLocaleDateString(
                "pt-BR",
              )}{" "}
              · {String(event.start_time).slice(0, 5)}
            </p>
            <p>{event.spaces?.name}</p>
          </div>
        )}
        {error && (
          <p className="my-4 rounded bg-red-50 p-3 text-red-700">{error}</p>
        )}
        {success ? (
          <p className="my-4 rounded bg-green-50 p-4 text-green-700">
            {success}
          </p>
        ) : (
          event && (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nome completo *"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                required
              />
              <Input
                label="Documento"
                hint="Utilizado somente para simples conferência de acesso."
                value={form.document}
                onChange={(v) => setForm({ ...form, document: v })}
              />
              <Input
                label="Idade"
                type="number"
                value={form.age}
                onChange={(v) => setForm({ ...form, age: v })}
              />
              <Input
                label="Cidade de residência"
                value={form.city}
                onChange={(v) => setForm({ ...form, city: v })}
              />
              <Input
                label="Bairro de residência"
                value={form.neighborhood}
                onChange={(v) => setForm({ ...form, neighborhood: v })}
              />
              <Input
                label="E-mail *"
                type="email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                required
              />
              <Input
                label="Telefone *"
                type="tel"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                required
              />
              <button
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-3 font-medium text-white disabled:opacity-50 sm:col-span-2"
              >
                {saving ? "Enviando..." : "Concluir inscrição"}
              </button>
            </form>
          )
        )}
      </div>
    </main>
  );
}
function Input({
  label,
  hint,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {hint && <span className="mb-1 block text-xs text-gray-500">{hint}</span>}
      <input
        className="w-full rounded-lg border px-3 py-2"
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
