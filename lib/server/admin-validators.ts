type ValidationSuccess<T> = { ok: true; data: T };
type ValidationFailure = { ok: false; error: string };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function fail(error: string): ValidationFailure {
  return { ok: false, error };
}

function ok<T>(data: T): ValidationSuccess<T> {
  return { ok: true, data };
}

export function validateId(value: string, label: string): ValidationResult<string> {
  const id = value.trim();
  if (!id) {
    return fail(`${label} is required.`);
  }
  if (!/^[a-zA-Z0-9-]{6,100}$/.test(id)) {
    return fail(`${label} format is invalid.`);
  }
  return ok(id);
}

export function validateIdList(values: string[], label: string): ValidationResult<string[]> {
  const ids = values.map((item) => item.trim()).filter(Boolean);
  if (!ids.length) {
    return fail(`Select at least one ${label}.`);
  }
  for (const id of ids) {
    if (!/^[a-zA-Z0-9-]{6,100}$/.test(id)) {
      return fail(`Invalid ${label} identifier: ${id}`);
    }
  }
  return ok(ids);
}

export function validateAlbumPayload(input: {
  title: string;
  artistId?: string;
  hyperFollowUrl?: string;
}) {
  const title = input.title.trim();
  if (!title || title.length < 2) {
    return fail("Album title is required.");
  }
  if (title.length > 180) {
    return fail("Album title is too long.");
  }

  const artistId = (input.artistId ?? "").trim();
  if (artistId && !/^[a-zA-Z0-9-]{6,100}$/.test(artistId)) {
    return fail("Artist selection is invalid.");
  }

  const hyperFollowUrl = (input.hyperFollowUrl ?? "").trim();
  if (hyperFollowUrl) {
    try {
      const parsed = new URL(hyperFollowUrl);
      if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) {
        return fail("HyperFollow URL must use HTTP or HTTPS.");
      }
    } catch {
      return fail("HyperFollow URL is invalid.");
    }
  }

  return ok({
    title,
    artistId,
    hyperFollowUrl,
  });
}

export function validateTrackPayload(input: {
  title: string;
  albumId: string;
  sourceType: "stream" | "external";
  streamUrl: string;
  releaseUrl: string;
}) {
  const title = input.title.trim();
  if (!title || title.length < 2) {
    return fail("Track title is required.");
  }
  if (title.length > 180) {
    return fail("Track title is too long.");
  }
  if (!/^[a-zA-Z0-9-]{6,100}$/.test(input.albumId.trim())) {
    return fail("Album selection is invalid.");
  }

  const streamUrl = input.streamUrl.trim();
  const releaseUrl = input.releaseUrl.trim();

  if (input.sourceType === "external") {
    if (!releaseUrl) {
      return fail("Release URL is required for external tracks.");
    }
    try {
      const parsed = new URL(releaseUrl);
      if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) {
        return fail("Release URL must use HTTP or HTTPS.");
      }
    } catch {
      return fail("Release URL is invalid.");
    }
  } else if (streamUrl) {
    try {
      const parsed = new URL(streamUrl);
      if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) {
        return fail("Stream URL must use HTTP or HTTPS.");
      }
    } catch {
      return fail("Stream URL is invalid.");
    }
  }

  return ok({
    title,
    albumId: input.albumId.trim(),
    streamUrl,
    releaseUrl,
  });
}

export function validateMerchPayload(input: {
  name: string;
  buyLink: string;
  price: number | null;
  variantsRaw: string;
}) {
  const name = input.name.trim();
  if (!name || name.length < 2) {
    return fail("Product name is required.");
  }
  if (name.length > 180) {
    return fail("Product name is too long.");
  }

  const buyLink = input.buyLink.trim();
  if (!buyLink) {
    return fail("Buy link is required.");
  }
  try {
    const parsed = new URL(buyLink);
    if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) {
      return fail("Buy link must use HTTP or HTTPS.");
    }
  } catch {
    return fail("Buy link is invalid.");
  }

  if (input.price === null || !Number.isFinite(input.price) || input.price < 0) {
    return fail("Price is invalid.");
  }

  let parsedVariants: unknown = [];
  try {
    parsedVariants = input.variantsRaw.trim() ? JSON.parse(input.variantsRaw) : [];
  } catch {
    return fail("Variants JSON is invalid.");
  }

  return ok({
    name,
    buyLink,
    price: input.price,
    parsedVariants: Array.isArray(parsedVariants) ? parsedVariants : [],
  });
}

export function validateMediaPayload(input: { id?: string; title: string; mediaType: string }) {
  const title = input.title.trim();
  if (!title || title.length < 2) {
    return fail("Media title is required.");
  }
  if (title.length > 180) {
    return fail("Media title is too long.");
  }

  const allowed = new Set(["image", "audio", "video", "document"]);
  if (!allowed.has(input.mediaType)) {
    return fail("Media type is invalid.");
  }

  if (input.id) {
    const idValidation = validateId(input.id, "Media id");
    if (!idValidation.ok) {
      return idValidation;
    }
  }

  return ok({
    id: input.id?.trim(),
    title,
    mediaType: input.mediaType as "image" | "audio" | "video" | "document",
  });
}

export function validateSettingPayload(input: { key: string }) {
  const key = input.key.trim();
  if (!key) {
    return fail("Setting key is required.");
  }
  if (!/^[a-zA-Z0-9._:-]{2,120}$/.test(key)) {
    return fail("Setting key format is invalid.");
  }
  return ok({ key });
}

export function validateSettingKeys(keys: string[]): ValidationResult<string[]> {
  const normalized = keys.map((key) => key.trim()).filter(Boolean);
  if (!normalized.length) {
    return fail("Select at least one setting.");
  }
  for (const key of normalized) {
    const result = validateSettingPayload({ key });
    if (!result.ok) {
      return fail(result.error);
    }
  }
  return ok(normalized);
}
