// Wrappers côté client pour les endpoints d'intake.
// Les endpoints serverless eux-mêmes sont dans /api/intake/*.

import type { IntakeFormData, ScreenId } from '../../types/intake';

export interface SaveIntakePayload {
  auditId: string | null;
  formData: IntakeFormData;
  currentScreen: ScreenId;
  email?: string;
}

export interface SaveIntakeResponse {
  auditId: string;
  success: true;
}

export interface ResumeIntakeResponse {
  auditId: string;
  formData: IntakeFormData;
  currentScreen: ScreenId;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export function saveIntake(
  payload: SaveIntakePayload,
): Promise<SaveIntakeResponse> {
  return postJson<SaveIntakeResponse>('/api/intake/save', payload);
}

export function resumeIntake(token: string): Promise<ResumeIntakeResponse> {
  return getJson<ResumeIntakeResponse>(
    `/api/intake/resume/${encodeURIComponent(token)}`,
  );
}

export function getIntakeStatus(
  auditId: string,
): Promise<{ status: string }> {
  return getJson<{ status: string }>(
    `/api/intake/status?auditId=${encodeURIComponent(auditId)}`,
  );
}

export function sendResumeLink(payload: {
  auditId: string;
  email: string;
  firstName?: string;
}): Promise<{ success: true }> {
  return postJson('/api/intake/send-resume-link', payload);
}
