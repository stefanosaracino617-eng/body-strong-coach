import { idGestoriFn } from "@/lib/fn";

/**
 * Regola unica: un account con ruolo gestore non è mai un cliente.
 * Qualsiasi conteggio, elenco o filtro che riguarda i clienti passa da qui.
 */
export async function caricaIdGestori(): Promise<Set<string>> {
  const ids = await idGestoriFn();
  return new Set(ids);
}

/** Tiene solo i clienti veri: esclude ogni riga che appartiene a un gestore. */
export function soloClienti<T extends { id: string }>(righe: T[], gestori: Set<string>): T[] {
  return righe.filter((r) => !gestori.has(r.id));
}

/** Variante per righe che riferiscono il cliente con un altro campo. */
export function soloDiClienti<T>(
  righe: T[],
  gestori: Set<string>,
  idDi: (riga: T) => string,
): T[] {
  return righe.filter((r) => !gestori.has(idDi(r)));
}
