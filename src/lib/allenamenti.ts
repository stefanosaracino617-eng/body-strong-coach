import type { SchedaEsercizio } from "@/lib/schede";
import {
  andamentoCaricoFn,
  apriAllenamentoFn,
  righeAllenamentoFn,
  salvaRigaAllenamentoFn,
  storicoDettagliatoFn,
  storicoFn,
  terminaAllenamentoFn,
  ultimiValoriFn,
} from "@/lib/fn";

export type Allenamento = {
  id: string;
  cliente_id: string;
  scheda_id: string | null;
  sessione: string;
  data: string;
  completato_at: string | null;
  note_cliente: string | null;
  created_at: string;
};

export type RigaAllenamento = {
  id: string;
  allenamento_id: string;
  scheda_esercizio_id: string | null;
  completato: boolean;
  peso_kg: number | null;
  ripetizioni_effettive: string | null;
  durata_minuti: number | null;
  note: string | null;
};

export type ValoriEsercizio = {
  peso_kg: number | null;
  ripetizioni_effettive: string | null;
  durata_minuti: number | null;
};

/** Chiave stabile di un esercizio: dal catalogo oppure dal nome dell'esercizio libero. */
export function chiaveEsercizio(riga: {
  esercizio_id: string | null;
  nome_libero: string | null;
}): string {
  return riga.esercizio_id ?? `libero:${(riga.nome_libero ?? "").trim().toLowerCase()}`;
}

export function chiaveRiga(riga: SchedaEsercizio): string {
  return chiaveEsercizio({ esercizio_id: riga.esercizio_id, nome_libero: riga.nome_libero });
}

/** Andamento del carico per esercizio: serve al gestore nella pagina del cliente. */
export type PuntoCarico = { data: string; peso_kg: number | null; durata_minuti: number | null };

/** Ultimo valore registrato dal cliente per ogni esercizio, anche da schede precedenti. */
export async function ultimiValori(clienteId: string): Promise<Record<string, ValoriEsercizio>> {
  return ultimiValoriFn({ data: { clienteId } });
}

export async function andamentoCarico(
  clienteId: string,
): Promise<{ chiave: string; nome: string; punti: PuntoCarico[] }[]> {
  return andamentoCaricoFn({ data: { clienteId } });
}

/** Storico degli allenamenti del cliente, dal più recente. */
export async function caricaStorico(clienteId: string): Promise<Allenamento[]> {
  return storicoFn({ data: { clienteId } });
}

export type EsercizioDettaglio = {
  id: string;
  completato: boolean;
  peso_kg: number | null;
  ripetizioni_effettive: string | null;
  durata_minuti: number | null;
  note: string | null;
  scheda_esercizi: {
    esercizio_id: string | null;
    nome_libero: string | null;
    serie: number | null;
    ordine: number;
    esercizi: { nome: string; unita_misura: string } | null;
  } | null;
};

export type AllenamentoConDettaglio = Allenamento & {
  schede?: { titolo: string } | null;
  allenamento_esercizi: EsercizioDettaglio[];
};

/** Storico completo con righe esercizi e titolo scheda, per la vista dettaglio del cliente. */
export async function caricaStoricoDettagliato(
  clienteId: string,
): Promise<AllenamentoConDettaglio[]> {
  return storicoDettagliatoFn({ data: { clienteId } });
}

export type RiepilogoCliente = {
  ultimo: string | null;
  ultimi30: number;
};

export async function riepilogoCliente(clienteId: string): Promise<RiepilogoCliente> {
  const storico = await caricaStorico(clienteId);
  const conclusi = storico.filter((a) => a.completato_at !== null);
  const limite = new Date();
  limite.setDate(limite.getDate() - 30);
  const limiteIso = limite.toISOString().slice(0, 10);
  return {
    ultimo: conclusi[0]?.data ?? null,
    ultimi30: conclusi.filter((a) => a.data >= limiteIso).length,
  };
}

/** Riprende l'allenamento di oggi per quella sessione, altrimenti ne crea uno nuovo. */
export async function apriAllenamento(
  clienteId: string,
  schedaId: string,
  sessione: string,
  oggi: string,
): Promise<Allenamento> {
  return apriAllenamentoFn({ data: { clienteId, schedaId, sessione, oggi } });
}

export async function caricaRigheAllenamento(allenamentoId: string): Promise<RigaAllenamento[]> {
  return righeAllenamentoFn({ data: { allenamentoId } });
}

export async function salvaRigaAllenamento(
  allenamentoId: string,
  schedaEsercizioId: string,
  valori: { completato: boolean } & ValoriEsercizio & { note?: string | null },
): Promise<void> {
  await salvaRigaAllenamentoFn({ data: { allenamentoId, schedaEsercizioId, valori } });
}

export async function terminaAllenamento(
  allenamentoId: string,
  noteCliente: string | null,
): Promise<void> {
  await terminaAllenamentoFn({ data: { allenamentoId, noteCliente } });
}

export function numeroDecimaleOppureNull(valore: string): number | null {
  const testo = valore.trim().replace(",", ".");
  if (!testo) return null;
  const n = Number(testo);
  return Number.isFinite(n) ? n : null;
}
