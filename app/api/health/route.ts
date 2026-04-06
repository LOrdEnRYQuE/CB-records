import { NextResponse } from "next/server";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseConfigured = hasSupabasePublicConfig();

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        supabasePublicConfig: supabaseConfigured ? "configured" : "missing",
      },
    },
    { status: 200 },
  );
}
