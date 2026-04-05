"use client";

import { useEffect, useMemo, useState } from "react";

const TRACK_COMMENTS_KEY = "atta_track_comments_v1";
const MAX_COMMENTS_PER_TRACK = 30;

export type TrackComment = {
  id: string;
  text: string;
  createdAt: string;
};

function readTrackComments() {
  if (typeof window === "undefined") {
    return {} as Record<string, TrackComment[]>;
  }

  try {
    const raw = window.localStorage.getItem(TRACK_COMMENTS_KEY);
    if (!raw) {
      return {} as Record<string, TrackComment[]>;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {} as Record<string, TrackComment[]>;
    }
    const next: Record<string, TrackComment[]> = {};
    for (const [trackId, comments] of Object.entries(parsed)) {
      if (!Array.isArray(comments)) {
        continue;
      }

      next[trackId] = comments
        .map((value, index) => {
          if (typeof value === "string") {
            const text = value.trim();
            if (!text) {
              return null;
            }
            return {
              id: `legacy-${trackId}-${index}`,
              text,
              createdAt: new Date().toISOString(),
            } as TrackComment;
          }

          if (!value || typeof value !== "object") {
            return null;
          }

          const candidate = value as Partial<TrackComment>;
          const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
          if (!text) {
            return null;
          }

          return {
            id: typeof candidate.id === "string" && candidate.id ? candidate.id : crypto.randomUUID(),
            text,
            createdAt:
              typeof candidate.createdAt === "string" && candidate.createdAt
                ? candidate.createdAt
                : new Date().toISOString(),
          } as TrackComment;
        })
        .filter((item): item is TrackComment => Boolean(item))
        .slice(-MAX_COMMENTS_PER_TRACK);
    }
    return next;
  } catch {
    return {} as Record<string, TrackComment[]>;
  }
}

export function useTrackComments(trackIds: string[]) {
  const [commentsByTrack, setCommentsByTrack] = useState<Record<string, TrackComment[]>>(() => readTrackComments());
  const trackIdSet = useMemo(() => new Set(trackIds), [trackIds]);
  const totalCount = useMemo(
    () => Object.values(commentsByTrack).reduce((acc, comments) => acc + comments.length, 0),
    [commentsByTrack],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(TRACK_COMMENTS_KEY, JSON.stringify(commentsByTrack));
  }, [commentsByTrack]);

  function addComment(trackId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setCommentsByTrack((prev) => {
      const existing = prev[trackId] ?? [];
      return {
        ...prev,
        [trackId]: [
          ...existing,
          {
            id: crypto.randomUUID(),
            text: trimmed,
            createdAt: new Date().toISOString(),
          },
        ].slice(-MAX_COMMENTS_PER_TRACK),
      };
    });
  }

  function updateComment(trackId: string, commentId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    setCommentsByTrack((prev) => {
      const existing = prev[trackId] ?? [];
      return {
        ...prev,
        [trackId]: existing.map((comment) => (comment.id === commentId ? { ...comment, text: trimmed } : comment)),
      };
    });
  }

  function deleteComment(trackId: string, commentId: string) {
    setCommentsByTrack((prev) => {
      const existing = prev[trackId] ?? [];
      return {
        ...prev,
        [trackId]: existing.filter((comment) => comment.id !== commentId),
      };
    });
  }

  function clearComments(trackId: string) {
    setCommentsByTrack((prev) => {
      if (!prev[trackId]?.length) {
        return prev;
      }
      return {
        ...prev,
        [trackId]: [],
      };
    });
  }

  function getComments(trackId: string) {
    if (!trackIdSet.has(trackId)) {
      return [];
    }
    return commentsByTrack[trackId] ?? [];
  }

  function getCount(trackId: string) {
    return getComments(trackId).length;
  }

  return {
    commentsByTrack,
    addComment,
    updateComment,
    deleteComment,
    clearComments,
    getComments,
    getCount,
    totalCount,
  };
}
