// Auth admin pour /admin/* — cookie de session signé HMAC.
// Convention identique à _resumeToken.ts (même format compact, secret distinct).
//
// Cookie : admin_session = base64url(payload).base64url(signature)
// Payload : { adminEmail, exp } — exp en secondes epoch.

import { createHmac, timingSafeEqual } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const COOKIE_NAME = 'admin_session';
const DEFAULT_DURATION_HOURS = 12;

export interface AdminSessionPayload {
  adminEmail: string;
  exp: number;
}

export type AdminAuthResult =
  | { ok: true; email: string }
  | { ok: false; reason: string };

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET manquant ou trop court (32+ caractères requis).',
    );
  }
  return secret;
}

function getDurationSeconds(): number {
  const raw = process.env.ADMIN_SESSION_DURATION_HOURS;
  const hours = raw ? Number.parseInt(raw, 10) : DEFAULT_DURATION_HOURS;
  return (Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_DURATION_HOURS) * 3600;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(input: string): Buffer {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

export function signAdminSession(adminEmail: string): {
  token: string;
  expiresAt: Date;
} {
  const ttl = getDurationSeconds();
  const payload: AdminSessionPayload = {
    adminEmail,
    exp: Math.floor(Date.now() / 1000) + ttl,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', getSessionSecret()).update(payloadB64).digest();
  return {
    token: `${payloadB64}.${b64url(sig)}`,
    expiresAt: new Date(payload.exp * 1000),
  };
}

export function verifyAdminSession(token: string): AdminSessionPayload {
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Token invalide.');
  const [payloadB64, sigB64] = parts;

  const expected = createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest();
  const provided = b64urlDecode(sigB64);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    throw new Error('Signature invalide.');
  }

  const payload = JSON.parse(
    b64urlDecode(payloadB64).toString('utf8'),
  ) as AdminSessionPayload;
  if (!payload.adminEmail || typeof payload.exp !== 'number') {
    throw new Error('Payload invalide.');
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Session expirée.');
  }
  return payload;
}

// ─────────────────────────────────────────────────────────────
// Cookie helpers
// ─────────────────────────────────────────────────────────────

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

export function setAdminSessionCookie(res: VercelResponse, token: string): void {
  const ttl = getDurationSeconds();
  const flags = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${ttl}`,
  ];
  if (isProduction()) flags.push('Secure');
  res.setHeader('Set-Cookie', flags.join('; '));
}

export function clearAdminSessionCookie(res: VercelResponse): void {
  const flags = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isProduction()) flags.push('Secure');
  res.setHeader('Set-Cookie', flags.join('; '));
}

export function readAdminSessionCookie(req: VercelRequest): string | null {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] ?? null;
}

// ─────────────────────────────────────────────────────────────
// Middleware de protection des endpoints /api/admin/*
// ─────────────────────────────────────────────────────────────

export function requireAdmin(req: VercelRequest): AdminAuthResult {
  const token = readAdminSessionCookie(req);
  if (!token) return { ok: false, reason: 'no_cookie' };
  try {
    const payload = verifyAdminSession(token);
    return { ok: true, email: payload.adminEmail };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'invalid_token',
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Rate limiting léger en mémoire (par IP)
// MVP : 5 tentatives par 15 minutes. Réinitialisé au cold start
// du runtime serverless — acceptable pour un seul admin.
// ─────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfter = Math.ceil(
      (entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000,
    );
    return { allowed: false, retryAfterSeconds: retryAfter };
  }
  entry.count += 1;
  return { allowed: true };
}

export function resetLoginRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

export function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0];
  return req.socket?.remoteAddress ?? 'unknown';
}

// ─────────────────────────────────────────────────────────────
// Validation du mot de passe en temps constant
// ─────────────────────────────────────────────────────────────

export function verifyAdminPassword(provided: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error('ADMIN_PASSWORD non configuré côté serveur.');
  }
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    // Comparaison fictive pour conserver un timing similaire
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL ?? 'admin@5pennyai.com';
}
