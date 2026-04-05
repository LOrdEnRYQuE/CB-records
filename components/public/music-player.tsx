"use client";

import Image from "next/image";
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
  albums: PlayerAlbum[];
  tracks: PlayerTrack[];
  defaultAlbumId?: string;
  title?: string;
};

type PlaylistMode = "all" | "album" | "queue" | "favorites";
type SourceTab = "playable" | "releases";
type RepeatMode = "off" | "all" | "one";
const PLAYER_SESSION_KEY = "atta_music_player_session_v1";
type PlayerSession = {
  playlistMode?: PlaylistMode;
  sourceTab?: SourceTab;
  selectedAlbumId?: string;
  customQueueIds?: string[];
  favoriteTrackIds?: string[];
  isShuffle?: boolean;
  repeatMode?: RepeatMode;
  playbackRate?: number;
  index?: number;
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const min = Math.floor(value / 60);
  const sec = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${min}:${sec}`;
}

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

function readPlayerSession(): PlayerSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PLAYER_SESSION_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}

export function MusicPlayer({ albums, tracks, defaultAlbumId, title = "ATTA Player" }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  const trackById = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks]);
  const initialAlbumId =
    defaultAlbumId && albums.some((album) => album.id === defaultAlbumId)
      ? defaultAlbumId
      : albums[0]?.id ?? "";

  const [selectedAlbumId, setSelectedAlbumId] = useState(initialAlbumId);
  const [playlistMode, setPlaylistMode] = useState<PlaylistMode>(defaultAlbumId ? "album" : "all");
  const [sourceTab, setSourceTab] = useState<SourceTab>("playable");
  const [customQueueIds, setCustomQueueIds] = useState<string[]>([]);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<string[]>([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("all");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [queueSearch, setQueueSearch] = useState("");
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const { likesByTrack, toggleLike } = useTrackLikes(tracks.map((track) => track.id));
  const { addComment, updateComment, deleteComment, getComments, getCount } = useTrackComments(tracks.map((track) => track.id));

  const baseTracks = useMemo(() => {
    if (playlistMode === "album") {
      return tracks.filter((track) => track.albumId === selectedAlbumId);
    }
    if (playlistMode === "queue") {
      return customQueueIds.map((id) => trackById.get(id)).filter((track): track is PlayerTrack => Boolean(track));
    }
    if (playlistMode === "favorites") {
      const favoriteSet = new Set(favoriteTrackIds);
      return tracks.filter((track) => favoriteSet.has(track.id));
    }
    return tracks;
  }, [customQueueIds, favoriteTrackIds, playlistMode, selectedAlbumId, trackById, tracks]);

  const playableCount = useMemo(
    () => baseTracks.filter((track) => Boolean(streamUrlOf(track))).length,
    [baseTracks],
  );
  const releasesCount = useMemo(
    () => baseTracks.filter((track) => Boolean(releaseUrlOf(track))).length,
    [baseTracks],
  );
  const activeSourceTab =
    sourceTab === "playable" && playableCount === 0 && releasesCount > 0
      ? "releases"
      : sourceTab === "releases" && releasesCount === 0 && playableCount > 0
        ? "playable"
        : sourceTab;

  const queue = useMemo(
    () =>
      baseTracks.filter((track) =>
        activeSourceTab === "playable" ? Boolean(streamUrlOf(track)) : Boolean(releaseUrlOf(track)),
      ),
    [activeSourceTab, baseTracks],
  );

  const safeIndex = queue.length ? Math.min(index, queue.length - 1) : 0;
  const current = queue[safeIndex] ?? null;
  const currentPlayableUrl = current ? streamUrlOf(current) : null;
  const currentReleaseUrl = current ? releaseUrlOf(current) : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (!queue.length) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      isPlayingRef.current = false;
    }
  }, [queue.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!currentPlayableUrl) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    audio.src = currentPlayableUrl;
    audio.load();

    if (isPlayingRef.current) {
      void audio.play().catch(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setPlaybackError("Playback failed for this track.");
      });
    }
  }, [currentPlayableUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const payload = {
      playlistMode,
      sourceTab,
      selectedAlbumId,
      customQueueIds,
      favoriteTrackIds,
      isShuffle,
      repeatMode,
      playbackRate,
      index: safeIndex,
    };
    window.localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(payload));
  }, [customQueueIds, favoriteTrackIds, isShuffle, playbackRate, playlistMode, repeatMode, safeIndex, selectedAlbumId, sourceTab]);

  function updateMode(nextMode: PlaylistMode) {
    setPlaylistMode(nextMode);
    setIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError(null);
  }

  function selectAlbum(albumId: string) {
    setSelectedAlbumId(albumId);
    updateMode("album");
  }

  function addAlbumToQueue(albumId: string) {
    const albumTrackIds = tracks.filter((track) => track.albumId === albumId).map((track) => track.id);
    if (!albumTrackIds.length) {
      return;
    }
    setCustomQueueIds((prev) => {
      const set = new Set(prev);
      for (const id of albumTrackIds) {
        set.add(id);
      }
      return Array.from(set);
    });
    setSelectedAlbumId(albumId);
    updateMode("queue");
  }

  function toggleFavoriteTrack(trackId: string) {
    setFavoriteTrackIds((prev) => (prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]));
  }

  function toggleFavoriteAlbum(albumId: string) {
    const albumTrackIds = tracks.filter((track) => track.albumId === albumId).map((track) => track.id);
    if (!albumTrackIds.length) {
      return;
    }
    setFavoriteTrackIds((prev) => {
      const set = new Set(prev);
      const allSet = albumTrackIds.every((id) => set.has(id));
      if (allSet) {
        return prev.filter((id) => !albumTrackIds.includes(id));
      }
      for (const id of albumTrackIds) {
        set.add(id);
      }
      return Array.from(set);
    });
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
      setPlaybackError("Playback blocked or unsupported source.");
    });
    setIsPlaying(true);
    isPlayingRef.current = true;
  }

  function nextRandomIndex(exclude: number) {
    if (queue.length <= 1) {
      return 0;
    }

    let next = exclude;
    while (next === exclude) {
      next = Math.floor(Math.random() * queue.length);
    }
    return next;
  }

  function advanceTrack(automatic = false) {
    if (!queue.length) {
      return;
    }

    if (isShuffle && queue.length > 1) {
      setIndex(nextRandomIndex(safeIndex));
      setCurrentTime(0);
      setDuration(0);
      setPlaybackError(null);
      return;
    }

    if (safeIndex >= queue.length - 1) {
      if (automatic && repeatMode === "off") {
        setIsPlaying(false);
        isPlayingRef.current = false;
        return;
      }
      setIndex(0);
      setCurrentTime(0);
      setDuration(0);
      setPlaybackError(null);
      return;
    }

    setIndex(safeIndex + 1);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError(null);
  }

  function stepTrack(step: number) {
    if (!queue.length) {
      return;
    }
    if (step > 0) {
      advanceTrack(false);
      return;
    }

    if (isShuffle && queue.length > 1) {
      setIndex(nextRandomIndex(safeIndex));
      setCurrentTime(0);
      setDuration(0);
      setPlaybackError(null);
      return;
    }

    const next = safeIndex + step;
    if (next < 0) {
      setIndex(queue.length - 1);
    } else if (next >= queue.length) {
      setIndex(0);
    } else {
      setIndex(next);
    }
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError(null);
  }

  function restoreSession() {
    const session = readPlayerSession();
    if (!session) {
      return;
    }

    if (session.playlistMode) {
      setPlaylistMode(session.playlistMode);
    }
    if (session.sourceTab) {
      setSourceTab(session.sourceTab);
    }
    if (session.selectedAlbumId && albums.some((album) => album.id === session.selectedAlbumId)) {
      setSelectedAlbumId(session.selectedAlbumId);
    }
    if (Array.isArray(session.customQueueIds)) {
      setCustomQueueIds(session.customQueueIds.filter((id) => trackById.has(id)));
    }
    if (Array.isArray(session.favoriteTrackIds)) {
      setFavoriteTrackIds(session.favoriteTrackIds.filter((id) => trackById.has(id)));
    }
    if (typeof session.isShuffle === "boolean") {
      setIsShuffle(session.isShuffle);
    }
    if (session.repeatMode) {
      setRepeatMode(session.repeatMode);
    }
    if (typeof session.playbackRate === "number" && Number.isFinite(session.playbackRate)) {
      setPlaybackRate(Math.max(0.5, Math.min(2, session.playbackRate)));
    }
    if (typeof session.index === "number" && Number.isFinite(session.index) && session.index >= 0) {
      setIndex(Math.floor(session.index));
    }
    setPlaybackError(null);
  }

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

  function clearQueue() {
    setCustomQueueIds([]);
    if (playlistMode === "queue") {
      updateMode("all");
    }
  }

  function moveQueueTrack(trackId: string, direction: -1 | 1) {
    setCustomQueueIds((prev) => {
      const currentIndex = prev.indexOf(trackId);
      if (currentIndex < 0) {
        return prev;
      }
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      const [item] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function removeQueueTrack(trackId: string) {
    setCustomQueueIds((prev) => {
      const next = prev.filter((id) => id !== trackId);
      if (!next.length) {
        setIndex(0);
      } else {
        setIndex((currentIndex) => Math.min(currentIndex, next.length - 1));
      }
      return next;
    });
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

  function commentOnCurrentTrack() {
    if (!current) {
      return;
    }
    const text = commentDraft.trim();
    if (!text) {
      return;
    }
    addComment(current.id, text);
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        stepTrack(1);
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        stepTrack(-1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const favoriteSet = new Set(favoriteTrackIds);
  const currentLikeCount = current ? likesByTrack[current.id]?.count ?? 0 : 0;
  const currentLiked = current ? Boolean(likesByTrack[current.id]?.liked) : false;
  const currentComments = current ? getComments(current.id) : [];
  const visibleQueue = useMemo(() => {
    if (!queueSearch.trim()) {
      return queue.map((track, queueIndex) => ({ track, queueIndex }));
    }
    const needle = queueSearch.trim().toLowerCase();
    return queue
      .map((track, queueIndex) => ({ track, queueIndex }))
      .filter(({ track }) =>
        `${track.title} ${track.albumTitle}`.toLowerCase().includes(needle),
      );
  }, [queue, queueSearch]);

  return (
    <section className="rounded-3xl border border-white/10 bg-black/60 p-5 shadow-[0_0_60px_rgba(212,175,55,0.12)] backdrop-blur md:p-7">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-gold-500/40 bg-black">
            <Image src="/LOGO Cartieru` Bradet.png" alt="ATTA logo" fill className="object-contain p-1" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-400">ATTA</p>
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs uppercase tracking-[0.15em] text-zinc-400">Playlist</label>
          <select
            className="rounded-lg border border-white/20 bg-zinc-900 px-3 py-2 text-sm"
            value={playlistMode}
            onChange={(event) => updateMode(event.target.value as PlaylistMode)}
          >
            <option value="all">All Tracks</option>
            <option value="album">Selected Album</option>
            <option value="queue">Queue ({customQueueIds.length})</option>
            <option value="favorites">Favorites ({favoriteTrackIds.length})</option>
          </select>
          <div className="flex overflow-hidden rounded-lg border border-white/20 text-xs">
            <button
              type="button"
              onClick={() => setSourceTab("playable")}
              className={`px-2.5 py-2 ${activeSourceTab === "playable" ? "bg-gold-500/20 text-gold-200" : "bg-black/30 text-zinc-300"}`}
            >
              Playable
            </button>
            <button
              type="button"
              onClick={() => setSourceTab("releases")}
              className={`px-2.5 py-2 ${activeSourceTab === "releases" ? "bg-gold-500/20 text-gold-200" : "bg-black/30 text-zinc-300"}`}
            >
              Releases
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            {playableCount} stream · {releasesCount} external
          </p>
          <button
            type="button"
            onClick={() => setIsShuffle((prev) => !prev)}
            className={`rounded border px-2 py-1 text-xs ${
              isShuffle ? "border-gold-500/70 text-gold-300" : "border-white/20 text-zinc-200"
            }`}
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={cycleRepeatMode}
            className={`rounded border px-2 py-1 text-xs ${
              repeatMode !== "off" ? "border-gold-500/70 text-gold-300" : "border-white/20 text-zinc-200"
            }`}
          >
            Repeat: {repeatMode}
          </button>
          <button
            type="button"
            onClick={restoreSession}
            className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200"
          >
            Restore Session
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
        <p className="mb-3 text-sm text-zinc-400">Albums</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => {
            const albumTracks = tracks.filter((track) => track.albumId === album.id);
            const playableCount = albumTracks.filter((track) => Boolean(streamUrlOf(track))).length;
            const releaseCount = albumTracks.filter((track) => Boolean(releaseUrlOf(track))).length;
            const isSelected = selectedAlbumId === album.id;
            const allFav = albumTracks.length > 0 && albumTracks.every((track) => favoriteSet.has(track.id));

            return (
              <div key={album.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-sm font-semibold text-zinc-100">{album.title}</p>
                <p className="mb-2 mt-1 text-xs text-zinc-400">
                  {albumTracks.length} total · {playableCount} stream · {releaseCount} external
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectAlbum(album.id)}
                    className={`rounded border px-2 py-1 text-[11px] ${
                      isSelected ? "border-gold-500/70 text-gold-300" : "border-white/20 text-zinc-200"
                    }`}
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    onClick={() => addAlbumToQueue(album.id)}
                    className="rounded border border-white/20 px-2 py-1 text-[11px] text-zinc-200"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavoriteAlbum(album.id)}
                    className={`rounded border px-2 py-1 text-[11px] ${
                      allFav ? "border-gold-500/70 text-gold-300" : "border-white/20 text-zinc-200"
                    }`}
                  >
                    Favorite
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
          <p className="text-sm text-zinc-400">Now Playing</p>
          <p className="mt-1 text-lg font-semibold text-white">{current?.title ?? "No track selected"}</p>
          <p className="text-sm text-zinc-400">{current?.albumTitle ?? "No album selected"}</p>
          {current ? (
            <p className="mt-1 text-xs text-zinc-400">
              <span className={`rounded px-1.5 py-0.5 ${currentPlayableUrl ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                {currentPlayableUrl ? "Stream" : "External"}
              </span>
            </p>
          ) : null}
          {playbackError ? <p className="mt-2 text-xs text-red-300">{playbackError}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => stepTrack(-1)} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-zinc-100">
              Prev
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-lg bg-gold-500 px-4 py-1.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!current}
            >
              {current && !currentPlayableUrl ? "Open Link" : isPlaying ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={() => stepTrack(1)} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-zinc-100">
              Next
            </button>
            {current ? (
              <button
                type="button"
                onClick={() => toggleFavoriteTrack(current.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  favoriteSet.has(current.id) ? "border-gold-500/70 text-gold-300" : "border-white/20 text-zinc-100"
                }`}
              >
                Favorite
              </button>
            ) : null}
            {current ? (
              <button
                type="button"
                onClick={() => void toggleLike(current.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  currentLiked ? "border-gold-500/70 text-gold-300" : "border-white/20 text-zinc-100"
                }`}
              >
                Like {currentLikeCount}
              </button>
            ) : null}
            {current ? (
              <button
                type="button"
                onClick={() => void shareCurrentTrack()}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-zinc-100"
              >
                Share
              </button>
            ) : null}
            {current ? (
              <span className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400">
                Comments {getCount(current.id)}
              </span>
            ) : null}
          </div>
          {interactionMessage ? <p className="mt-2 text-xs text-zinc-400">{interactionMessage}</p> : null}

          <div className="mt-4">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => {
                const value = Number(event.target.value);
                setCurrentTime(value);
                if (audioRef.current) {
                  audioRef.current.currentTime = value;
                }
              }}
              className="w-full"
              disabled={!currentPlayableUrl}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="w-full max-w-40"
              disabled={!currentPlayableUrl}
            />
            <span>Speed</span>
            <select
              value={playbackRate}
              onChange={(event) => setPlaybackRate(Number(event.target.value))}
              className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-zinc-200"
              disabled={!currentPlayableUrl}
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-400">Comments</p>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder={current ? "Add a comment" : "Select a track to comment"}
                disabled={!current}
                className="w-full rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
              />
              <button
                type="button"
                onClick={commentOnCurrentTrack}
                disabled={!current || !commentDraft.trim()}
                className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
              >
                Send
              </button>
            </div>
            {currentComments.length ? (
              <div className="max-h-24 space-y-1 overflow-auto pr-1">
                {currentComments.slice(-4).map((comment) => (
                  <div key={comment.id} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-300">
                    {editingCommentId === comment.id ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={editingCommentText}
                          onChange={(event) => setEditingCommentText(event.target.value)}
                          className="w-full rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-zinc-200"
                        />
                        <div className="flex gap-1.5">
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
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p>{comment.text}</p>
                          <p className="mt-0.5 text-[10px] text-zinc-500">{formatCommentTime(comment.createdAt)}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEditComment(comment.id, comment.text)}
                            className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-zinc-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeComment(comment.id)}
                            className="rounded border border-red-400/40 px-1.5 py-0.5 text-[10px] text-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No comments for this track yet.</p>
            )}
          </div>

          <audio
            ref={audioRef}
            preload="metadata"
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
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
                  setPlaybackError("Playback blocked or unsupported source.");
                });
                return;
              }
              advanceTrack(true);
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
              setPlaybackError("Audio source failed to load.");
            }}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
          <p className="mb-3 text-sm text-zinc-400">
            {activeSourceTab === "playable" ? "Playable Queue" : "Release Queue"} ({queue.length})
          </p>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={queueSearch}
              onChange={(event) => setQueueSearch(event.target.value)}
              placeholder="Search queue"
              className="w-full rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-zinc-200"
            />
            {playlistMode === "queue" ? (
              <button
                type="button"
                onClick={clearQueue}
                className="rounded border border-red-400/40 px-2 py-1 text-xs text-red-200"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="max-h-72 space-y-2 overflow-auto pr-1">
            {visibleQueue.length ? (
              visibleQueue.map(({ track, queueIndex }) => {
                const isActive = queueIndex === safeIndex;
                const isStream = Boolean(streamUrlOf(track));
                const queuePosition = customQueueIds.indexOf(track.id);
                const canMoveUp = queuePosition > 0;
                const canMoveDown =
                  queuePosition >= 0 && queuePosition < customQueueIds.length - 1;
                return (
                  <div
                    key={track.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setIndex(queueIndex);
                      setCurrentTime(0);
                      setDuration(0);
                      setPlaybackError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setIndex(queueIndex);
                        setCurrentTime(0);
                        setDuration(0);
                        setPlaybackError(null);
                      }
                    }}
                    className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-gold-500/70 bg-gold-500/10 text-white"
                        : "border-white/10 bg-black/30 text-zinc-200 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {track.trackNumber ? `${track.trackNumber}. ` : ""}
                        {track.title}
                      </p>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${isStream ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                        {isStream ? "Stream" : "External"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{track.albumTitle}</p>
                    <p className="text-[11px] text-zinc-500">Likes: {likesByTrack[track.id]?.count ?? 0}</p>
                    <p className="text-[11px] text-zinc-500">Comments: {getCount(track.id)}</p>
                    {playlistMode === "queue" ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">
                          #{queuePosition + 1}
                        </span>
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
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500">No tracks found. Clear search or change tab.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
