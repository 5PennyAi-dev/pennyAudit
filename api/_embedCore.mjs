// Logique partagée entre l'endpoint Vercel (api/embed.ts) et
// le middleware de dev Vite (vite.config.ts).
// Préfixe `_` → Vercel ne deploy pas ce fichier comme fonction.

const VOYAGE_ENDPOINT = 'https://api.voyageai.com/v1/embeddings';
const EMBEDDING_MODEL = 'voyage-3';
const EMBEDDING_DIMS = 1024;

/**
 * Génère un embedding vectoriel pour une query utilisateur (inputType=query).
 * Utilisé par le Skill 2 et par le test de recherche sémantique.
 */
export async function embedQuery(query, apiKey) {
  const res = await fetch(VOYAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: [query],
      model: EMBEDDING_MODEL,
      input_type: 'query',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Voyage API ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  const json = await res.json();
  const embedding = json.data[0].embedding;

  if (embedding.length !== EMBEDDING_DIMS) {
    throw new Error(
      `Dimension inattendue : ${embedding.length} (attendu ${EMBEDDING_DIMS}).`,
    );
  }

  return embedding;
}
