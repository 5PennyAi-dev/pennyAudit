// POST /api/admin/auth/login — valide le mot de passe admin et pose le cookie.
// Body : { password: string }
// Réponse : 200 { ok: true } + Set-Cookie | 401 | 405 | 429.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  checkLoginRateLimit,
  getAdminEmail,
  getClientIp,
  resetLoginRateLimit,
  setAdminSessionCookie,
  signAdminSession,
  verifyAdminPassword,
} from '../../_adminAuth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const limit = checkLoginRateLimit(ip);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds ?? 60));
    return res.status(429).json({
      error: 'Trop de tentatives. Réessaie plus tard.',
    });
  }

  const body = (req.body ?? {}) as { password?: unknown };
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) {
    return res.status(400).json({ error: 'Mot de passe requis.' });
  }

  let valid = false;
  try {
    valid = verifyAdminPassword(password);
  } catch (err) {
    console.error('[admin/login] config error:', err);
    return res.status(500).json({ error: 'Configuration serveur invalide.' });
  }

  if (!valid) {
    // Message générique, pas de timing leak (verifyAdminPassword utilise timingSafeEqual)
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }

  resetLoginRateLimit(ip);

  const email = getAdminEmail();
  const { token } = signAdminSession(email);
  setAdminSessionCookie(res, token);

  return res.status(200).json({ ok: true, email });
}
