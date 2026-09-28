import { fileToBase64, type Esercizio, type UnitaMisura } from "@/lib/esercizi";
import { oggiRoma } from "@/lib/date";
import {
  archiviaSchedaFn,
  caricaImmagineLiberaFn,
  duplicaSchedaFn,
  eserciziSchedaFn,
  salvaOrdineFn,
  schedaAttivaFn,
  schedaClienteAttivaFn,
  schedaPerAllenamentoFn,
  schedeClienteFn,
  scadenzeFn,
} from "@/lib/fn";

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

/**
 * Regola unica di scheda attiva: stato attiva E inizio già arrivato E scadenza non passata.
 */
export function schedaScaduta(scheda: { data_scadenza: string }): boolean {
  return scheda.data_scadenza < oggiRoma();
}

export function schedaProgrammata(scheda: { stato: StatoScheda; data_inizio: string }): boolean {
  return scheda.stato === "attiva" && scheda.data_inizio > oggiRoma();
}

export function schedaRealmenteAttiva(scheda: {
  stato: StatoScheda;
  data_inizio: string;
  data_scadenza: string;
}): boolean {
  return scheda.stato === "attiva" && !schedaScaduta(scheda) && !schedaProgrammata(scheda);
}

/** Verifica le date della scheda: la scadenza deve essere successiva all'inizio. */
export function verificaDateScheda(dataInizio: string, dataScadenza: string): void {
  if (!dataScadenza) throw new Error("La data di scadenza è obbligatoria.");
  if (dataInizio && dataScadenza <= dataInizio) {
    throw new Error("La data di scadenza deve essere successiva alla data di inizio.");
  }
}

/** Scheda con stato attiva (anche se scaduta): serve al gestore. */
export async function caricaSchedaAttiva(clienteId: string): Promise<Scheda | null> {
  return schedaAttivaFn({ data: { clienteId } });
}

export async function caricaEserciziScheda(schedaId: string): Promise<SchedaEsercizio[]> {
  return eserciziSchedaFn({ data: { schedaId } });
}

/**
 * Scheda in corso del cliente: resta visibile e utilizzabile anche dopo la data
 * di scadenza, finché il gestore non la archivia o non ne crea una nuova.
 */
export async function caricaSchedaClienteAttiva(clienteId: string): Promise<Scheda | null> {
  return schedaClienteAttivaFn({ data: { clienteId } });
}

/**
 * Scheda da usare durante un allenamento: se il cliente ha un allenamento ancora aperto
 * lo può concludere anche se nel frattempo la scheda è stata archiviata o è scaduta.
 */
export async function caricaSchedaPerAllenamento(clienteId: string): Promise<Scheda | null> {
  return schedaPerAllenamentoFn({ data: { clienteId } });
}

/** Archivia subito una scheda: nulla viene cancellato, il cliente smette solo di vederla. */
export async function archiviaScheda(schedaId: string): Promise<void> {
  await archiviaSchedaFn({ data: { schedaId } });
}

/** Schede in corso dei clienti indicati, anche se già scadute: serve all'elenco clienti. */
export async function caricaScadenzePerClienti(
  clientiId: string[],
): Promise<Record<string, string>> {
  return scadenzeFn({ data: { clientiId } });
}

/** Tutte le schede del cliente, dalla più recente: serve al gestore per lo storico e la duplicazione. */
export async function caricaSchedeCliente(clienteId: string): Promise<Scheda[]> {
  return schedeClienteFn({ data: { clienteId } });
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

/** Carica nel deposito l'immagine di un esercizio libero e restituisce il percorso salvato. */
export async function caricaImmagineLibera(schedaId: string, file: File): Promise<string> {
  const payload = await fileToBase64(file);
  return caricaImmagineLiberaFn({ data: { schedaId, file: payload } });
}

/** Salva subito il nuovo ordine degli esercizi di una sessione, riusando le posizioni esistenti. */
export async function salvaOrdine(righe: { id: string; ordine: number }[]): Promise<void> {
  await salvaOrdineFn({ data: { righe } });
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
  verificaDateScheda(dataInizio, dataScadenza);
  return duplicaSchedaFn({
    data: {
      origineId: origine.id,
      dataInizio,
      dataScadenza,
      ...(titolo === undefined ? {} : { titolo }),
    },
  });
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
