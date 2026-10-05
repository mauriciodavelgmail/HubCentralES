import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token)
    return NextResponse.json(
      { error: "Sessão não informada." },
      { status: 401 },
    );
  const {
    data: { user },
  } = await db.auth.getUser(token);
  if (!user)
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const { id } = await context.params;
  const { enabled } = await request.json();
  const [{ data: actor }, { data: event }] = await Promise.all([
    db.from("profiles").select("id,role").eq("user_id", user.id).single(),
    db
      .from("events")
      .select("requester_id,status,public_registration_token")
      .eq("id", id)
      .single(),
  ]);
  if (
    !actor ||
    !event ||
    event.status !== "confirmada" ||
    (actor.role !== "administrador" && actor.id !== event.requester_id)
  )
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  const { data, error } = await db
    .from("events")
    .update({ public_registration_enabled: Boolean(enabled) })
    .eq("id", id)
    .select("public_registration_token,public_registration_enabled")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
