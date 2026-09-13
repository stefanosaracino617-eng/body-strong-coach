import { supabase } from "@/integrations/supabase/client";
import type { SchedaEsercizio } from "@/lib/schede";

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

type RigaStorica = {
  peso_kg: number | null;
  ripetizioni_effettive: string | null;
  durata_minuti: number | null;
  created_at: string;
  scheda_esercizi: { esercizio_id: string | null; nome_libero: string | null } | null;
  allenamenti: { cliente_id: string; data: string; completato_at: string | null } | null;
};

async function righeStoriche(clienteId: string): Promise<RigaStorica[]> {
  const { data, error } = await supabase
    .from("allenamento_esercizi")
    .select(
      "peso_kg, ripetizioni_effettive, durata_minuti, created_at, scheda_esercizi(esercizio_id, nome_libero), allenamenti!inner(cliente_id, data, completato_at)",
    )
    .eq("allenamenti.cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as unknown as RigaStorica[];
}

/** Ultimo valore registrato dal cliente per ogni esercizio, anche da schede precedenti. */
export async function ultimiValori(clienteId: string): Promise<Record<string, ValoriEsercizio>> {
  const righe = await righeStoriche(clienteId);
  const mappa: Record<string, ValoriEsercizio> = {};
  for (const r of righe) {
    if (!r.scheda_esercizi) continue;
    const chiave = chiaveEsercizio(r.scheda_esercizi);
    if (mappa[chiave]) continue;
    mappa[chiave] = {
      peso_kg: r.peso_kg,
      ripetizioni_effettive: r.ripetizioni_effettive,
      durata_minuti: r.durata_minuti,
    };
  }
  return mappa;
}

/** Andamento del carico per esercizio: serve al gestore nella pagina del cliente. */
export type PuntoCarico = { data: string; peso_kg: number | null; durata_minuti: number | null };

export async function andamentoCarico(
  clienteId: string,
): Promise<{ chiave: string; nome: string; punti: PuntoCarico[] }[]> {
  const righe = await righeStoriche(clienteId);
  const nomi = await nomiEsercizi();
  const gruppi = new Map<string, PuntoCarico[]>();
  for (const r of righe) {
    if (!r.scheda_esercizi || !r.allenamenti) continue;
    if (r.peso_kg === null && r.durata_minuti === null) continue;
    const chiave = chiaveEsercizio(r.scheda_esercizi);
    const punti = gruppi.get(chiave) ?? [];
    punti.push({ data: r.allenamenti.data, peso_kg: r.peso_kg, durata_minuti: r.durata_minuti });
    gruppi.set(chiave, punti);
  }
  return Array.from(gruppi.entries()).map(([chiave, punti]) => ({
    chiave,
    nome: nomi[chiave] ?? chiave.replace(/^libero:/, ""),
    punti: punti.slice(0, 8).reverse(),
  }));
}

async function nomiEsercizi(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("esercizi").select("id, nome");
  if (error) throw error;
  const mappa: Record<string, string> = {};
  for (const e of (data ?? []) as { id: string; nome: string }[]) mappa[e.id] = e.nome;
  return mappa;
}

/** Storico degli allenamenti del cliente, dal più recente. */
export async function caricaStorico(clienteId: string): Promise<Allenamento[]> {
  const { data, error } = await supabase
    .from("allenamenti")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Allenamento[];
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
  const { data: esistente, error: erroreLettura } = await supabase
    .from("allenamenti")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("scheda_id", schedaId)
    .eq("sessione", sessione)
    .eq("data", oggi)
    .is("completato_at", null)
    .maybeSingle();
  if (erroreLettura) throw erroreLettura;
  if (esistente) return esistente as Allenamento;

  const { data, error } = await supabase
    .from("allenamenti")
    .insert({ cliente_id: clienteId, scheda_id: schedaId, sessione, data: oggi })
    .select("*")
    .single();
  if (error) throw error;
  return data as Allenamento;
}

export async function caricaRigheAllenamento(allenamentoId: string): Promise<RigaAllenamento[]> {
  const { data, error } = await supabase
    .from("allenamento_esercizi")
    .select("*")
    .eq("allenamento_id", allenamentoId);
  if (error) throw error;
  return (data ?? []) as RigaAllenamento[];
}

export async function salvaRigaAllenamento(
  allenamentoId: string,
  schedaEsercizioId: string,
  valori: { completato: boolean } & ValoriEsercizio & { note?: string | null },
): Promise<void> {
  const { error } = await supabase.from("allenamento_esercizi").upsert(
    {
      allenamento_id: allenamentoId,
      scheda_esercizio_id: schedaEsercizioId,
      completato: valori.completato,
      peso_kg: valori.peso_kg,
      ripetizioni_effettive: valori.ripetizioni_effettive,
      durata_minuti: valori.durata_minuti,
      note: valori.note ?? null,
    },
    { onConflict: "allenamento_id,scheda_esercizio_id" },
  );
  if (error) throw error;
}

export async function terminaAllenamento(
  allenamentoId: string,
  noteCliente: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("allenamenti")
    .update({ completato_at: new Date().toISOString(), note_cliente: noteCliente })
    .eq("id", allenamentoId);
  if (error) throw error;
}

export function numeroDecimaleOppureNull(valore: string): number | null {
  const testo = valore.trim().replace(",", ".");
  if (!testo) return null;
  const n = Number(testo);
  return Number.isFinite(n) ? n : null;
}
