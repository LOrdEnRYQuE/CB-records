"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { isPlayableAudioUrl } from "@/lib/audio";
import { useTrackComments } from "@/lib/social/use-track-comments";
import { useTrackLikes } from "@/lib/social/use-track-likes";

type PlayerAlbum = {
  id: string;
  title: string;
};

type PlayerTrack = {
  id: string;
  title: string;
  albumId: string;
  albumTitle: string;
  trackNumber: number | null;
  audioUrl: string | null;
  audioSourceType?: "stream" | "external";
  streamUrl?: string | null;
  releaseUrl?: string | null;
};

type Props = {
  albums: PlayerAlbum[];
  tracks: PlayerTrack[];
  defaultAlbumId?: string;
};

type RepeatMode = "off" | "all" | "one";
type SourceTab = "playable" | "releases";
type QueuePreference = {
  order: string[];
  removed: string[];
};
const BUBBLE_SESSION_KEY = "atta_music_player_bubble_session_v1";
type BubbleSession = {
  scope?: string;
  sourceTab?: SourceTab;
  index?: number;
  isShuffle?: boolean;
  repeatMode?: RepeatMode;
  volume?: number;
  isMuted?: boolean;
  queuePrefs?: Record<string, QueuePreference>;
};

function streamUrlOf(track: PlayerTrack) {
  if (track.streamUrl) {
    return track.streamUrl;
  }
  return isPlayableAudioUrl(track.audioUrl) ? track.audioUrl : null;
}

function releaseUrlOf(track: PlayerTrack) {
  if (track.releaseUrl) {
    return track.releaseUrl;
  }
  return track.audioUrl && !isPlayableAudioUrl(track.audioUrl) ? track.audioUrl : null;
}

function readBubbleSession(): BubbleSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BUBBLE_SESSION_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as BubbleSession;
  } catch {
    return null;
  }
}

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0:00";
  }

  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
}

export function MusicPlayerBubble({ albums, tracks, defaultAlbumId }: Props) {
  const initialScope =
    defaultAlbumId && albums.some((album) => album.id === defaultAlbumId) ? defaultAlbumId : "all";
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<string>(initialScope);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [sourceTab, setSourceTab] = useState<SourceTab>("playable");
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("all");
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [queueSearch, setQueueSearch] = useState("");
  const [queuePrefs, setQueuePrefs] = useState<Record<string, QueuePreference>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);
  const indexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const { likesByTrack, toggleLike } = useTrackLikes(tracks.map((track) => track.id));
  const { addComment: addTrackComment, updateComment, deleteComment, getComments } = useTrackComments(
    tracks.map((track) => track.id),
  );

  const playableCount = useMemo(
    () =>
      tracks
        .filter((track) => (scope === "all" ? true : track.albumId === scope))
        .filter((track) => Boolean(streamUrlOf(track))).length,
    [scope, tracks],
  );
  const releasesCount = useMemo(
    () =>
      tracks
        .filter((track) => (scope === "all" ? true : track.albumId === scope))
        .filter((track) => Boolean(releaseUrlOf(track))).length,
    [scope, tracks],
  );
  const activeSourceTab =
    sourceTab === "playable" && playableCount === 0 && releasesCount > 0
      ? "releases"
      : sourceTab === "releases" && releasesCount === 0 && playableCount > 0
        ? "playable"
        : sourceTab;

  const queueKey = `${scope}:${activeSourceTab}`;
  const baseQueue = useMemo(
    () =>
      tracks.filter((track) => {
        const hasSource =
          activeSourceTab === "playable" ? Boolean(streamUrlOf(track)) : Boolean(releaseUrlOf(track));
        if (!hasSource) {
          return false;
        }
        return scope === "all" ? true : track.albumId === scope;
      }),
    [activeSourceTab, scope, tracks],
  );
  const queuePreference = queuePrefs[queueKey] ?? { order: [], removed: [] };
  const queue = useMemo(() => {
    const byId = new Map(baseQueue.map((track) => [track.id, track]));
    const ordered = queuePreference.order.map((id) => byId.get(id)).filter((track): track is PlayerTrack => Boolean(track));
    const seen = new Set(ordered.map((track) => track.id));
    const remaining = baseQueue.filter((track) => !seen.has(track.id));
    const removed = new Set(queuePreference.removed);
    return [...ordered, ...remaining].filter((track) => !removed.has(track.id));
  }, [baseQueue, queuePreference.order, queuePreference.removed]);
  const visibleQueue = useMemo(() => {
    if (!queueSearch.trim()) {
      return queue.map((track, queueIndex) => ({ track, queueIndex }));
    }
    const needle = queueSearch.trim().toLowerCase();
    return queue
      .map((track, queueIndex) => ({ track, queueIndex }))
      .filter(({ track }) => `${track.title} ${track.albumTitle}`.toLowerCase().includes(needle));
  }, [queue, queueSearch]);

  const safeIndex = queue.length ? Math.min(index, queue.length - 1) : 0;
  const current = queue[safeIndex] ?? null;
  const currentPlayableUrl = current ? streamUrlOf(current) : null;
  const currentReleaseUrl = current ? releaseUrlOf(current) : null;

  useEffect(() => {
    if (!queue.length) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      indexRef.current = 0;
      return;
    }

    indexRef.current = safeIndex;
  }, [queue.length, safeIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentPlayableUrl) {
      return;
    }

    audio.src = currentPlayableUrl;
    audio.load();

    if (isPlayingRef.current) {
      void audio.play().catch(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setPlaybackError("Playback blocked or unsupported format.");
      });
    }
  }, [currentPlayableUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = volume / 100;
    audio.muted = isMuted;
  }, [isMuted, volume]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      BUBBLE_SESSION_KEY,
      JSON.stringify({
        scope,
        sourceTab,
        index: safeIndex,
        isShuffle,
        repeatMode,
        volume,
        isMuted,
        queuePrefs,
      }),
    );
  }, [index, isMuted, isShuffle, queuePrefs, repeatMode, safeIndex, scope, sourceTab, volume]);

  function cycleRepeatMode() {
    setRepeatMode((prev) => {
      if (prev === "off") {
        return "all";
      }
      if (prev === "all") {
        return "one";
      }
      return "off";
    });
  }

  function randomIndex(exclude: number) {
    if (queue.length <= 1) {
      return 0;
    }

    let next = exclude;
    while (next === exclude) {
      next = Math.floor(Math.random() * queue.length);
    }
    return next;
  }

  function nextTrack(automatic = false) {
    if (!queue.length) {
      return;
    }

    if (isShuffle && queue.length > 1) {
      setIndex(randomIndex(indexRef.current));
      setCurrentTime(0);
      return;
    }

    const atEnd = indexRef.current >= queue.length - 1;
    if (atEnd) {
      if (automatic && repeatMode === "off") {
        setIsPlaying(false);
        return;
      }
      setIndex(0);
      setCurrentTime(0);
      return;
    }

    setIndex((prev) => prev + 1);
    setCurrentTime(0);
  }

  function prevTrack() {
    if (!queue.length) {
      return;
    }

    if (isShuffle && queue.length > 1) {
      setIndex(randomIndex(indexRef.current));
      setCurrentTime(0);
      return;
    }

    const atStart = indexRef.current <= 0;
    if (atStart) {
      setIndex(queue.length - 1);
      setCurrentTime(0);
      return;
    }

    setIndex((prev) => prev - 1);
    setCurrentTime(0);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!current) {
      return;
    }

    if (!currentPlayableUrl && currentReleaseUrl) {
      window.open(currentReleaseUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (!audio || !currentPlayableUrl) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    setPlaybackError(null);
    void audio.play().catch(() => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setPlaybackError("Playback blocked or unsupported format.");
    });
    isPlayingRef.current = true;
  }

  function restoreSession() {
    const session = readBubbleSession();
    if (!session) {
      return;
    }

    if (session.scope && (session.scope === "all" || albums.some((album) => album.id === session.scope))) {
      setScope(session.scope);
    }
    if (session.sourceTab) {
      setSourceTab(session.sourceTab);
    }
    if (typeof session.index === "number" && Number.isFinite(session.index) && session.index >= 0) {
      setIndex(Math.floor(session.index));
    }
    if (typeof session.isShuffle === "boolean") {
      setIsShuffle(session.isShuffle);
    }
    if (session.repeatMode) {
      setRepeatMode(session.repeatMode);
    }
    if (typeof session.volume === "number" && Number.isFinite(session.volume)) {
      setVolume(Math.max(0, Math.min(100, Math.floor(session.volume))));
    }
    if (typeof session.isMuted === "boolean") {
      setIsMuted(session.isMuted);
    }
    if (session.queuePrefs && typeof session.queuePrefs === "object") {
      setQueuePrefs(session.queuePrefs);
    }
    setPlaybackError(null);
  }

  function updateQueuePreference(
    update: (current: QueuePreference) => QueuePreference,
  ) {
    setQueuePrefs((prev) => {
      const current = prev[queueKey] ?? { order: [], removed: [] };
      return {
        ...prev,
        [queueKey]: update(current),
      };
    });
  }

  function removeQueueTrack(trackId: string) {
    updateQueuePreference((current) => {
      const removed = Array.from(new Set([...current.removed, trackId]));
      const order = current.order.filter((id) => id !== trackId);
      return { order, removed };
    });
    if (current?.id === trackId) {
      setCurrentTime(0);
    }
  }

  function moveQueueTrack(trackId: string, direction: -1 | 1) {
    updateQueuePreference((current) => {
      const removedSet = new Set(current.removed);
      const seedIds = [
        ...current.order.filter((id) => !removedSet.has(id)),
        ...baseQueue.map((track) => track.id).filter((id) => !current.order.includes(id) && !removedSet.has(id)),
      ];
      const currentIndex = seedIds.indexOf(trackId);
      if (currentIndex < 0) {
        return current;
      }
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= seedIds.length) {
        return current;
      }
      const nextIds = [...seedIds];
      const [item] = nextIds.splice(currentIndex, 1);
      nextIds.splice(nextIndex, 0, item);
      return {
        order: nextIds,
        removed: current.removed,
      };
    });
  }

  function resetQueueCustomizations() {
    updateQueuePreference(() => ({ order: [], removed: [] }));
  }

  async function shareCurrentTrack() {
    if (!current) {
      return;
    }

    const shareUrl = currentPlayableUrl || currentReleaseUrl || `${window.location.origin}/music`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setInteractionMessage("Track link copied.");
      setTimeout(() => setInteractionMessage(null), 1800);
    } catch {
      setInteractionMessage("Could not copy link. Try again.");
      setTimeout(() => setInteractionMessage(null), 1800);
    }
  }

  function addComment() {
    if (!current) {
      return;
    }
    const text = commentDraft.trim();
    if (!text) {
      return;
    }
    addTrackComment(current.id, text);
    setCommentDraft("");
  }

  function startEditComment(commentId: string, text: string) {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
  }

  function saveEditedComment() {
    if (!current || !editingCommentId) {
      return;
    }
    const text = editingCommentText.trim();
    if (!text) {
      return;
    }
    updateComment(current.id, editingCommentId, text);
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  function removeComment(commentId: string) {
    if (!current) {
      return;
    }
    deleteComment(current.id, commentId);
    if (editingCommentId === commentId) {
      cancelEditComment();
    }
  }

  function formatCommentTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const repeatLabel = repeatMode === "off" ? "Repeat Off" : repeatMode === "all" ? "Repeat All" : "Repeat One";
  const isCurrentLiked = current ? Boolean(likesByTrack[current.id]?.liked) : false;
  const currentLikeCount = current ? likesByTrack[current.id]?.count ?? 0 : 0;
  const currentComments = current ? getComments(current.id) : [];

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        triggerButtonRef.current?.focus();
      }
      wasOpenRef.current = false;
      return;
    }
    wasOpenRef.current = true;

    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const getFocusable = () => {
      const container = panelRef.current;
      if (!container) {
        return [] as HTMLElement[];
      }
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    };

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusable();
      if (!focusable.length) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="ATTA bubble player"
          className="max-h-[78vh] w-[calc(100vw-1.25rem)] max-w-[360px] overflow-auto rounded-2xl border border-white/15 bg-black/90 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.45)] backdrop-blur"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-gold-500/40">
                <Image src="/LOGO Cartieru` Bradet.png" alt="ATTA" fill className="object-contain p-0.5" />
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold-400">ATTA Player</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-zinc-300"
            >
              Close
            </button>
          </div>

          <select
            className="mb-3 w-full rounded-md border border-white/20 bg-zinc-900 px-2 py-2 text-sm"
            value={scope}
            onChange={(event) => {
              setScope(event.target.value);
              setIndex(0);
              setCurrentTime(0);
              setDuration(0);
              setQueueSearch("");
            }}
          >
            <option value="all">All Albums Playlist</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.title}
              </option>
            ))}
          </select>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex overflow-hidden rounded-lg border border-white/20 text-[11px]">
              <button
                type="button"
                onClick={() => setSourceTab("playable")}
                className={`px-2.5 py-1.5 ${activeSourceTab === "playable" ? "bg-gold-500/20 text-gold-200" : "bg-black/30 text-zinc-300"}`}
              >
                Stream
              </button>
              <button
                type="button"
                onClick={() => setSourceTab("releases")}
                className={`px-2.5 py-1.5 ${activeSourceTab === "releases" ? "bg-gold-500/20 text-gold-200" : "bg-black/30 text-zinc-300"}`}
              >
                External
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">{playableCount} stream · {releasesCount} ext</p>
          </div>
          <button
            type="button"
            onClick={restoreSession}
            className="mb-3 rounded border border-white/20 px-2 py-1 text-[11px] text-zinc-200"
          >
            Restore Session
          </button>

          <p className="text-sm font-semibold text-white">{current?.title ?? "No track selected"}</p>
          <p className="text-xs text-zinc-400">{current?.albumTitle ?? ""}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!current}
              onClick={() => current && void toggleLike(current.id)}
              className={`rounded border px-2 py-1 text-[11px] ${
                isCurrentLiked ? "border-gold-500/70 text-gold-300" : "border-white/20 text-zinc-300"
              } disabled:opacity-40`}
            >
              {isCurrentLiked ? "Liked" : "Like"} {currentLikeCount}
            </button>
            <button
              type="button"
              disabled={!current}
              onClick={() => void shareCurrentTrack()}
              className="rounded border border-white/20 px-2 py-1 text-[11px] text-zinc-300 disabled:opacity-40"
            >
              Share
            </button>
            {interactionMessage ? <p className="text-[11px] text-zinc-400">{interactionMessage}</p> : null}
          </div>

          <div className="mt-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              disabled={!current}
              onChange={(event) => {
                const audio = audioRef.current;
                const nextTime = Number(event.target.value);
                setCurrentTime(nextTime);
                if (audio) {
                  audio.currentTime = nextTime;
                }
              }}
              className="w-full accent-[#d4af37]"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          {playbackError ? <p className="mt-2 text-[11px] text-red-300">{playbackError}</p> : null}

          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={prevTrack} className="btn-outline rounded-md px-3 py-1 text-xs">
              Prev
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={!current}
              className="btn-gold rounded-md px-3 py-1 text-xs disabled:opacity-40"
            >
              {current && !currentPlayableUrl ? "Open Link" : isPlaying ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={() => nextTrack(false)} className="btn-outline rounded-md px-3 py-1 text-xs">
              Next
            </button>
            <button
              type="button"
              onClick={() => setIsShuffle((prev) => !prev)}
              className={`rounded-md border px-2 py-1 text-xs ${isShuffle ? "border-gold-400/70 text-gold-300" : "border-white/20 text-zinc-300"}`}
            >
              Shuffle
            </button>
            <button
              type="button"
              onClick={cycleRepeatMode}
              className={`rounded-md border px-2 py-1 text-xs ${repeatMode !== "off" ? "border-gold-400/70 text-gold-300" : "border-white/20 text-zinc-300"}`}
              title={repeatLabel}
            >
              {repeatMode === "one" ? "R1" : repeatMode === "all" ? "RA" : "RO"}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className="rounded border border-white/20 px-2 py-1 text-zinc-300"
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="w-full accent-[#d4af37]"
            />
            <span className="w-10 text-right text-zinc-300">{volume}%</span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder={current ? "Add comment" : "Select a track to comment"}
                disabled={!current}
                className="w-full rounded border border-white/20 bg-black/30 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
              />
              <button
                type="button"
                onClick={addComment}
                disabled={!current || !commentDraft.trim()}
                className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
              >
                Comment
              </button>
            </div>
            {currentComments.length ? (
              <div className="max-h-20 space-y-1 overflow-auto pr-1">
                {currentComments.slice(-3).map((comment) => (
                  <div key={comment.id} className="rounded border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-zinc-300">
                    {editingCommentId === comment.id ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={editingCommentText}
                          onChange={(event) => setEditingCommentText(event.target.value)}
                          className="w-full rounded border border-white/20 bg-black/30 px-2 py-1 text-[11px] text-zinc-200"
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={saveEditedComment}
                            disabled={!editingCommentText.trim()}
                            className="rounded border border-gold-500/50 px-1.5 py-0.5 text-[10px] text-gold-300 disabled:opacity-40"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditComment}
                            className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p>{comment.text}</p>
                          <p className="text-[10px] text-zinc-500">{formatCommentTime(comment.createdAt)}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEditComment(comment.id, comment.text)}
                            className="rounded border border-white/20 px-1 py-0.5 text-[10px] text-zinc-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeComment(comment.id)}
                            className="rounded border border-red-400/40 px-1 py-0.5 text-[10px] text-red-200"
                          >
                            Del
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search queue"
                className="w-full rounded border border-white/20 bg-black/30 px-2 py-1 text-xs text-zinc-200"
              />
              <button
                type="button"
                onClick={resetQueueCustomizations}
                className="rounded border border-white/20 px-2 py-1 text-[10px] text-zinc-300"
              >
                Reset
              </button>
            </div>

            <div className="max-h-40 space-y-1 overflow-auto pr-1">
              {visibleQueue.length ? (
                visibleQueue.map(({ track, queueIndex }) => {
                  const isActive = queueIndex === safeIndex;
                  const canMoveUp = queueIndex > 0;
                  const canMoveDown = queueIndex < queue.length - 1;

                  return (
                    <div
                      key={track.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setIndex(queueIndex);
                        setCurrentTime(0);
                        setPlaybackError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setIndex(queueIndex);
                          setCurrentTime(0);
                          setPlaybackError(null);
                        }
                      }}
                      className={`w-full cursor-pointer rounded border px-2 py-1 text-left text-xs ${
                        isActive
                          ? "border-gold-500/70 bg-gold-500/10 text-white"
                          : "border-white/10 bg-black/30 text-zinc-300"
                      }`}
                    >
                      <p>
                        {track.trackNumber ? `${track.trackNumber}. ` : ""}
                        {track.title}
                        <span className="ml-1 text-[10px] text-zinc-500">
                          {streamUrlOf(track) ? "· Stream" : "· External"}
                        </span>
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            moveQueueTrack(track.id, -1);
                          }}
                          disabled={!canMoveUp}
                          className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-zinc-300 disabled:opacity-40"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            moveQueueTrack(track.id, 1);
                          }}
                          disabled={!canMoveDown}
                          className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-zinc-300 disabled:opacity-40"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeQueueTrack(track.id);
                          }}
                          className="rounded border border-red-400/40 px-1.5 py-0.5 text-[10px] text-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[11px] text-zinc-500">No tracks in this queue view. Reset filters or source tab.</p>
              )}
            </div>
          </div>

          <p className="mt-2 text-[11px] text-zinc-500">{queue.length} tracks in queue</p>

          <audio
            ref={audioRef}
            preload="metadata"
            playsInline
            onEnded={() => {
              if (repeatMode === "one") {
                const audio = audioRef.current;
                if (!audio) {
                  return;
                }
                audio.currentTime = 0;
                void audio.play().catch(() => {
                  setIsPlaying(false);
                  isPlayingRef.current = false;
                  setPlaybackError("Playback blocked or unsupported format.");
                });
                return;
              }

              nextTrack(true);
            }}
            onPause={() => {
              setIsPlaying(false);
              isPlayingRef.current = false;
            }}
            onPlay={() => {
              setIsPlaying(true);
              isPlayingRef.current = true;
              setPlaybackError(null);
            }}
            onError={() => {
              setIsPlaying(false);
              isPlayingRef.current = false;
              setPlaybackError("Audio file failed to load. Check URL format or CORS.");
            }}
            onTimeUpdate={(event) => {
              setCurrentTime(event.currentTarget.currentTime || 0);
            }}
            onLoadedMetadata={(event) => {
              setDuration(event.currentTarget.duration || 0);
            }}
          />
        </div>
      ) : (
        <button
          ref={triggerButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-gold-500/50 bg-black/85 px-3 py-2 text-xs uppercase tracking-[0.14em] text-gold-300 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        >
          <span className="relative h-6 w-6 overflow-hidden rounded-full border border-gold-500/40">
            <Image src="/LOGO Cartieru` Bradet.png" alt="ATTA" fill className="object-contain p-0.5" />
          </span>
          ATTA Player
        </button>
      )}
    </div>
  );
}
