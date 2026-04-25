// POST /api/admin/audits/[id]/approve-and-send
// Approuve l'audit et envoie le rapport au client.
//
// Effets :
//   1. Vérifie statut = pending_review
//   2. Génère JWT report-token (90 jours)
//   3. Stocke token + expiration dans audits
//   4. Envoie courriel client (fallback console si RESEND_API_KEY absent)
//   5. Update statut = delivered, approved_at, delivered_at, reviewed_by
//   6. Émet events 'approved' puis 'sent_to_client'
//   7. Retourne { ok, public_url, email_sent }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../../_supabaseAdmin';
import { requireAdmin } from '../../../_adminAuth';
import { signReportToken } from '../../../_reportToken';
import { buildAuditDeliveryEmail } from '../../../../src/lib/email/audit-delivery-template';
import {
  buildAuditDocx,
  clientFileSlug,
  type AuditForDocx,
} from '../../../../src/lib/report/docx-builder';
import {
  buildDocxStoragePath,
  uploadDocx,
} from '../../../_storageAuditReports';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const auth = requireAdmin(req);
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

  const id = String(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'ID d\'audit invalide.' });
  }

  const supabase = getSupabaseAdmin();

  const { data: audit, error: fetchErr } = await supabase
    .from('audits')
    .select(
      'id, status, intake_data, skill_1_output, skill_2_output, skill_5_output, admin_notes_global, reviewed_at, delivered_at, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (fetchErr || !audit) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }
  if (audit.status !== 'pending_review') {
    return res.status(409).json({
      error: `Statut incompatible : ${audit.status}. Attendu : pending_review.`,
    });
  }
  if (!audit.skill_5_output) {
    return res.status(409).json({
      error: "Audit sans skill_5_output — pipeline non terminé, impossible de livrer.",
    });
  }

  // ─────────── Génération du DOCX AVANT changement de statut ───────────
  // Si la génération ou l'upload échoue, on n'envoie ni courriel ni
  // changement d'état : l'audit reste en pending_review et l'admin peut
  // réessayer après diagnostic.
  const auditForDocx = audit as unknown as AuditForDocx;
  let docxBuffer: Buffer;
  let docxStoragePath: string;
  try {
    docxBuffer = await buildAuditDocx(auditForDocx);
  } catch (err) {
    console.error('[approve-and-send] docx build error:', err);
    return res.status(500).json({
      error:
        "La génération du DOCX a échoué. Vérifie les logs serveur. " +
        "Aucun courriel n'a été envoyé.",
      details: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    docxStoragePath = buildDocxStoragePath(id, clientFileSlug(auditForDocx));
    await uploadDocx(docxStoragePath, docxBuffer);
  } catch (err) {
    console.error('[approve-and-send] docx upload error:', err);
    return res.status(500).json({
      error:
        "L'upload du DOCX dans Storage a échoué. Vérifie les logs serveur. " +
        "Aucun courriel n'a été envoyé.",
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // Token + expiration
  let tokenInfo: { token: string; expiresAt: Date };
  try {
    tokenInfo = signReportToken(id);
  } catch (err) {
    console.error('[approve-and-send] signReportToken error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Erreur signature token.',
    });
  }

  const now = new Date();
  const intake = (audit.intake_data ?? {}) as Record<string, unknown>;
  const firstName = typeof intake.first_name === 'string' ? intake.first_name : null;
  const clientEmail = typeof intake.email === 'string' ? intake.email : null;

  // URL publique
  const baseUrl =
    process.env.PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
  const publicUrl = `${baseUrl}/rapport/${tokenInfo.token}`;

  // Update audit en DB AVANT l'envoi du courriel (idempotence : si l'envoi
  // échoue après, on peut renvoyer le courriel manuellement avec le token).
  const { error: updErr } = await supabase
    .from('audits')
    .update({
      status: 'delivered',
      approved_at: now.toISOString(),
      delivered_at: now.toISOString(),
      reviewed_at: now.toISOString(),
      reviewed_by: auth.email,
      public_report_token: tokenInfo.token,
      public_report_token_expires_at: tokenInfo.expiresAt.toISOString(),
      docx_storage_path: docxStoragePath,
      docx_generated_at: now.toISOString(),
    })
    .eq('id', id);
  if (updErr) {
    console.error('[approve-and-send] update error:', updErr);
    return res.status(500).json({ error: updErr.message });
  }

  // Events
  const insertEvents = supabase.from('audit_review_events').insert([
    {
      audit_id: id,
      event_type: 'docx_generated',
      actor_email: auth.email,
      payload: { storage_path: docxStoragePath, size_bytes: docxBuffer.length },
    },
    {
      audit_id: id,
      event_type: 'approved',
      actor_email: auth.email,
      payload: null,
    },
    {
      audit_id: id,
      event_type: 'sent_to_client',
      actor_email: auth.email,
      payload: {
        client_email: clientEmail,
        token_expires_at: tokenInfo.expiresAt.toISOString(),
        docx_path: docxStoragePath,
        docx_size_bytes: docxBuffer.length,
      },
    },
  ]);
  void insertEvents.then(({ error }) => {
    if (error) console.error('[approve-and-send] events insert error:', error);
  });

  // Envoi du courriel — fallback console si RESEND_API_KEY absent.
  let emailSent = false;
  let emailError: string | null = null;
  const email = buildAuditDeliveryEmail({ firstName, publicReportUrl: publicUrl });
  const attachmentFilename = `audit-${clientFileSlug(auditForDocx)}.docx`;
  const attachmentSizeKb = (docxBuffer.length / 1024).toFixed(1);

  if (!clientEmail) {
    emailError = 'Adresse courriel client absente dans intake_data.';
    console.warn('[approve-and-send] no client email — only logging:', email.subject);
    console.log('[approve-and-send] public_url:', publicUrl);
    console.log(`[approve-and-send] DOCX joint (${attachmentFilename}, ${attachmentSizeKb} Ko) stocké dans Storage : ${docxStoragePath}`);
  } else {
    const resendKey = process.env.RESEND_API_KEY;
    const fromAddress =
      process.env.RESEND_FROM_CLIENT ??
      process.env.RESEND_FROM ??
      'Christian Couillard <christian@5pennyai.com>';

    if (!resendKey) {
      console.warn('[approve-and-send] RESEND_API_KEY absent — email non envoyé (mode dev).');
      console.log('[approve-and-send] to=', clientEmail);
      console.log('[approve-and-send] subject=', email.subject);
      console.log('[approve-and-send] public_url=', publicUrl);
      console.log(`[approve-and-send] pièce jointe (mode dev) : ${attachmentFilename} (${attachmentSizeKb} Ko)`);
      console.log(`[approve-and-send] DOCX stocké dans Storage : ${docxStoragePath}`);
      console.log(email.text);
    } else {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [clientEmail],
            subject: email.subject,
            html: email.html,
            text: email.text,
            attachments: [
              {
                filename: attachmentFilename,
                content: docxBuffer.toString('base64'),
              },
            ],
          }),
        });
        if (resp.ok) {
          emailSent = true;
        } else {
          emailError = `Resend ${resp.status}: ${await resp.text().catch(() => '')}`;
          console.error('[approve-and-send] resend error:', emailError);
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'Erreur envoi.';
        console.error('[approve-and-send] resend exception:', err);
      }
    }
  }

  return res.status(200).json({
    ok: true,
    status: 'delivered',
    public_url: publicUrl,
    email_sent: emailSent,
    email_error: emailError,
    docx_storage_path: docxStoragePath,
    docx_size_bytes: docxBuffer.length,
  });
}
