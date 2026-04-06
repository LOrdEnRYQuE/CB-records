type Entry = {
  count: number;
  resetAt: number;
};

const STORE_KEY = "__atta_rate_limit_store__";

function getStore() {
  const globalWithStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: Map<string, Entry>;
  };
  if (!globalWithStore[STORE_KEY]) {
    globalWithStore[STORE_KEY] = new Map<string, Entry>();
  }
  return globalWithStore[STORE_KEY]!;
}

export function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const store = getStore();
  const current = store.get(input.key);

  if (!current || now > current.resetAt) {
    const next: Entry = {
      count: 1,
      resetAt: now + input.windowMs,
    };
    store.set(input.key, next);
    return {
      allowed: true,
      remaining: Math.max(0, input.limit - 1),
      resetAt: next.resetAt,
    };
  }

  if (current.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  store.set(input.key, current);
  return {
    allowed: true,
    remaining: Math.max(0, input.limit - current.count),
    resetAt: current.resetAt,
  };
}
