// Token signé (HMAC-SHA256) pour reprendre un formulaire d'intake.
// Format : base64url(payload).base64url(signature)
// Payload : { auditId, exp } — exp en secondes epoch.

import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours

function getSecret(): string {
  const secret =
    process.env.RESUME_TOKEN_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY; // fallback raisonnable
  if (!secret) {
    throw new Error('RESUME_TOKEN_SECRET manquant côté serveur.');
  }
  return secret;
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

export interface ResumeTokenPayload {
  auditId: string;
  exp: number;
}

export function signResumeToken(
  auditId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string {
  const payload: ResumeTokenPayload = {
    auditId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

export function verifyResumeToken(token: string): ResumeTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Token invalide.');
  const [payloadB64, sigB64] = parts;

  const expected = createHmac('sha256', getSecret()).update(payloadB64).digest();
  const provided = b64urlDecode(sigB64);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    throw new Error('Signature invalide.');
  }

  const payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as ResumeTokenPayload;
  if (!payload.auditId || typeof payload.exp !== 'number') {
    throw new Error('Payload invalide.');
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expiré.');
  }
  return payload;
}
