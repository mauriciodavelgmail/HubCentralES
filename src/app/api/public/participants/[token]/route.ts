import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await db
    .from("attendance_list")
    .select(
      "participant_name,access_link,presence_confirmed,presence_time,events(title,start_date,start_time,spaces(name))",
    )
    .eq("access_link", token)
    .single();
  if (error || !data)
    return NextResponse.json(
      { error: "Credencial não encontrada." },
      { status: 404 },
    );
  return NextResponse.json({ participant: data });
}
