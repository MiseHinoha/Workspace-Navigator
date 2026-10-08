import { Request } from 'express';

/**
 * In-memory failure limiter for the authentication endpoints.
 *
 * Before this existed, /api/auth/login accepted unlimited attempts, so the
 * seeded administrator account could be hammered from anywhere. Counters are
 * per-process and reset on restart: that is deliberate, because the app runs a
 * single container and there is no shared store to depend on.
 *
 * Three buckets per attempt, all failure-only (a correct password always
 * passes and clears the counters):
 *   ip            - one noisy source cannot keep guessing
 *   ip + user     - the strict, most specific bucket
 *   user          - a deliberate hard cap, set high on purpose
 *
 * The user bucket is a backstop against an attacker who rotates source IPs; it
 * is far above the other two so a single actor cannot cheaply lock the owner out
 * of their own account. A correct password is still refused while a strict
 * bucket is saturated - that is the price of also capping bcrypt work per
 * window. Windows and limits are env-tunable (see .env.example).
 */

const WINDOW_MS = Number(process.env.AUTH_RATE_WINDOW_MS || 15 * 60 * 1000);
const IP_LIMIT = Number(process.env.AUTH_RATE_IP_LIMIT || 30);
const USER_LIMIT = Number(process.env.AUTH_RATE_USER_LIMIT || 200);
const IP_USER_LIMIT = Number(process.env.AUTH_RATE_IP_USER_LIMIT || 10);
const MAX_TRACKED_KEYS = 5000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitRule {
  key: string;
  limit: number;
  label: string;
}

function prune(now: number) {
  if (buckets.size <= MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(req: Request): string {
  const header = (name: string) => {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
  };

  // Cloudflare terminates TLS in front of this app; X-Forwarded-For is written
  // by our own nginx. Any of these may be absent in local development.
  const candidates = [
    header('cf-connecting-ip'),
    header('x-real-ip'),
    (header('x-forwarded-for') || '').split(',')[0]?.trim(),
    req.socket?.remoteAddress,
  ];

  return candidates.find((value) => !!value) || 'unknown';
}

export function buildAuthRules(req: Request, username: unknown): RateLimitRule[] {
  const ip = getClientIp(req);
  const user = String(username || '').trim().toLowerCase() || '-';

  return [
    { label: 'ip', key: `ip:${ip}`, limit: IP_LIMIT },
    { label: 'user', key: `user:${user}`, limit: USER_LIMIT },
    { label: 'ip+user', key: `ipuser:${ip}|${user}`, limit: IP_USER_LIMIT },
  ];
}

export function checkAuthRateLimit(rules: RateLimitRule[], now = Date.now()) {
  prune(now);

  let retryAfterSeconds = 0;
  let blockedBy = '';

  for (const rule of rules) {
    const bucket = buckets.get(rule.key);
    if (!bucket || bucket.resetAt <= now) continue;
    if (bucket.count >= rule.limit) {
      retryAfterSeconds = Math.max(retryAfterSeconds, Math.ceil((bucket.resetAt - now) / 1000));
      blockedBy = blockedBy || rule.label;
    }
  }

  return { limited: retryAfterSeconds > 0, retryAfterSeconds, blockedBy };
}

export function recordAuthFailure(rules: RateLimitRule[], now = Date.now()) {
  for (const rule of rules) {
    const bucket = buckets.get(rule.key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(rule.key, { count: 1, resetAt: now + WINDOW_MS });
      continue;
    }
    bucket.count += 1;
  }
  prune(now);
}

export function clearAuthFailures(rules: RateLimitRule[]) {
  for (const rule of rules) buckets.delete(rule.key);
}

export function authRateLimitSnapshot() {
  return { trackedKeys: buckets.size, windowMs: WINDOW_MS, limits: { ip: IP_LIMIT, user: USER_LIMIT, ipUser: IP_USER_LIMIT } };
}
