const PLAYABLE_EXTENSIONS = new Set([
  "mp3",
  "m4a",
  "wav",
  "ogg",
  "aac",
  "flac",
  "webm",
  "mp4",
]);

function hasPlayableExtension(pathname: string) {
  const cleanPath = pathname.toLowerCase().split("?")[0].split("#")[0];
  const lastDot = cleanPath.lastIndexOf(".");
  if (lastDot < 0) {
    return false;
  }

  const ext = cleanPath.slice(lastDot + 1);
  return PLAYABLE_EXTENSIONS.has(ext);
}

export function isPlayableAudioUrl(url: string | null | undefined) {
  const value = (url ?? "").trim();
  if (!value) {
    return false;
  }

  if (value.startsWith("/")) {
    return hasPlayableExtension(value);
  }

  try {
    const parsed = new URL(value);
    return hasPlayableExtension(parsed.pathname);
  } catch {
    return false;
  }
}
