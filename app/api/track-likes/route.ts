import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_TRACKS = 200;

function normalizeDeviceId(value: unknown) {
  const id = String(value ?? "").trim();
  if (id.length < 12 || id.length > 128) {
    return null;
  }
  return id;
}

function parseTrackIds(value: string | null) {
  if (!value) {
    return [] as string[];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_TRACKS);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deviceId = normalizeDeviceId(url.searchParams.get("deviceId"));
  const trackIds = parseTrackIds(url.searchParams.get("trackIds"));

  if (!deviceId || !trackIds.length) {
    return NextResponse.json({ states: {} }, { status: 200 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ states: {} }, { status: 200 });
  }

  const [{ data: allRows }, { data: userRows }] = await Promise.all([
    supabase.from("track_likes").select("track_id").in("track_id", trackIds),
    supabase.from("track_likes").select("track_id").in("track_id", trackIds).eq("device_id", deviceId),
  ]);

  const counts = new Map<string, number>();
  for (const row of allRows ?? []) {
    const key = row.track_id;
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const likedSet = new Set((userRows ?? []).map((row) => row.track_id).filter(Boolean));
  const states: Record<string, { liked: boolean; count: number }> = {};
  for (const trackId of trackIds) {
    states[trackId] = {
      liked: likedSet.has(trackId),
      count: counts.get(trackId) ?? 0,
    };
  }

  return NextResponse.json({ states });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    trackId?: string;
    deviceId?: string;
  };

  const trackId = String(body.trackId ?? "").trim();
  const deviceId = normalizeDeviceId(body.deviceId);

  if (!trackId || !deviceId) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase config." }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from("track_likes")
    .select("id")
    .eq("track_id", trackId)
    .eq("device_id", deviceId)
    .maybeSingle();

  let liked = false;

  if (existing?.id) {
    const { error } = await supabase.from("track_likes").delete().eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    liked = false;
  } else {
    const { error } = await supabase.from("track_likes").insert({
      track_id: trackId,
      device_id: deviceId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    liked = true;
  }

  const { count } = await supabase
    .from("track_likes")
    .select("id", { count: "exact", head: true })
    .eq("track_id", trackId);

  return NextResponse.json({
    liked,
    count: count ?? 0,
  });
}
