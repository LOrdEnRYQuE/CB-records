"use client";

const DEVICE_ID_KEY = "atta_device_id_v1";

function generateDeviceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `dev_${crypto.randomUUID()}`;
  }

  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateDeviceId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.length >= 12) {
    return existing;
  }

  const next = generateDeviceId();
  window.localStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}
