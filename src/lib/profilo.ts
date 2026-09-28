import { sessioneAppFn } from "@/lib/fn";

export type StatoProfilo = "in_attesa" | "approvato" | "sospeso";

export type Profilo = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  data_nascita: string | null;
  sesso: "maschio" | "femmina" | "altro" | null;
  stato: StatoProfilo;
  consenso_privacy: boolean;
  data_consenso: string | null;
  note_gestore: string | null;
  certificato_scadenza: string | null;
  tipo_abbonamento: string | null;
  abbonamento_inizio: string | null;
  abbonamento_scadenza: string | null;
  data_approvazione: string | null;
  consenso_avvertenze: boolean;
  data_consenso_avvertenze: string | null;
  created_at: string;
};

export type SessioneApp = {
  profilo: Profilo;
  isGestore: boolean;
};

export async function caricaSessioneApp(): Promise<SessioneApp | null> {
  return sessioneAppFn();
}

export const etichettaStato: Record<StatoProfilo, string> = {
  in_attesa: "In attesa",
  approvato: "Approvato",
  sospeso: "Sospeso",
};
