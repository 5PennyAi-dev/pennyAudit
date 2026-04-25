// Token signé HMAC-SHA256 pour la page rapport publique.
// Audience 'public_report'. Validité par défaut 90 jours.
// Le token est aussi stocké en DB (audits.public_report_token) pour
// permettre la révocation en réécrivant la colonne.

import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 jours

export interface ReportTokenPayload {
  auditId: string;
  aud: 'public_report';
  exp: number;
}

function getSecret(): string {
  const secret =
    process.env.REPORT_TOKEN_SECRET ??
    process.env.RESUME_TOKEN_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      'REPORT_TOKEN_SECRET (ou RESUME_TOKEN_SECRET) manquant côté serveur.',
    );
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

export function signReportToken(
  auditId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): { token: string; expiresAt: Date } {
  const payload: ReportTokenPayload = {
    auditId,
    aud: 'public_report',
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', getSecret()).update(payloadB64).digest();
  return {
    token: `${payloadB64}.${b64url(sig)}`,
    expiresAt: new Date(payload.exp * 1000),
  };
}

export function verifyReportToken(token: string): ReportTokenPayload {
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

  const payload = JSON.parse(
    b64urlDecode(payloadB64).toString('utf8'),
  ) as ReportTokenPayload;
  if (
    !payload.auditId ||
    payload.aud !== 'public_report' ||
    typeof payload.exp !== 'number'
  ) {
    throw new Error('Payload invalide.');
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expiré.');
  }
  return payload;
}
