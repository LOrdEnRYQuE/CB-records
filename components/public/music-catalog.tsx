"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { isPlayableAudioUrl } from "@/lib/audio";
import { useTrackComments } from "@/lib/social/use-track-comments";
import { useTrackLikes } from "@/lib/social/use-track-likes";

type PlayerAlbum = {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
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
  tracks: PlayerTrack[];
  albums: PlayerAlbum[];
};

type SourceFilter = "all" | "stream" | "external";

const FAVORITES_KEY = "atta_music_catalog_favorites_v1";

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

function readFavoriteIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return [] as string[];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [] as string[];
  }
}

function writeFavoriteIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export function MusicCatalog({ tracks, albums }: Props) {
  const [q, setQ] = useState("");
  const [albumId, setAlbumId] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sortBy, setSortBy] = useState<"title" | "album" | "track">("track");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<string[]>(() => readFavoriteIds());
  const [message, setMessage] = useState<string | null>(null);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewVolume, setPreviewVolume] = useState(0.9);
  const [previewRate, setPreviewRate] = useState(1);
  const [showUpNext, setShowUpNext] = useState(false);
  const [activeCommentTrackId, setActiveCommentTrackId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const favoriteSet = useMemo(() => new Set(favoriteTrackIds), [favoriteTrackIds]);
  const { likesByTrack, toggleLike } = useTrackLikes(tracks.map((track) => track.id));
  const { addComment, updateComment, deleteComment, getComments, getCount } = useTrackComments(
    tracks.map((track) => track.id),
  );

  const albumStats = useMemo(() => {
    const map = new Map<string, { total: number; stream: number }>();
    for (const track of tracks) {
      const current = map.get(track.albumId) ?? { total: 0, stream: 0 };
      current.total += 1;
      if (streamUrlOf(track)) {
        current.stream += 1;
      }
      map.set(track.albumId, current);
    }
    return map;
  }, [tracks]);

  const filtered = useMemo(() => {
    let items = [...tracks];

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      items = items.filter((track) => `${track.title} ${track.albumTitle}`.toLowerCase().includes(needle));
    }

    if (albumId !== "all") {
      items = items.filter((track) => track.albumId === albumId);
    }

    if (onlyFavorites) {
      items = items.filter((track) => favoriteSet.has(track.id));
    }

    if (sourceFilter !== "all") {
      items = items.filter((track) => {
        const isStream = Boolean(streamUrlOf(track));
        return sourceFilter === "stream" ? isStream : !isStream;
      });
    }

    if (sortBy === "title") {
      items.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "album") {
      items.sort(
        (a, b) =>
          a.albumTitle.localeCompare(b.albumTitle) || (a.trackNumber ?? Number.MAX_SAFE_INTEGER) - (b.trackNumber ?? Number.MAX_SAFE_INTEGER),
      );
    } else {
      items.sort(
        (a, b) =>
          a.albumTitle.localeCompare(b.albumTitle) || (a.trackNumber ?? Number.MAX_SAFE_INTEGER) - (b.trackNumber ?? Number.MAX_SAFE_INTEGER),
      );
    }

    return items;
  }, [albumId, favoriteSet, onlyFavorites, q, sortBy, sourceFilter, tracks]);

  const streamCount = filtered.filter((track) => Boolean(streamUrlOf(track))).length;
  const externalCount = filtered.length - streamCount;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize;
  const pageItems = filtered.slice(from, to);
  const previewQueue = useMemo(
    () =>
      filtered
        .map((track) => ({ track, streamUrl: streamUrlOf(track) }))
        .filter((item): item is { track: PlayerTrack; streamUrl: string } => Boolean(item.streamUrl)),
    [filtered],
  );
  const requestedPreviewIndex = previewTrackId
    ? previewQueue.findIndex((item) => item.track.id === previewTrackId)
    : -1;
  const safePreviewIndex =
    previewQueue.length === 0 ? -1 : requestedPreviewIndex >= 0 ? requestedPreviewIndex : 0;
  const currentPreview = safePreviewIndex >= 0 ? previewQueue[safePreviewIndex] : null;

  function toggleFavorite(trackId: string) {
    setFavoriteTrackIds((prev) => {
      const next = prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId];
      writeFavoriteIds(next);
      return next;
    });
  }

  async function shareTrack(track: PlayerTrack) {
    const url = streamUrlOf(track) || releaseUrlOf(track) || `${window.location.origin}/music`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage(`Copied link for ${track.title}`);
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage("Could not copy link. Try again.");
      setTimeout(() => setMessage(null), 2000);
    }
  }

  function submitComment(trackId: string) {
    const text = commentDraft.trim();
    if (!text) {
      return;
    }
    addComment(trackId, text);
    setCommentDraft("");
  }

  function startEditComment(commentId: string, text: string) {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
  }

  function saveEditedComment(trackId: string) {
    if (!editingCommentId) {
      return;
    }
    const text = editingCommentText.trim();
    if (!text) {
      return;
    }
    updateComment(trackId, editingCommentId, text);
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  function removeComment(trackId: string, commentId: string) {
    deleteComment(trackId, commentId);
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

  function resetFilters() {
    setQ("");
    setAlbumId("all");
    setSourceFilter("all");
    setSortBy("track");
    setOnlyFavorites(false);
    setPage(1);
  }

  function formatTime(value: number) {
    if (!Number.isFinite(value) || value < 0) {
      return "0:00";
    }
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function playPreview(trackId: string) {
    setPreviewTrackId(trackId);
    const item = previewQueue.find((entry) => entry.track.id === trackId);
    const audio = previewAudioRef.current;
    if (!item || !audio) {
      return;
    }
    audio.src = item.streamUrl;
    audio.load();
    void audio.play().catch(() => {
      setIsPreviewPlaying(false);
    });
  }

  function togglePreviewPlay() {
    const audio = previewAudioRef.current;
    if (!audio || !currentPreview) {
      return;
    }

    if (!previewTrackId) {
      playPreview(currentPreview.track.id);
      return;
    }

    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
      return;
    }

    void audio.play().catch(() => {
      setIsPreviewPlaying(false);
    });
  }

  function stepPreview(step: number) {
    if (!previewQueue.length) {
      return;
    }
    const base = safePreviewIndex >= 0 ? safePreviewIndex : 0;
    const next =
      step > 0 ? (base + 1) % previewQueue.length : (base - 1 + previewQueue.length) % previewQueue.length;
    playPreview(previewQueue[next].track.id);
  }

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = previewVolume;
  }, [previewVolume]);

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) {
      return;
    }
    audio.playbackRate = previewRate;
  }, [previewRate]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }
      if (!currentPreview) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        togglePreviewPlay();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        stepPreview(1);
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        stepPreview(-1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-400">Discover</p>
          <h2 className="text-2xl font-bold">Enhanced Track Catalog</h2>
          <p className="text-sm text-zinc-400">Filter fast, preview tracks, and save favorites.</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
            <p className="text-zinc-400">Tracks</p>
            <p className="font-semibold text-white">{filtered.length}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
            <p className="text-zinc-400">Stream</p>
            <p className="font-semibold text-emerald-300">{streamCount}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
            <p className="text-zinc-400">External</p>
            <p className="font-semibold text-amber-300">{externalCount}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
            <p className="text-zinc-400">Favorites</p>
            <p className="font-semibold text-gold-300">{favoriteTrackIds.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-400">Quick Albums</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => {
              setAlbumId("all");
              setPage(1);
            }}
            className={`rounded-md border px-2 py-2 text-left text-xs ${
              albumId === "all" ? "border-gold-500/60 text-gold-200" : "border-white/15 text-zinc-300"
            }`}
          >
            <p className="font-semibold">All Albums</p>
            <p className="text-zinc-500">{tracks.length} tracks</p>
          </button>
          {albums.map((album) => {
            const stats = albumStats.get(album.id) ?? { total: 0, stream: 0 };
            return (
              <button
                key={album.id}
                type="button"
                onClick={() => {
                  setAlbumId(album.id);
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left ${
                  albumId === album.id ? "border-gold-500/60 text-gold-200" : "border-white/15 text-zinc-300"
                }`}
              >
                <div className="relative h-9 w-9 overflow-hidden rounded border border-white/10">
                  <Image src={album.coverImageUrl || "/Album-cover-CB.png"} alt={album.title} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{album.title}</p>
                  <p className="text-[11px] text-zinc-500">{stats.stream}/{stats.total} stream</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        <input
          type="text"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          placeholder="Search tracks or albums"
          className="rounded-md border border-white/20 bg-zinc-900 px-3 py-2 text-sm md:col-span-2"
        />
        <select
          value={sourceFilter}
          onChange={(event) => {
            setSourceFilter(event.target.value as SourceFilter);
            setPage(1);
          }}
          className="rounded-md border border-white/20 bg-zinc-900 px-3 py-2 text-sm"
        >
          <option value="all">All sources</option>
          <option value="stream">Stream only</option>
          <option value="external">External only</option>
        </select>
        <select
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value as "title" | "album" | "track");
            setPage(1);
          }}
          className="rounded-md border border-white/20 bg-zinc-900 px-3 py-2 text-sm"
        >
          <option value="track">Sort: Track Number</option>
          <option value="title">Sort: Title</option>
          <option value="album">Sort: Album</option>
        </select>
        <select
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
          className="rounded-md border border-white/20 bg-zinc-900 px-3 py-2 text-sm"
        >
          <option value={8}>8 / page</option>
          <option value={12}>12 / page</option>
          <option value={20}>20 / page</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setOnlyFavorites((prev) => !prev);
            setPage(1);
          }}
          className={`rounded-md border px-3 py-2 text-sm ${
            onlyFavorites ? "border-gold-500/70 text-gold-300" : "border-white/20 text-zinc-200"
          }`}
        >
          {onlyFavorites ? "Favorites Only" : "All Tracks"}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={resetFilters} className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-300">
          Reset Filters
        </button>
        <p className="text-xs text-zinc-400">
          Page {safePage} / {totalPages}
        </p>
      </div>

      {message ? <p className="text-xs text-zinc-300">{message}</p> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {pageItems.length ? (
          pageItems.map((track) => {
            const streamUrl = streamUrlOf(track);
            const externalUrl = releaseUrlOf(track);
            const isFavorite = favoriteSet.has(track.id);
            const albumSlug = albums.find((album) => album.id === track.albumId)?.slug;

            return (
              <article key={track.id} className="rounded-xl border border-white/10 bg-black/35 p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      {track.trackNumber ? `${track.trackNumber}. ` : ""}
                      {track.title}
                    </p>
                    <p className="text-xs text-zinc-400">{track.albumTitle}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      streamUrl ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {streamUrl ? "Stream" : "External"}
                  </span>
                </div>

                {streamUrl ? <audio controls preload="none" src={streamUrl} className="w-full" /> : null}

                <div className="mt-2 flex flex-wrap gap-2">
                  {externalUrl ? (
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200"
                    >
                      Open Release
                    </a>
                  ) : null}
                  {albumSlug ? (
                    <Link
                      href={`/music/${albumSlug}`}
                      className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200"
                    >
                      Album Page
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(track.id)}
                    className={`rounded border px-2 py-1 text-xs ${
                      isFavorite ? "border-gold-500/70 text-gold-300" : "border-white/20 text-zinc-200"
                    }`}
                  >
                    {isFavorite ? "Favorited" : "Favorite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleLike(track.id)}
                    className={`rounded border px-2 py-1 text-xs ${
                      likesByTrack[track.id]?.liked ? "border-gold-500/70 text-gold-300" : "border-white/20 text-zinc-200"
                    }`}
                  >
                    Like {likesByTrack[track.id]?.count ?? 0}
                  </button>
                  <button
                    type="button"
                    onClick={() => void shareTrack(track)}
                    className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCommentTrackId((prev) => (prev === track.id ? null : track.id));
                      setCommentDraft("");
                      setEditingCommentId(null);
                      setEditingCommentText("");
                    }}
                    className={`rounded border px-2 py-1 text-xs ${
                      activeCommentTrackId === track.id ? "border-gold-500/70 text-gold-300" : "border-white/20 text-zinc-200"
                    }`}
                  >
                    Comment {getCount(track.id)}
                  </button>
                  {streamUrl ? (
                    <button
                      type="button"
                      onClick={() => playPreview(track.id)}
                      className="rounded border border-gold-500/40 px-2 py-1 text-xs text-gold-200"
                    >
                      Preview
                    </button>
                  ) : null}
                </div>
                {activeCommentTrackId === track.id ? (
                  <div className="mt-2 rounded-md border border-white/10 bg-black/25 p-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentDraft}
                        onChange={(event) => setCommentDraft(event.target.value)}
                        placeholder="Add a comment"
                        className="w-full rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-zinc-200"
                      />
                      <button
                        type="button"
                        onClick={() => submitComment(track.id)}
                        disabled={!commentDraft.trim()}
                        className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
                      >
                        Send
                      </button>
                    </div>
                    <div className="mt-2 space-y-1">
                      {getComments(track.id).length ? (
                        getComments(track.id).slice(-3).map((comment) => (
                          <div key={comment.id} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-zinc-300">
                            {editingCommentId === comment.id ? (
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={editingCommentText}
                                  onChange={(event) => setEditingCommentText(event.target.value)}
                                  className="w-full rounded border border-white/20 bg-black/35 px-2 py-1 text-[11px] text-zinc-200"
                                />
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => saveEditedComment(track.id)}
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
                                    onClick={() => removeComment(track.id, comment.id)}
                                    className="rounded border border-red-400/40 px-1 py-0.5 text-[10px] text-red-200"
                                  >
                                    Del
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-zinc-500">No comments yet.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-md border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
            No tracks found for current filters. Reset filters or switch source.
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      {currentPreview ? (
        <div className="sticky bottom-3 z-30 rounded-xl border border-white/15 bg-black/85 p-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {currentPreview.track.trackNumber ? `${currentPreview.track.trackNumber}. ` : ""}
                {currentPreview.track.title}
              </p>
              <p className="truncate text-xs text-zinc-400">{currentPreview.track.albumTitle} · Stream preview</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stepPreview(-1)}
                className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={togglePreviewPlay}
                className="rounded border border-gold-500/50 bg-gold-500/15 px-2 py-1 text-xs text-gold-200"
              >
                {isPreviewPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => stepPreview(1)}
                className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => setShowUpNext((prev) => !prev)}
                className={`rounded border px-2 py-1 text-xs ${
                  showUpNext ? "border-gold-500/60 text-gold-300" : "border-white/20 text-zinc-200"
                }`}
              >
                Up Next
              </button>
            </div>
          </div>
          <div className="mt-2">
            <input
              type="range"
              min={0}
              max={previewDuration || 0}
              value={Math.min(previewTime, previewDuration || 0)}
              onChange={(event) => {
                const value = Number(event.target.value);
                setPreviewTime(value);
                if (previewAudioRef.current) {
                  previewAudioRef.current.currentTime = value;
                }
              }}
              className="w-full"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
              <span>{formatTime(previewTime)}</span>
              <span>{formatTime(previewDuration)}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
            <label className="flex items-center gap-1">
              <span>Volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={previewVolume}
                onChange={(event) => setPreviewVolume(Number(event.target.value))}
              />
            </label>
            <label className="flex items-center gap-1">
              <span>Speed</span>
              <select
                value={previewRate}
                onChange={(event) => setPreviewRate(Number(event.target.value))}
                className="rounded border border-white/20 bg-black/40 px-1 py-0.5 text-[11px] text-zinc-200"
              >
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
              </select>
            </label>
          </div>
          {showUpNext ? (
            <div className="mt-2 max-h-28 space-y-1 overflow-auto rounded border border-white/10 bg-black/30 p-2">
              {previewQueue.map((item, idx) => (
                <button
                  key={item.track.id}
                  type="button"
                  onClick={() => playPreview(item.track.id)}
                  className={`block w-full truncate rounded px-2 py-1 text-left text-[11px] ${
                    idx === safePreviewIndex
                      ? "border border-gold-500/60 bg-gold-500/10 text-gold-200"
                      : "border border-transparent text-zinc-300 hover:border-white/20"
                  }`}
                >
                  {item.track.trackNumber ? `${item.track.trackNumber}. ` : ""}
                  {item.track.title}
                </button>
              ))}
            </div>
          ) : null}
          <audio
            ref={previewAudioRef}
            preload="metadata"
            onTimeUpdate={(event) => setPreviewTime(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setPreviewDuration(event.currentTarget.duration || 0)}
            onPlay={() => setIsPreviewPlaying(true)}
            onPause={() => setIsPreviewPlaying(false)}
            onEnded={() => stepPreview(1)}
            onError={() => setIsPreviewPlaying(false)}
          />
        </div>
      ) : null}
    </section>
  );
}
