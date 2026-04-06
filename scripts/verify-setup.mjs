#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

const requiredVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
];

const optionalVars = [
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function parseEnv(content) {
  const map = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) {
      continue;
    }
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();
    map.set(key, value);
  }
  return map;
}

function fail(msg) {
  console.error(`\n[verify:setup] ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  fail("Missing .env.local. Run: cp .env.example .env.local");
}

const envContent = fs.readFileSync(envPath, "utf8");
const envMap = parseEnv(envContent);

const missing = requiredVars.filter((key) => !envMap.get(key));
if (missing.length > 0) {
  fail(`Missing required env vars: ${missing.join(", ")}`);
}

const anonOrPublishable =
  envMap.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
  envMap.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
if (!anonOrPublishable) {
  fail(
    "Missing Supabase client key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.",
  );
}

const url = envMap.get("NEXT_PUBLIC_SUPABASE_URL") ?? "";
if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
  fail("NEXT_PUBLIC_SUPABASE_URL looks invalid. Expected https://<project>.supabase.co");
}

if (anonOrPublishable.length < 20) {
  fail("Supabase public client key looks too short.");
}

console.log("[verify:setup] Required env vars look valid.");
for (const key of optionalVars) {
  const value = envMap.get(key);
  console.log(`[verify:setup] ${key}: ${value ? "set" : "not set (optional)"}`);
}
console.log("[verify:setup] Setup verification complete.");
