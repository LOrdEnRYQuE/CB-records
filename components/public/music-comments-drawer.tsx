"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTrackComments } from "@/lib/social/use-track-comments";

type PlayerTrack = {
  id: string;
  title: string;
  albumTitle: string;
  trackNumber: number | null;
};

type Props = {
  tracks: PlayerTrack[];
};

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

export function MusicCommentsDrawer({ tracks }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyCommented, setOnlyCommented] = useState(true);
  const [selectedTrackId, setSelectedTrackId] = useState<string>(tracks[0]?.id ?? "");
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);
  const { addComment, updateComment, deleteComment, clearComments, getComments, getCount, totalCount } = useTrackComments(
    tracks.map((track) => track.id),
  );

  const filteredTracks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tracks.filter((track) => {
      const matchesText = needle
        ? `${track.title} ${track.albumTitle}`.toLowerCase().includes(needle)
        : true;
      if (!matchesText) {
        return false;
      }
      if (!onlyCommented) {
        return true;
      }
      return getCount(track.id) > 0;
    });
  }, [getCount, onlyCommented, query, tracks]);

  const selectedTrack = tracks.find((track) => track.id === selectedTrackId) ?? filteredTracks[0] ?? null;
  const selectedComments = selectedTrack ? getComments(selectedTrack.id) : [];

  function submitComment() {
    if (!selectedTrack) {
      return;
    }
    const text = commentDraft.trim();
    if (!text) {
      return;
    }
    addComment(selectedTrack.id, text);
    setCommentDraft("");
  }

  function startEdit(commentId: string, text: string) {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
  }

  function saveEdit() {
    if (!selectedTrack || !editingCommentId) {
      return;
    }
    const text = editingCommentText.trim();
    if (!text) {
      return;
    }
    updateComment(selectedTrack.id, editingCommentId, text);
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  function cancelEdit() {
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  function removeComment(commentId: string) {
    if (!selectedTrack) {
      return;
    }
    deleteComment(selectedTrack.id, commentId);
    if (editingCommentId === commentId) {
      cancelEdit();
    }
  }

  function clearSelectedTrackComments() {
    if (!selectedTrack) {
      return;
    }
    clearComments(selectedTrack.id);
    cancelEdit();
  }

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
    <div className="fixed bottom-4 left-4 z-40">
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="ATTA comments drawer"
          className="h-[76vh] w-[calc(100vw-2rem)] max-w-[900px] rounded-2xl border border-white/15 bg-black/90 p-3 shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur md:h-[70vh] md:w-[820px]"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-gold-400">ATTA Comments</p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-white/20 px-2 py-1 text-[11px] text-zinc-300"
            >
              Close
            </button>
          </div>
          <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400">
            <p>{filteredTracks.length} tracks visible</p>
            <p>{totalCount} comments total</p>
          </div>

          <div className="mb-2 space-y-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tracks"
              className="w-full rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-zinc-200"
            />
            <label className="inline-flex items-center gap-2 text-[11px] text-zinc-300">
              <input
                type="checkbox"
                checked={onlyCommented}
                onChange={(event) => setOnlyCommented(event.target.checked)}
              />
              Only tracks with comments
            </label>
          </div>

          <div className="grid h-[calc(76vh-140px)] gap-2 md:h-[calc(70vh-140px)] md:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-1 overflow-auto rounded border border-white/10 bg-black/25 p-1">
              {filteredTracks.length ? (
                filteredTracks.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => {
                      setSelectedTrackId(track.id);
                      cancelEdit();
                    }}
                    className={`block w-full rounded px-2 py-1 text-left text-xs ${
                      selectedTrack?.id === track.id
                        ? "border border-gold-500/60 bg-gold-500/10 text-gold-200"
                        : "border border-transparent text-zinc-300 hover:border-white/20"
                    }`}
                  >
                    <p className="truncate">{track.trackNumber ? `${track.trackNumber}. ` : ""}{track.title}</p>
                    <p className="truncate text-[10px] text-zinc-500">{track.albumTitle}</p>
                    <p className="text-[10px] text-zinc-500">Comments: {getCount(track.id)}</p>
                  </button>
                ))
              ) : (
                <p className="px-2 py-1 text-xs text-zinc-500">No tracks match the current search.</p>
              )}
            </div>

            <div className="flex h-full min-h-0 flex-col rounded border border-white/10 bg-black/25 p-2">
              {selectedTrack ? (
                <>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-100">
                        {selectedTrack.trackNumber ? `${selectedTrack.trackNumber}. ` : ""}
                        {selectedTrack.title}
                      </p>
                      <p className="truncate text-[10px] text-zinc-500">{selectedTrack.albumTitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedTrackComments}
                      disabled={!selectedComments.length}
                      className="rounded border border-red-400/40 px-2 py-1 text-[10px] text-red-200 disabled:opacity-40"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder="Write comment"
                      className="w-full rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-zinc-200"
                    />
                    <button
                      type="button"
                      onClick={submitComment}
                      disabled={!commentDraft.trim()}
                      className="rounded border border-white/20 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 space-y-1 overflow-auto pr-1">
                    {selectedComments.length ? (
                      selectedComments
                        .slice()
                        .reverse()
                        .map((comment) => (
                          <div key={comment.id} className="rounded border border-white/10 bg-black/30 px-2 py-1">
                            {editingCommentId === comment.id ? (
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={editingCommentText}
                                  onChange={(event) => setEditingCommentText(event.target.value)}
                                  className="w-full rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-zinc-200"
                                />
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={saveEdit}
                                    disabled={!editingCommentText.trim()}
                                    className="rounded border border-gold-500/50 px-1.5 py-0.5 text-[10px] text-gold-300 disabled:opacity-40"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-zinc-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs text-zinc-300">{comment.text}</p>
                                  <p className="text-[10px] text-zinc-500">{formatCommentTime(comment.createdAt)}</p>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(comment.id, comment.text)}
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
                        ))
                    ) : (
                      <p className="text-xs text-zinc-500">No comments for this track yet.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-500">Select a track to view comments.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          ref={triggerButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-gold-500/50 bg-black/85 px-4 py-2 text-xs uppercase tracking-[0.14em] text-gold-300 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        >
          Comments {totalCount ? `(${totalCount})` : ""}
        </button>
      )}
    </div>
  );
}
