import {
  catalogoObiettiviFn,
  obiettiviClienteFn,
  salvaObiettiviClienteFn,
} from "@/lib/fn";

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
  return catalogoObiettiviFn({ data: { soloAttivi } });
}

export async function caricaObiettiviCliente(clienteId: string): Promise<string[]> {
  return obiettiviClienteFn({ data: { clienteId } });
}

export async function salvaObiettiviCliente(clienteId: string, selezionati: string[]) {
  await salvaObiettiviClienteFn({ data: { clienteId, selezionati } });
}
