// POST /api/admin/auth/logout — efface le cookie admin_session.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearAdminSessionCookie } from '../../_adminAuth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  clearAdminSessionCookie(res);
  return res.status(200).json({ ok: true });
}
