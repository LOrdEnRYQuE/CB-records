export function getClientIp(request: Request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function getRequestId(request: Request) {
  return request.headers.get("cf-ray") || request.headers.get("x-request-id") || crypto.randomUUID();
}

export function logApiEvent(
  level: "info" | "warn" | "error",
  event: string,
  payload: Record<string, unknown>,
) {
  const body = {
    ts: new Date().toISOString(),
    level,
    event,
    ...payload,
  };
  console[level](JSON.stringify(body));
}
