/** Durata di un allenamento: calcolo e testi, uguali in tutta l'app. */

/** Minuti trascorsi fra due istanti, con i decimali (mai negativi). */
export function minutiTra(inizioIso: string, fineIso: string | null | undefined): number {
  if (!fineIso) return 0;
  const inizio = new Date(inizioIso).getTime();
  const fine = new Date(fineIso).getTime();
  if (Number.isNaN(inizio) || Number.isNaN(fine)) return 0;
  return Math.max(0, (fine - inizio) / 60000);
}

/** Oltre le 4 ore il dato non è attendibile e non viene mostrato. */
export function durataNonAttendibile(minuti: number): boolean {
  return minuti > 240;
}

/** "meno di 1 minuto", "25 min", "1 h 10 min". */
export function formattaDurata(minuti: number): string {
  if (minuti < 1) return "meno di 1 minuto";
  const arrotondati = Math.round(minuti);
  if (arrotondati < 60) return `${arrotondati} min`;
  const ore = Math.floor(arrotondati / 60);
  const resto = arrotondati % 60;
  return resto === 0 ? `${ore} h` : `${ore} h ${resto} min`;
}

/** Testo pronto da mostrare, con la regola delle durate non attendibili. */
export function testoDurata(minuti: number): string {
  return durataNonAttendibile(minuti) ? "durata non registrata" : formattaDurata(minuti);
}
