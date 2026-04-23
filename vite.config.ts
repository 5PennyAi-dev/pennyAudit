import 'dotenv/config';
import { defineConfig, type PluginOption, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// @ts-expect-error — module JS sans types
import { embedQuery } from './api/_embedCore.mjs';

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

export default defineConfig({
  plugins: [react(), tailwindcss(), devApiEmbed()],
});
