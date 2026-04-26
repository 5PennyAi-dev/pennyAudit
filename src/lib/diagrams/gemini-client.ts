// Wrapper minimal autour de @google/genai pour générer un diagramme
// d'architecture à partir d'un prompt textuel + une image de référence
// (la planche style guide). Côté serveur uniquement (lit GEMINI_API_KEY
// depuis process.env).
//
// Modèle : gemini-3-pro-image-preview (Nano Banana Pro). Pas de
// paramètre temperature (recommandation officielle Google pour Gemini 3).
//
// Retry : 2 retries supplémentaires (3 tentatives au total) avec backoff
// 1s puis 3s. Timeout 60s par tentative — la génération avec Thinking
// peut prendre 20-40s.

import { readFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3-pro-image-preview';
const ATTEMPT_TIMEOUT_MS = 60_000;
const BACKOFF_MS = [1_000, 3_000];
const LOG_PREFIX = '[gemini-diagram]';

export interface GenerateDiagramParams {
  prompt: string;
  /** Chemin local vers la planche style guide (PNG). */
  referenceImagePath: string;
  /** Défaut : '16:9'. */
  aspectRatio?: '16:9' | '4:3' | '21:9';
  /** Défaut : '2K'. */
  resolution?: '1K' | '2K' | '4K';
}

export type GenerateDiagramResult =
  | {
      success: true;
      imageBuffer: Buffer;
      mimeType: 'image/png' | 'image/jpeg';
    }
  | {
      success: false;
      error: string;
      attemptsCount: number;
    };

export async function generateDiagram(
  params: GenerateDiagramParams,
): Promise<GenerateDiagramResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'GEMINI_API_KEY est absent de l\'environnement.',
      attemptsCount: 0,
    };
  }

  const aspectRatio = params.aspectRatio ?? '16:9';
  const imageSize = params.resolution ?? '2K';

  let referenceBase64: string;
  try {
    referenceBase64 = readFileSync(params.referenceImagePath).toString('base64');
  } catch (err) {
    return {
      success: false,
      error: `Impossible de lire la planche de référence (${params.referenceImagePath}) : ${(err as Error).message}`,
      attemptsCount: 0,
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  let lastError = 'Unknown error';
  const totalAttempts = BACKOFF_MS.length + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    console.log(
      `${LOG_PREFIX} attempt ${attempt}/${totalAttempts} — model=${MODEL} aspectRatio=${aspectRatio} imageSize=${imageSize}`,
    );

    try {
      const result = await runWithTimeout(
        ai.models.generateContent({
          model: MODEL,
          contents: [
            { text: params.prompt },
            {
              inlineData: {
                mimeType: 'image/png',
                data: referenceBase64,
              },
            },
          ],
          config: {
            responseModalities: ['IMAGE'],
            imageConfig: {
              aspectRatio,
              imageSize,
            },
          },
        }),
        ATTEMPT_TIMEOUT_MS,
      );

      const parts = result?.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find(
        (p) =>
          p?.inlineData?.data &&
          typeof p.inlineData.mimeType === 'string' &&
          p.inlineData.mimeType.startsWith('image/'),
      );

      if (!imagePart?.inlineData?.data) {
        const textParts = parts
          .map((p) => p?.text)
          .filter(Boolean)
          .join(' | ');
        lastError = `Réponse sans partie image. Texte reçu : ${textParts || '(aucun)'}`;
        console.warn(`${LOG_PREFIX} attempt ${attempt} — ${lastError}`);
      } else {
        const mimeType = imagePart.inlineData.mimeType as 'image/png' | 'image/jpeg';
        const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
        console.log(
          `${LOG_PREFIX} success on attempt ${attempt} — bytes=${imageBuffer.length} mimeType=${mimeType}`,
        );
        return { success: true, imageBuffer, mimeType };
      }
    } catch (err) {
      lastError = (err as Error).message;
      console.warn(`${LOG_PREFIX} attempt ${attempt} failed — ${lastError}`);
    }

    if (attempt <= BACKOFF_MS.length) {
      await sleep(BACKOFF_MS[attempt - 1]);
    }
  }

  console.error(
    `${LOG_PREFIX} all ${totalAttempts} attempts failed — last error: ${lastError}`,
  );
  return {
    success: false,
    error: lastError,
    attemptsCount: totalAttempts,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout après ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
