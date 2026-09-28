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
  foto_url: string | null;
  created_at: string;
};

export type SessioneApp = {
  profilo: Profilo;
  isGestore: boolean;
};

export async function caricaSessioneApp(): Promise<SessioneApp | null> {
  return sessioneAppFn();
}

export function urlMedia(path: string | null | undefined): string | null {
  if (!path) return null;
  return `/media/${path
    .split("/")
    .map((parte) => encodeURIComponent(parte))
    .join("/")}`;
}

export function iniziali(nome: string, cognome: string): string {
  const lettere = `${nome.trim().charAt(0)}${cognome.trim().charAt(0)}`.toUpperCase();
  return lettere || "?";
}

export const etichettaStato: Record<StatoProfilo, string> = {
  in_attesa: "In attesa",
  approvato: "Approvato",
  sospeso: "Sospeso",
};
