// Script one-off : valide src/lib/diagrams/gemini-client.ts en générant
// un diagramme simple à partir d'un prompt minimal et de la planche
// style guide. Écrit le PNG résultant dans ./tmp/test-output.png.
//
// Usage :
//   npx tsx scripts/test-gemini-client.ts
//
// Pré-requis :
//   - GEMINI_API_KEY dans .env
//   - docs/references/style-guide-v1.png présent

import 'dotenv/config';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { generateDiagram } from '../src/lib/diagrams/gemini-client';

const STYLE_GUIDE = 'docs/references/style-guide-v1.png';

const PROMPT = `Create a professional technical architecture diagram in 16:9 format on a white background.

ATTACHED IMAGE: 5PennyAi Diagram Style Guide v1. Carefully analyze the attached style guide and apply its visual rules: palette (#0F2744 navy, #F57D20 orange, #FAF7F2 cream, #6B7280 grey, #FFFFFF white), box shapes (cream secondary boxes with monochrome navy line icon at top, navy central box with white text), arrow styles (thin orange horizontal with black sentence-case label, thin grey vertical when descending), silhouettes for human actors, sans-serif typography in sentence case. The icons shown in the style guide are NOT a fixed catalog — for icons not present, invent new ones in the demonstrated style (thin uniform stroke, monochrome navy, minimal geometry).

TITLE AT TOP: "Architecture de la solution — Test de validation"

LAYOUT: 16:9, white background, clean technical diagram, no shadows, no gradients, no 3D effects.

COMPONENTS TO DRAW (left to right):
- Left endpoint: silhouette labeled "Client"
- Center: navy box "Module IA" with white text and a subtle sparkle icon at top
- Right endpoint: silhouette labeled "Équipe interne"

ARROWS:
- Horizontal orange arrow from "Client" to "Module IA" with label "Demande entrante"
- Horizontal orange arrow from "Module IA" to "Équipe interne" with label "Réponse"

DO NOT INCLUDE: any text outside the diagram, watermarks, logos other than what is in the style guide, color outside the documented palette, gradient or 3D effects, decorative elements.`;

async function main() {
  console.log('[test-gemini-client] starting…');

  const result = await generateDiagram({
    prompt: PROMPT,
    referenceImagePath: STYLE_GUIDE,
    aspectRatio: '16:9',
    resolution: '2K',
  });

  if (!result.success) {
    console.error(
      `[test-gemini-client] FAILED after ${result.attemptsCount} attempt(s): ${result.error}`,
    );
    process.exit(1);
  }

  await mkdir('tmp', { recursive: true });
  const outPath = join('tmp', 'test-output.png');
  await writeFile(outPath, result.imageBuffer);

  console.log(
    `[test-gemini-client] OK — wrote ${result.imageBuffer.length} bytes to ${outPath} (${result.mimeType})`,
  );
}

main().catch((err) => {
  console.error('[test-gemini-client] uncaught:', err);
  process.exit(1);
});
