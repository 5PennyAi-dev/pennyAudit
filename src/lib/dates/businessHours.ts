// Utilitaire : ajoute N heures « ouvrables » (hors weekends) à une date.
// MVP simple — ne tient pas compte des jours fériés québécois.
// Pour le SLA 48h des audits, on ignore samedi et dimanche.

export function addBusinessHours(start: Date, hoursToAdd: number): Date {
  let remaining = hoursToAdd;
  const cursor = new Date(start.getTime());

  while (remaining > 0) {
    cursor.setUTCHours(cursor.getUTCHours() + 1);
    const day = cursor.getUTCDay(); // 0 = dimanche, 6 = samedi
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }

  return cursor;
}

export function formatSlaDeadline(deadline: Date): string {
  // Format lisible côté courriel admin : "mercredi 24 avril 2026 à 14 h 30"
  // Utilise la locale québécoise.
  return new Intl.DateTimeFormat('fr-CA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Toronto',
    hour12: false,
  }).format(deadline);
}
