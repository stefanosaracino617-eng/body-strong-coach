import { supabase } from "@/integrations/supabase/client";

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
  consenso_avvertenze: boolean;
  data_consenso_avvertenze: string | null;
  created_at: string;
};

export type SessioneApp = {
  profilo: Profilo;
  isGestore: boolean;
};

export async function caricaSessioneApp(): Promise<SessioneApp | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: profilo }, { data: ruoli }] = await Promise.all([
    supabase.from("profili").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("ruoli_utente").select("ruolo").eq("user_id", user.id),
  ]);

  if (!profilo) return null;

  return {
    profilo: profilo as Profilo,
    isGestore: (ruoli ?? []).some((r) => r.ruolo === "gestore"),
  };
}

export const etichettaStato: Record<StatoProfilo, string> = {
  in_attesa: "In attesa",
  approvato: "Approvato",
  sospeso: "Sospeso",
};
