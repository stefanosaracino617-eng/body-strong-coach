import { supabase } from "@/integrations/supabase/client";
import type { Esercizio, UnitaMisura } from "@/lib/esercizi";

export type StatoScheda = "attiva" | "archiviata";

export type Scheda = {
  id: string;
  cliente_id: string;
  titolo: string;
  data_inizio: string;
  data_scadenza: string;
  stato: StatoScheda;
  note_gestore: string | null;
  archiviata_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SchedaEsercizio = {
  id: string;
  scheda_id: string;
  esercizio_id: string | null;
  nome_libero: string | null;
  descrizione_libera: string | null;
  immagine_libera_url: string | null;
  sessione: string;
  ordine: number;
  serie: number | null;
  ripetizioni: string | null;
  durata_minuti: number | null;
  recupero_secondi: number | null;
  carico_indicativo: string | null;
  note: string | null;
  esercizi?: {
    nome: string;
    gruppo_muscolare: string;
    unita_misura: UnitaMisura;
    immagine_url: string | null;
  } | null;
};

/** Scheda attiva del cliente, se esiste. */
export async function caricaSchedaAttiva(clienteId: string): Promise<Scheda | null> {
  const { data, error } = await supabase
    .from("schede")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("stato", "attiva")
    .maybeSingle();
  if (error) throw error;
  return (data as Scheda | null) ?? null;
}

export async function caricaEserciziScheda(schedaId: string): Promise<SchedaEsercizio[]> {
  const { data, error } = await supabase
    .from("scheda_esercizi")
    .select("*, esercizi(nome, gruppo_muscolare, unita_misura, immagine_url)")
    .eq("scheda_id", schedaId)
    .order("ordine", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SchedaEsercizio[];
}

/** Unità di misura effettiva della riga: dal catalogo, altrimenti serie e ripetizioni. */
export function unitaRiga(riga: SchedaEsercizio): UnitaMisura {
  return riga.esercizi?.unita_misura ?? "serie_ripetizioni";
}

export function nomeRiga(riga: SchedaEsercizio): string {
  return riga.esercizi?.nome ?? riga.nome_libero ?? "Esercizio";
}

/** Valori iniziali sensati quando si aggiunge un esercizio del catalogo a una sessione. */
export function valoriIniziali(e: Esercizio) {
  return e.unita_misura === "minuti"
    ? { serie: null, ripetizioni: null, durata_minuti: 10 }
    : { serie: 3, ripetizioni: "8-10", durata_minuti: null };
}

export function numeroOppureNull(valore: string): number | null {
  const testo = valore.trim();
  if (!testo) return null;
  const n = Number(testo);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function testoOppureNull(valore: string): string | null {
  const testo = valore.trim();
  return testo ? testo : null;
}
