import { supabase } from "@/integrations/supabase/client";
import { BUCKET_IMMAGINI, type Esercizio, type UnitaMisura } from "@/lib/esercizi";

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
    descrizione_esecuzione: string | null;
    errori_comuni: string | null;
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
    .select(
      "*, esercizi(nome, gruppo_muscolare, unita_misura, immagine_url, descrizione_esecuzione, errori_comuni)",
    )
    .eq("scheda_id", schedaId)
    .order("ordine", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SchedaEsercizio[];
}

/** Scheda del cliente ancora valida oggi. Le schede scadute restano nello storico del gestore. */
export async function caricaSchedaClienteAttiva(clienteId: string): Promise<Scheda | null> {
  const { data, error } = await supabase
    .from("schede")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("stato", "attiva")
    .gte("data_scadenza", oggiRoma())
    .maybeSingle();
  if (error) throw error;
  return (data as Scheda | null) ?? null;
}

/**
 * Scheda da usare durante un allenamento: se il cliente ha un allenamento ancora aperto
 * lo può concludere anche se nel frattempo la scheda è stata archiviata o è scaduta.
 */
export async function caricaSchedaPerAllenamento(clienteId: string): Promise<Scheda | null> {
  const attiva = await caricaSchedaClienteAttiva(clienteId);
  if (attiva) return attiva;

  const { data: aperto, error: erroreAperto } = await supabase
    .from("allenamenti")
    .select("scheda_id")
    .eq("cliente_id", clienteId)
    .is("completato_at", null)
    .not("scheda_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroreAperto) throw erroreAperto;
  const schedaId = (aperto as { scheda_id: string | null } | null)?.scheda_id;
  if (!schedaId) return null;

  const { data, error } = await supabase
    .from("schede")
    .select("*")
    .eq("id", schedaId)
    .maybeSingle();
  if (error) throw error;
  return (data as Scheda | null) ?? null;
}

/** Archivia subito una scheda: nulla viene cancellato, il cliente smette solo di vederla. */
export async function archiviaScheda(schedaId: string): Promise<void> {
  const { error } = await supabase
    .from("schede")
    .update({ stato: "archiviata" as const, archiviata_at: new Date().toISOString() })
    .eq("id", schedaId);
  if (error) throw error;
}

/** Schede attive e non scadute dei clienti indicati: serve all'elenco clienti del gestore. */
export async function caricaScadenzePerClienti(
  clientiId: string[],
): Promise<Record<string, string>> {
  if (clientiId.length === 0) return {};
  const { data, error } = await supabase
    .from("schede")
    .select("cliente_id, data_scadenza")
    .in("cliente_id", clientiId)
    .eq("stato", "attiva")
    .gte("data_scadenza", oggiRoma());
  if (error) throw error;
  const mappa: Record<string, string> = {};
  for (const r of (data ?? []) as { cliente_id: string; data_scadenza: string }[]) {
    mappa[r.cliente_id] = r.data_scadenza;
  }
  return mappa;
}

/** Tutte le schede del cliente, dalla più recente: serve al gestore per lo storico e la duplicazione. */
export async function caricaSchedeCliente(clienteId: string): Promise<Scheda[]> {
  const { data, error } = await supabase
    .from("schede")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Scheda[];
}

/** Percorsi immagine (catalogo e liberi) presenti nelle righe della scheda. */
export function percorsiImmagini(righe: SchedaEsercizio[]): string[] {
  const percorsi: string[] = [];
  for (const riga of righe) {
    if (riga.esercizi?.immagine_url) percorsi.push(riga.esercizi.immagine_url);
    if (riga.immagine_libera_url) percorsi.push(riga.immagine_libera_url);
  }
  return Array.from(new Set(percorsi));
}

/** Carica nel deposito privato l'immagine di un esercizio libero e restituisce il percorso salvato. */
export async function caricaImmagineLibera(schedaId: string, file: File): Promise<string> {
  const nomePulito = file.name.replace(/[^A-Za-z0-9._-]+/g, "-");
  const percorso = `libere/${schedaId}/${Date.now()}-${nomePulito}`;
  const { error } = await supabase.storage
    .from(BUCKET_IMMAGINI)
    .upload(percorso, file, file.type ? { upsert: true, contentType: file.type } : { upsert: true });
  if (error) throw error;
  return percorso;
}

/** Salva subito il nuovo ordine degli esercizi di una sessione, riusando le posizioni esistenti. */
export async function salvaOrdine(righe: { id: string; ordine: number }[]): Promise<void> {
  const posizioni = righe.map((r) => r.ordine).sort((a, b) => a - b);
  for (const [indice, riga] of righe.entries()) {
    const nuovo = posizioni[indice]!;
    if (nuovo === riga.ordine) continue;
    const { error } = await supabase
      .from("scheda_esercizi")
      .update({ ordine: nuovo })
      .eq("id", riga.id);
    if (error) throw error;
  }
}

/**
 * Duplica una scheda per lo stesso cliente con nuove date.
 * La scheda precedente viene archiviata automaticamente dal database.
 */
export async function duplicaScheda(
  origine: Scheda,
  dataInizio: string,
  dataScadenza: string,
  titolo?: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("schede")
    .insert({
      cliente_id: origine.cliente_id,
      titolo: (titolo ?? "").trim() || origine.titolo,
      data_inizio: dataInizio,
      data_scadenza: dataScadenza,
      stato: "attiva" as const,
      note_gestore: origine.note_gestore,
    })
    .select("id")
    .single();
  if (error) throw error;
  const nuovaId = (data as { id: string }).id;

  const righe = await caricaEserciziScheda(origine.id);
  if (righe.length > 0) {
    const copie = righe.map((r) => ({
      scheda_id: nuovaId,
      esercizio_id: r.esercizio_id,
      nome_libero: r.nome_libero,
      descrizione_libera: r.descrizione_libera,
      immagine_libera_url: r.immagine_libera_url,
      sessione: r.sessione,
      ordine: r.ordine,
      serie: r.serie,
      ripetizioni: r.ripetizioni,
      durata_minuti: r.durata_minuti,
      recupero_secondi: r.recupero_secondi,
      carico_indicativo: r.carico_indicativo,
      note: r.note,
    }));
    const { error: erroreRighe } = await supabase.from("scheda_esercizi").insert(copie);
    if (erroreRighe) throw erroreRighe;
  }
  return nuovaId;
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
