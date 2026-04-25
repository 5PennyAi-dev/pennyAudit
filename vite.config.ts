import 'dotenv/config';
import { defineConfig, type PluginOption, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// @ts-expect-error — module JS sans types
import { embedQuery } from './api/_embedCore.mjs';
import {
  checkLoginRateLimit,
  clearAdminSessionCookie,
  getAdminEmail,
  getClientIp,
  requireAdmin,
  resetLoginRateLimit,
  setAdminSessionCookie,
  signAdminSession,
  verifyAdminPassword,
} from './api/_adminAuth';
import auditsListHandler from './api/admin/audits/list';

/**
 * Adapte un handler Vercel (req: VercelRequest, res: VercelResponse) sur
 * Connect (Vite). Greffe les méthodes manquantes (.status, .json, .query)
 * pour que les handlers s'exécutent tels quels en dev.
 */
function vercelAdapter(
  handler: (req: any, res: any) => unknown | Promise<unknown>,
): Connect.NextHandleFunction {
  return async (req, res, next) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const query: Record<string, string | string[]> = {};
      for (const [k, v] of url.searchParams.entries()) {
        const existing = query[k];
        if (existing == null) query[k] = v;
        else if (Array.isArray(existing)) existing.push(v);
        else query[k] = [existing, v];
      }
      // Body parsing pour POST/PUT/PATCH JSON
      let body: unknown = undefined;
      if (req.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const raw = Buffer.concat(chunks).toString('utf8');
        if (raw) {
          try {
            body = JSON.parse(raw);
          } catch {
            body = raw;
          }
        }
      }
      const enrichedReq = Object.assign(req, { query, body });

      // Shim Vercel-style res
      const enrichedRes: any = res;
      enrichedRes.status = (code: number) => {
        res.statusCode = code;
        return enrichedRes;
      };
      enrichedRes.json = (payload: unknown) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
        return enrichedRes;
      };
      enrichedRes.send = (payload: unknown) => {
        if (typeof payload === 'string' || Buffer.isBuffer(payload)) {
          res.end(payload);
        } else {
          enrichedRes.json(payload);
        }
        return enrichedRes;
      };

      await handler(enrichedReq, enrichedRes);
    } catch (err) {
      console.error('[vercelAdapter] error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: err instanceof Error ? err.message : 'Erreur interne',
          }),
        );
      } else {
        next(err);
      }
    }
  };
}

/**
 * Middleware dev qui expose POST /api/embed, en miroir de api/embed.ts
 * (qui tourne en Vercel serverless en prod).
 */
function devApiEmbed(): PluginOption {
  return {
    name: 'dev-api-embed',
    configureServer(server) {
      const handler: Connect.NextHandleFunction = async (req, res, next) => {
        if (!req.url?.startsWith('/api/embed')) return next();

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Allow', 'POST');
          return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }

        const apiKey = process.env.VOYAGE_API_KEY;
        if (!apiKey) {
          res.statusCode = 500;
          return res.end(
            JSON.stringify({
              error: 'VOYAGE_API_KEY non chargée. Vérifie .env à la racine.',
            }),
          );
        }

        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed: { query?: string } | null = null;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch {
          parsed = null;
        }

        const query = parsed?.query;
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          res.statusCode = 400;
          return res.end(
            JSON.stringify({ error: 'Le champ `query` (string) est requis.' }),
          );
        }

        try {
          const embedding = await embedQuery(query.trim(), apiKey);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ embedding }));
        } catch (err) {
          const e = err as { status?: number; message?: string; body?: string };
          res.statusCode = e.status ?? 500;
          return res.end(
            JSON.stringify({
              error: e.message ?? 'Erreur embedding',
              detail: e.body,
            }),
          );
        }
      };
      server.middlewares.use(handler);
    },
  };
}

/**
 * Middleware dev qui expose les endpoints admin auth, en miroir de
 * api/admin/auth/{login,logout,check}.ts (qui tournent en Vercel
 * serverless en prod). Permet de tester l'auth admin avec `npm run dev`
 * sans avoir à utiliser `vercel dev`.
 */
function devApiAdminAuth(): PluginOption {
  return {
    name: 'dev-api-admin-auth',
    configureServer(server) {
      // Cast req/res en VercelRequest/Response : les types Vercel étendent
      // les types Node natifs, donc l'usage runtime est compatible.
      type AnyReq = Parameters<typeof requireAdmin>[0];
      type AnyRes = Parameters<typeof setAdminSessionCookie>[0];

      async function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) return {};
        try {
          return JSON.parse(raw);
        } catch {
          return {};
        }
      }

      const handler: Connect.NextHandleFunction = async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/admin/auth/')) return next();

        res.setHeader('Content-Type', 'application/json');
        const route = url.split('?')[0];

        try {
          if (route === '/api/admin/auth/check') {
            if (req.method !== 'GET') {
              res.statusCode = 405;
              res.setHeader('Allow', 'GET');
              return res.end(JSON.stringify({ error: 'Method not allowed' }));
            }
            const result = requireAdmin(req as unknown as AnyReq);
            return res.end(
              JSON.stringify(
                result.ok
                  ? { authenticated: true, email: result.email }
                  : { authenticated: false },
              ),
            );
          }

          if (route === '/api/admin/auth/logout') {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Allow', 'POST');
              return res.end(JSON.stringify({ error: 'Method not allowed' }));
            }
            clearAdminSessionCookie(res as unknown as AnyRes);
            return res.end(JSON.stringify({ ok: true }));
          }

          if (route === '/api/admin/auth/login') {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Allow', 'POST');
              return res.end(JSON.stringify({ error: 'Method not allowed' }));
            }
            const ip = getClientIp(req as unknown as AnyReq);
            const limit = checkLoginRateLimit(ip);
            if (!limit.allowed) {
              res.statusCode = 429;
              res.setHeader('Retry-After', String(limit.retryAfterSeconds ?? 60));
              return res.end(
                JSON.stringify({ error: 'Trop de tentatives. Réessaie plus tard.' }),
              );
            }
            const body = (await readJsonBody(req)) as { password?: unknown };
            const password = typeof body.password === 'string' ? body.password : '';
            if (!password) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Mot de passe requis.' }));
            }
            let valid = false;
            try {
              valid = verifyAdminPassword(password);
            } catch (err) {
              console.error('[dev /api/admin/auth/login] config error:', err);
              res.statusCode = 500;
              return res.end(
                JSON.stringify({ error: 'Configuration serveur invalide.' }),
              );
            }
            if (!valid) {
              res.statusCode = 401;
              return res.end(JSON.stringify({ error: 'Mot de passe incorrect.' }));
            }
            resetLoginRateLimit(ip);
            const email = getAdminEmail();
            const { token } = signAdminSession(email);
            setAdminSessionCookie(res as unknown as AnyRes, token);
            return res.end(JSON.stringify({ ok: true, email }));
          }

          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Not found' }));
        } catch (err) {
          console.error('[dev /api/admin/auth] error:', err);
          res.statusCode = 500;
          return res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Erreur interne',
            }),
          );
        }
      };

      server.middlewares.use(handler);
    },
  };
}

/**
 * Mirror dev pour /api/admin/audits/* — délègue aux handlers Vercel via adapter.
 */
function devApiAdminAudits(): PluginOption {
  return {
    name: 'dev-api-admin-audits',
    configureServer(server) {
      const listAdapted = vercelAdapter(auditsListHandler);
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url === '/api/admin/audits/list') return listAdapted(req, res, next);
        return next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devApiEmbed(),
    devApiAdminAuth(),
    devApiAdminAudits(),
  ],
});
