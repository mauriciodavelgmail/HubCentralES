"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  Users,
  UserX,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MainLayout } from "@/components/layout";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from "@/components/ui";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { supabase } from "@/lib/supabase/auth";
import {
  HeatLocation,
  HeatMetric,
  ParticipantHeatMap,
} from "@/components/events/ParticipantHeatMap";

interface DashboardData {
  event: {
    id: string;
    title: string;
    start_date: string;
    start_time: string;
    end_time: string;
    status: string;
    spaces: { name: string } | null;
  };
  summary: {
    total: number;
    present: number;
    notPresent: number;
    withoutLocation: number;
  };
  locations: HeatLocation[];
  pendingGeocodes: number;
  queuedGeocodes: number;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export default function EventDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState<HeatMetric>("total");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Sua sessão expirou.");
      const response = await fetch(`/api/events/${id}/dashboard`, {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Não foi possível carregar o dashboard.");
      setData(payload as DashboardData);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Erro desconhecido.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const eventFinished = useMemo(() => {
    if (!data) return false;
    const end = new Date(`${data.event.start_date}T${data.event.end_time}`);
    return Number.isFinite(end.getTime()) && currentTime > end.getTime();
  }, [currentTime, data]);
  const absenceLabel = eventFinished ? "Ausentes" : "Não confirmados";

  const cityData = useMemo(() => {
    if (!data) return [];
    const cities = new Map<
      string,
      { name: string; total: number; present: number; notPresent: number }
    >();
    data.locations.forEach((location) => {
      const key = normalize(location.city);
      const city = cities.get(key) ?? {
        name: location.city,
        total: 0,
        present: 0,
        notPresent: 0,
      };
      city.total += location.total;
      city.present += location.present;
      city.notPresent += location.notPresent;
      cities.set(key, city);
    });
    return [...cities.values()].sort((a, b) => b.total - a.total);
  }, [data]);

  const neighborhoodData = useMemo(
    () =>
      [...(data?.locations ?? [])].sort((a, b) => b.total - a.total),
    [data],
  );

  const presenceData = data
    ? [
        { name: "Presentes", value: data.summary.present, color: "#16a34a" },
        {
          name: absenceLabel,
          value: data.summary.notPresent,
          color: eventFinished ? "#dc2626" : "#f59e0b",
        },
      ]
    : [];

  return (
    <ProtectedRoute
      allowedRoles={["administrador", "administracao", "recepcao", "visitante"]}
    >
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 -ml-2"
                onClick={() => router.push("/agenda")}
              >
                <ArrowLeft size={17} /> Voltar para agenda
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Dashboard do evento
              </h1>
              {data && (
                <p className="mt-1 text-gray-600">
                  {data.event.title} ·{" "}
                  {new Date(`${data.event.start_date}T12:00:00`).toLocaleDateString(
                    "pt-BR",
                  )}
                  {data.event.spaces?.name ? ` · ${data.event.spaces.name}` : ""}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              Atualizar dados
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {loading && !data ? (
            <div className="flex justify-center py-24">
              <LoadingSpinner size="lg" />
            </div>
          ) : data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total de convidados"
                  value={data.summary.total}
                  icon={<Users className="text-blue-700" />}
                  tone="bg-blue-50"
                />
                <MetricCard
                  title="Presentes"
                  value={data.summary.present}
                  icon={<CheckCircle2 className="text-green-700" />}
                  tone="bg-green-50"
                />
                <MetricCard
                  title={absenceLabel}
                  value={data.summary.notPresent}
                  icon={
                    eventFinished ? (
                      <UserX className="text-red-700" />
                    ) : (
                      <Clock3 className="text-amber-700" />
                    )
                  }
                  tone={eventFinished ? "bg-red-50" : "bg-amber-50"}
                />
                <MetricCard
                  title="Comparecimento"
                  value={`${data.summary.total ? Math.round((data.summary.present / data.summary.total) * 100) : 0}%`}
                  icon={<MapPin className="text-purple-700" />}
                  tone="bg-purple-50"
                />
              </div>

              {!eventFinished && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Como o evento ainda não terminou, convidados sem check-in são
                  exibidos como <strong>não confirmados</strong>. Após o horário de
                  encerramento, eles serão classificados como <strong>ausentes</strong>.
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Presença no evento</CardTitle>
                    <CardDescription>Distribuição geral dos convidados</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={presenceData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={65}
                          outerRadius={105}
                          paddingAngle={2}
                        >
                          {presenceData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Participantes por cidade</CardTitle>
                    <CardDescription>Presentes e {absenceLabel.toLowerCase()}</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cityData.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={95} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" name="Presentes" stackId="a" fill="#16a34a" />
                        <Bar
                          dataKey="notPresent"
                          name={absenceLabel}
                          stackId="a"
                          fill={eventFinished ? "#dc2626" : "#f59e0b"}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Mapa de calor da Grande Vitória</CardTitle>
                    <CardDescription>
                      Azul indica menor concentração e vermelho, maior concentração.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["total", "Total"],
                        ["present", "Presentes"],
                        ["notPresent", absenceLabel],
                      ] as Array<[HeatMetric, string]>
                    ).map(([value, label]) => (
                      <Button
                        key={value}
                        size="sm"
                        variant={metric === value ? "primary" : "outline"}
                        onClick={() => setMetric(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <ParticipantHeatMap
                    locations={data.locations}
                    metric={metric}
                    absenceLabel={absenceLabel}
                  />
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
                    <span>{data.locations.length} regiões identificadas</span>
                    <span>{data.summary.withoutLocation} participantes sem cidade</span>
                    {data.pendingGeocodes > 0 && (
                      <span className="text-amber-700">
                        {data.pendingGeocodes} regiões sem coordenadas no mapa
                      </span>
                    )}
                    {data.queuedGeocodes > 0 && (
                      <span className="text-blue-700">
                        {data.queuedGeocodes} regiões serão processadas na próxima atualização
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por bairro</CardTitle>
                  <CardDescription>
                    Regiões ordenadas pelo total de participantes
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full min-w-[650px] text-sm">
                    <thead className="bg-gray-50 text-left text-gray-700">
                      <tr>
                        <th className="px-5 py-3">Cidade</th>
                        <th className="px-5 py-3">Bairro</th>
                        <th className="px-5 py-3 text-right">Total</th>
                        <th className="px-5 py-3 text-right">Presentes</th>
                        <th className="px-5 py-3 text-right">{absenceLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {neighborhoodData.map((location) => (
                        <tr
                          key={`${normalize(location.city)}-${normalize(location.neighborhood)}`}
                          className="border-t border-gray-100"
                        >
                          <td className="px-5 py-3 font-medium">{location.city}</td>
                          <td className="px-5 py-3">{location.neighborhood}</td>
                          <td className="px-5 py-3 text-right font-semibold">{location.total}</td>
                          <td className="px-5 py-3 text-right text-green-700">{location.present}</td>
                          <td className="px-5 py-3 text-right">{location.notPresent}</td>
                        </tr>
                      ))}
                      {!neighborhoodData.length && (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-gray-500">
                            Nenhum participante possui cidade cadastrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card className={tone}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="rounded-full bg-white/80 p-3">{icon}</div>
      </CardContent>
    </Card>
  );
}
