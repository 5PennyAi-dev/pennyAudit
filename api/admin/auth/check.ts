// GET /api/admin/auth/check — retourne l'état d'authentification.
// Utilisé par RequireAdmin côté client pour décider de la redirection.
// Réponse : 200 { authenticated: true, email } | 200 { authenticated: false }
// (toujours 200 pour simplifier le fetch côté client.)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../_adminAuth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const result = requireAdmin(req);
  if (result.ok) {
    return res.status(200).json({ authenticated: true, email: result.email });
  }
  return res.status(200).json({ authenticated: false });
}
