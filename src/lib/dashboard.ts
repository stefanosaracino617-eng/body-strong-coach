import { giorniAllaScadenza } from "@/lib/date";
import { allenamentiRecentiFn, numeriDashboardFn } from "@/lib/fn";

export type NumeriDashboard = {
  inAttesa: number;
  clientiAttivi: number;
  inScadenza: number;
  senzaScheda: number;
  certificati: number;
  abbonamenti: number;
  allenamenti7: number;
  eserciziAttivi: number;
};

/** Tutti i numeri della dashboard, calcolati in tempo reale dal database. */
export async function caricaNumeriDashboard(): Promise<NumeriDashboard> {
  return numeriDashboardFn();
}

export type AllenamentoRecente = {
  id: string;
  nome: string;
  sessione: string;
  data: string;
};

/** Allenamenti conclusi da tutti i clienti negli ultimi 7 giorni. */
export async function caricaAllenamentiRecenti(): Promise<AllenamentoRecente[]> {
  return allenamentiRecentiFn();
}

export function contaInScadenza(idApprovati: string[], scadenze: Record<string, string>) {
  let inScadenza = 0;
  let senzaScheda = 0;
  for (const id of idApprovati) {
    const scadenza = scadenze[id];
    if (!scadenza) {
      senzaScheda += 1;
      continue;
    }
    if (giorniAllaScadenza(scadenza) <= 14) inScadenza += 1;
  }
  return { inScadenza, senzaScheda };
}
