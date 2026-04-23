import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, parseJsonBody } from '../_supabaseAdmin';

interface SavePayload {
  auditId?: string | null;
  formData?: Record<string, unknown>;
  currentScreen?: number;
  email?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody<SavePayload>(req.body);
  if (!body) return res.status(400).json({ error: 'Corps JSON invalide.' });

  const { auditId, formData, currentScreen, email } = body;
  if (!formData || typeof currentScreen !== 'number') {
    return res.status(400).json({ error: 'formData et currentScreen requis.' });
  }

  const supabase = getSupabaseAdmin();

  // Sérialiser le currentScreen dans intake_data pour éviter une migration de schéma.
  const intakeData = { ...formData, _currentScreen: currentScreen };

  try {
    if (auditId) {
      const { error } = await supabase
        .from('audits')
        .update({
          intake_data: intakeData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auditId)
        .eq('status', 'draft');

      if (error) throw error;
      return res.status(200).json({ auditId, success: true });
    }

    // Nouveau draft : créer ou retrouver le client par email.
    if (!email || typeof email !== 'string') {
      return res
        .status(400)
        .json({ error: 'email requis pour créer un nouvel audit.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const firstName =
      typeof formData.first_name === 'string' ? formData.first_name : null;

    const { data: existingClient, error: clientLookupError } = await supabase
      .from('clients')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (clientLookupError) throw clientLookupError;

    let clientId = existingClient?.id as string | undefined;
    if (!clientId) {
      const { data: newClient, error: insertClientError } = await supabase
        .from('clients')
        .insert({
          email: normalizedEmail,
          full_name: firstName,
          language: 'fr',
        })
        .select('id')
        .single();
      if (insertClientError) throw insertClientError;
      clientId = newClient.id as string;
    }

    // Ré-utiliser un draft existant pour ce client plutôt qu'en créer plusieurs.
    const { data: existingDraft, error: draftLookupError } = await supabase
      .from('audits')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (draftLookupError) throw draftLookupError;

    if (existingDraft?.id) {
      const { error: updateError } = await supabase
        .from('audits')
        .update({
          intake_data: intakeData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDraft.id);
      if (updateError) throw updateError;
      return res.status(200).json({ auditId: existingDraft.id, success: true });
    }

    const { data: newAudit, error: insertAuditError } = await supabase
      .from('audits')
      .insert({
        client_id: clientId,
        status: 'draft',
        intake_data: intakeData,
      })
      .select('id')
      .single();

    if (insertAuditError) throw insertAuditError;

    return res.status(200).json({ auditId: newAudit.id, success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[intake/save] error:', err);
    return res.status(500).json({ error: message });
  }
}
