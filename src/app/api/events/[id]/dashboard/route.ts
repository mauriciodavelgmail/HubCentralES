import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ParticipantRow = {
  city: string | null;
  neighborhood: string | null;
  presence_confirmed: boolean;
};

type LocationGroup = {
  key: string;
  city: string;
  neighborhood: string;
  total: number;
  present: number;
};

type GeocodeRow = {
  location_key: string;
  latitude: number | null;
  longitude: number | null;
  status: "resolved" | "not_found";
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const locationKey = (city: string, neighborhood: string) =>
  `${normalize(city)}|${normalize(neighborhood)}`;

function database() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function authClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function geocode(city: string, neighborhood: string) {
  const query = [neighborhood, city, "Espírito Santo", "Brasil"]
    .filter(Boolean)
    .join(", ");
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "pt-BR,pt;q=0.9",
      "User-Agent":
        process.env.GEOCODING_USER_AGENT ??
        `HubCentralES/1.0 (${process.env.NEXT_PUBLIC_SITE_URL ?? "event-dashboard"})`,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!results[0]) return null;
  return { latitude: Number(results[0].lat), longitude: Number(results[0].lon) };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token)
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: authData, error: authError } =
      await authClient().auth.getUser(token);
    if (authError || !authData.user)
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

    const db = database();
    const { id } = await context.params;
    const [{ data: profile }, { data: event, error: eventError }] =
      await Promise.all([
        db
          .from("profiles")
          .select("id,role")
          .eq("user_id", authData.user.id)
          .eq("is_active", true)
          .single(),
        db
          .from("events")
          .select("id,title,start_date,start_time,end_time,status,requester_id,spaces(name)")
          .eq("id", id)
          .single(),
      ]);

    if (eventError || !event)
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    if (
      !profile ||
      (!['administrador', 'administracao', 'recepcao'].includes(profile.role) &&
        event.requester_id !== profile.id)
    )
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });

    const { data: participantData, error: participantError } = await db
      .from("attendance_list")
      .select("city,neighborhood,presence_confirmed")
      .eq("event_id", id);
    if (participantError) throw participantError;

    const participants = (participantData ?? []) as ParticipantRow[];
    const grouped = new Map<string, LocationGroup>();
    let withoutLocation = 0;
    for (const participant of participants) {
      const city = participant.city?.trim() ?? "";
      if (!city) {
        withoutLocation += 1;
        continue;
      }
      const neighborhood = participant.neighborhood?.trim() ?? "";
      const key = locationKey(city, neighborhood);
      const current = grouped.get(key) ?? {
        key,
        city,
        neighborhood,
        total: 0,
        present: 0,
      };
      current.total += 1;
      if (participant.presence_confirmed) current.present += 1;
      grouped.set(key, current);
    }

    const keys = [...grouped.keys()];
    const cached = keys.length
      ? await db
          .from("participant_location_geocodes")
          .select("location_key,latitude,longitude,status")
          .in("location_key", keys)
      : { data: [] as GeocodeRow[] };
    const coordinates = new Map(
      ((cached.data ?? []) as GeocodeRow[]).map((row) => [row.location_key, row]),
    );

    // Keep the public geocoder below one request per second and cap each page
    // load. Further uncached locations are resolved on the next refresh.
    const missing = [...grouped.values()]
      .filter((location) => !coordinates.has(location.key))
      .slice(0, 5);
    for (let index = 0; index < missing.length; index += 1) {
      if (index > 0)
        await new Promise((resolve) => setTimeout(resolve, 1100));
      const location = missing[index];
      const result = await geocode(location.city, location.neighborhood);
      const row: GeocodeRow = {
        location_key: location.key,
        latitude: result?.latitude ?? null,
        longitude: result?.longitude ?? null,
        status: result ? "resolved" : "not_found",
      };
      await db.from("participant_location_geocodes").upsert({
        ...row,
        city: location.city,
        neighborhood: location.neighborhood || null,
        updated_at: new Date().toISOString(),
      });
      coordinates.set(location.key, row);
    }

    const present = participants.filter((item) => item.presence_confirmed).length;
    const locations = [...grouped.values()].map((location) => {
      const point = coordinates.get(location.key);
      return {
        city: location.city,
        neighborhood: location.neighborhood || "Bairro não informado",
        total: location.total,
        present: location.present,
        notPresent: location.total - location.present,
        latitude: point?.status === "resolved" ? point.latitude : null,
        longitude: point?.status === "resolved" ? point.longitude : null,
      };
    });
    const queuedGeocodes = [...grouped.keys()].filter(
      (key) => !coordinates.has(key),
    ).length;

    return NextResponse.json({
      event,
      summary: {
        total: participants.length,
        present,
        notPresent: participants.length - present,
        withoutLocation,
      },
      locations,
      pendingGeocodes: locations.filter(
        (location) => location.latitude == null || location.longitude == null,
      ).length,
      queuedGeocodes,
    });
  } catch (error) {
    console.error("Erro no dashboard geográfico do evento:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o dashboard do evento." },
      { status: 500 },
    );
  }
}
