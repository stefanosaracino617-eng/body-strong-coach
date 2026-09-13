import { supabase } from "@/integrations/supabase/client";

/**
 * Regola unica: un account con ruolo gestore non è mai un cliente.
 * Qualsiasi conteggio, elenco o filtro che riguarda i clienti passa da qui.
 */
export async function caricaIdGestori(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("ruoli_utente")
    .select("user_id")
    .eq("ruolo", "gestore");
  if (error) throw error;
  return new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id));
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
