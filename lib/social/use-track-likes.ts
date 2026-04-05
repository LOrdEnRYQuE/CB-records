"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getOrCreateDeviceId } from "@/lib/social/device-id";

type LikeState = {
  liked: boolean;
  count: number;
};

export function useTrackLikes(trackIds: string[]) {
  const [likesByTrack, setLikesByTrack] = useState<Record<string, LikeState>>({});
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const normalizedIds = useMemo(() => Array.from(new Set(trackIds.filter(Boolean))), [trackIds]);

  const refresh = useCallback(async () => {
    if (!normalizedIds.length || !deviceId) {
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("deviceId", deviceId);
      params.set("trackIds", normalizedIds.join(","));

      const response = await fetch(`/api/track-likes?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { states?: Record<string, LikeState> };
      if (payload.states) {
        setLikesByTrack(payload.states);
      }
    } catch {
      // Ignore transient network failures and keep previous like state.
    }
  }, [deviceId, normalizedIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const toggleLike = useCallback(
    async (trackId: string) => {
      if (!trackId || !deviceId) {
        return null;
      }

      try {
        const response = await fetch("/api/track-likes", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            trackId,
            deviceId,
          }),
        });

        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as { liked: boolean; count: number };
        setLikesByTrack((prev) => ({
          ...prev,
          [trackId]: {
            liked: payload.liked,
            count: payload.count,
          },
        }));

        return payload;
      } catch {
        return null;
      }
    },
    [deviceId],
  );

  return {
    likesByTrack,
    toggleLike,
    refresh,
  };
}
