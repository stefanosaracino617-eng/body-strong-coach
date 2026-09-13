import { supabase } from "@/integrations/supabase/client";
import { giorniAllaScadenza, oggiRoma } from "@/lib/date";
import { caricaIdGestori, soloClienti, soloDiClienti } from "@/lib/clienti";

export type NumeriDashboard = {
  inAttesa: number;
  clientiAttivi: number;
  inScadenza: number;
  senzaScheda: number;
  allenamenti7: number;
  eserciziAttivi: number;
};

/** Tutti i numeri della dashboard, calcolati in tempo reale dal database. */
export async function caricaNumeriDashboard(): Promise<NumeriDashboard> {
  const oggi = oggiRoma();
  const settimanaFa = new Date(`${oggi}T00:00:00Z`);
  settimanaFa.setUTCDate(settimanaFa.getUTCDate() - 6);
  const daData = settimanaFa.toISOString().slice(0, 10);

  const gestori = await caricaIdGestori();

  const [attesa, approvati, schede, allenamenti, esercizi] = await Promise.all([
    supabase.from("profili").select("id").eq("stato", "in_attesa"),
    supabase.from("profili").select("id").eq("stato", "approvato"),
    supabase
      .from("schede")
      .select("cliente_id, data_scadenza")
      .eq("stato", "attiva")
      .lte("data_inizio", oggi)
      .gte("data_scadenza", oggi),
    supabase
      .from("allenamenti")
      .select("id, cliente_id")
      .not("completato_at", "is", null)
      .gte("data", daData),
    supabase.from("esercizi").select("id", { count: "exact", head: true }).eq("attivo", true),
  ]);

  for (const r of [attesa, approvati, schede, allenamenti, esercizi]) {
    if (r.error) throw r.error;
  }

  const idApprovati = soloClienti((approvati.data ?? []) as { id: string }[], gestori).map(
    (p) => p.id,
  );
  const inAttesaClienti = soloClienti((attesa.data ?? []) as { id: string }[], gestori).length;
  const allenamentiClienti = soloDiClienti(
    (allenamenti.data ?? []) as { id: string; cliente_id: string }[],
    gestori,
    (a) => a.cliente_id,
  ).length;
  const righeSchede = (schede.data ?? []) as { cliente_id: string; data_scadenza: string }[];
  const scadenzePerCliente = new Map<string, string>();
  for (const r of righeSchede) scadenzePerCliente.set(r.cliente_id, r.data_scadenza);

  let inScadenza = 0;
  let senzaScheda = 0;
  for (const id of idApprovati) {
    const scadenza = scadenzePerCliente.get(id);
    if (!scadenza) {
      senzaScheda += 1;
      continue;
    }
    if (giorniAllaScadenza(scadenza) <= 14) inScadenza += 1;
  }

  return {
    inAttesa: inAttesaClienti,
    clientiAttivi: idApprovati.length,
    inScadenza,
    senzaScheda,
    allenamenti7: allenamentiClienti,
    eserciziAttivi: esercizi.count ?? 0,
  };
}

export type AllenamentoRecente = {
  id: string;
  nome: string;
  sessione: string;
  data: string;
};

/** Allenamenti conclusi da tutti i clienti negli ultimi 7 giorni. */
export async function caricaAllenamentiRecenti(): Promise<AllenamentoRecente[]> {
  const oggi = oggiRoma();
  const settimanaFa = new Date(`${oggi}T00:00:00Z`);
  settimanaFa.setUTCDate(settimanaFa.getUTCDate() - 6);
  const daData = settimanaFa.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("allenamenti")
    .select("id, cliente_id, sessione, data, completato_at")
    .not("completato_at", "is", null)
    .gte("data", daData)
    .order("data", { ascending: false })
    .order("completato_at", { ascending: false });
  if (error) throw error;

  const gestori = await caricaIdGestori();
  const righe = soloDiClienti(
    (data ?? []) as { id: string; cliente_id: string; sessione: string; data: string }[],
    gestori,
    (r) => r.cliente_id,
  );
  if (righe.length === 0) return [];

  const { data: profili, error: erroreProfili } = await supabase
    .from("profili")
    .select("id, nome, cognome")
    .in("id", Array.from(new Set(righe.map((r) => r.cliente_id))));
  if (erroreProfili) throw erroreProfili;

  const nomi = new Map<string, string>();
  for (const p of (profili ?? []) as { id: string; nome: string; cognome: string }[]) {
    nomi.set(p.id, `${p.nome} ${p.cognome}`.trim());
  }

  return righe.map((r) => ({
    id: r.id,
    nome: nomi.get(r.cliente_id) ?? "Cliente",
    sessione: r.sessione || "Allenamento",
    data: r.data,
  }));
}
