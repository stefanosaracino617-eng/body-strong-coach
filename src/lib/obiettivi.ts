import { supabase } from "@/integrations/supabase/client";

export type Obiettivo = {
  id: string;
  nome: string;
  descrizione: string | null;
  gruppo: string;
  ordine: number;
  attivo: boolean;
  created_at: string;
  updated_at: string;
};

export const etichettaGruppo: Record<string, string> = {
  generale: "Obiettivi generali",
  zona: "Zone del corpo",
  benessere: "Benessere",
};

export function nomeGruppo(gruppo: string): string {
  return etichettaGruppo[gruppo] ?? gruppo;
}

export async function caricaCatalogo(soloAttivi = true): Promise<Obiettivo[]> {
  let query = supabase.from("obiettivi").select("*").order("ordine", { ascending: true });
  if (soloAttivi) query = query.eq("attivo", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Obiettivo[];
}

export async function caricaObiettiviCliente(clienteId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("cliente_obiettivi")
    .select("obiettivo_id")
    .eq("cliente_id", clienteId);
  if (error) throw error;
  return (data ?? []).map((r) => r.obiettivo_id);
}

export async function salvaObiettiviCliente(clienteId: string, selezionati: string[]) {
  const attuali = await caricaObiettiviCliente(clienteId);
  const daRimuovere = attuali.filter((id) => !selezionati.includes(id));
  const daAggiungere = selezionati.filter((id) => !attuali.includes(id));

  if (daRimuovere.length > 0) {
    const { error } = await supabase
      .from("cliente_obiettivi")
      .delete()
      .eq("cliente_id", clienteId)
      .in("obiettivo_id", daRimuovere);
    if (error) throw error;
  }

  if (daAggiungere.length > 0) {
    const { error } = await supabase
      .from("cliente_obiettivi")
      .insert(daAggiungere.map((obiettivo_id) => ({ cliente_id: clienteId, obiettivo_id })));
    if (error) throw error;
  }
}
