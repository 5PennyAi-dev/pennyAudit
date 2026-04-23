# pennyAudit

Outil d'audit IA 5PennyAi — React 19 + Vite + TypeScript + Supabase + Vercel.

## Démarrer en local

```bash
cp .env.example .env        # remplir les clés (voir .env.example)
npm install
npm run dev                 # front Vite sur http://localhost:5173
npx vercel dev              # équivalent + endpoints api/*
```

## Tester le formulaire d'intake (Session 2A)

1. Aller sur `http://localhost:5173/intake`
2. Remplir les 7 écrans. À chaque transition d'écran, un save progressif est
   appelé sur `POST /api/intake/save` — vérifier dans Supabase qu'une ligne
   `audits` avec `status='draft'` est créée (écran 1 → 2) puis mise à jour.
3. Rafraîchir la page : les données sont rechargées depuis `localStorage`.
4. Tester la reprise par lien :
   - Déclencher `POST /api/intake/send-resume-link` avec `{ auditId, email }`.
   - En mode dev (sans `RESEND_API_KEY`), le `resumeUrl` est retourné dans la
     réponse JSON (au lieu d'être envoyé par courriel).
   - Ouvrir `/intake/resume/<token>` → redirige vers l'écran où l'utilisateur
     en était, données intactes.
5. À l'écran 7, le clic sur « Lancer mon audit » redirige vers
   `/intake/submitted` (page d'attente temporaire — en Session 2B, déclenchera
   le pipeline des 5 skills).

## Variables d'environnement

Voir `.env.example`. Nouvelles en Session 2A :
- `RESEND_API_KEY`, `RESEND_FROM` — envoi des courriels de reprise
- `RESUME_TOKEN_SECRET` — secret HMAC pour signer les tokens (fallback :
  `SUPABASE_SERVICE_ROLE_KEY`)
- `PUBLIC_BASE_URL` — base URL utilisée dans les liens de reprise

---



Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
