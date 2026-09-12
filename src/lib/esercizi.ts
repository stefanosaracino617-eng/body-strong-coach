import { supabase } from "@/integrations/supabase/client";

export const GRUPPI_MUSCOLARI = [
  "cardio",
  "pettorali",
  "spalle e trapezio",
  "bicipiti e brachiale",
  "tricipiti",
  "dorsali",
  "gambe e glutei",
  "polpacci",
  "addominali",
] as const;

export type GruppoMuscolare = (typeof GRUPPI_MUSCOLARI)[number];
export type TipoEsercizio = "forza" | "cardio";
export type UnitaMisura = "serie_ripetizioni" | "minuti";

export type Esercizio = {
  id: string;
  nome: string;
  gruppo_muscolare: GruppoMuscolare;
  attrezzatura: string | null;
  tipo: TipoEsercizio;
  unita_misura: UnitaMisura;
  descrizione_esecuzione: string | null;
  errori_comuni: string | null;
  immagine_url: string | null;
  attivo: boolean;
  ordine: number;
  created_at: string;
  updated_at: string;
};

export const BUCKET_IMMAGINI = "esercizi";

export const etichettaUnita: Record<UnitaMisura, string> = {
  serie_ripetizioni: "Serie e ripetizioni",
  minuti: "Minuti",
};

export async function caricaEsercizi(): Promise<Esercizio[]> {
  const { data, error } = await supabase
    .from("esercizi")
    .select("*")
    .order("ordine", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Esercizio[];
}

/** Genera gli indirizzi temporanei per mostrare le immagini del catalogo privato. */
export async function urlImmagini(percorsi: string[]): Promise<Record<string, string>> {
  const unici = Array.from(new Set(percorsi.filter(Boolean)));
  if (unici.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET_IMMAGINI)
    .createSignedUrls(unici, 60 * 60);
  if (error) return {};
  const mappa: Record<string, string> = {};
  for (const voce of data ?? []) {
    if (voce.path && voce.signedUrl) mappa[voce.path] = voce.signedUrl;
  }
  return mappa;
}

function normalizzaIntestazione(valore: string): string {
  return valore
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const ALIAS: Record<string, string> = {
  nome: "nome",
  esercizio: "nome",
  gruppo_muscolare: "gruppo_muscolare",
  gruppo: "gruppo_muscolare",
  attrezzatura: "attrezzatura",
  tipo: "tipo",
  unita_misura: "unita_misura",
  unita: "unita_misura",
  descrizione_esecuzione: "descrizione_esecuzione",
  descrizione: "descrizione_esecuzione",
  esecuzione: "descrizione_esecuzione",
  errori_comuni: "errori_comuni",
  errori: "errori_comuni",
  immagine_url: "immagine_url",
  immagine: "immagine_url",
  attivo: "attivo",
  ordine: "ordine",
  numero: "ordine",
  n: "ordine",
};

function booleano(valore: unknown, predefinito = true): boolean {
  if (valore === undefined || valore === null || valore === "") return predefinito;
  const testo = String(valore).trim().toLowerCase();
  return !["no", "false", "0", "n", "non attivo", "disattivo"].includes(testo);
}

function gruppoValido(valore: unknown): GruppoMuscolare | null {
  const testo = String(valore ?? "").trim().toLowerCase();
  const trovato = GRUPPI_MUSCOLARI.find((g) => g === testo);
  return trovato ?? null;
}

export type RigaImportata = {
  nome: string;
  gruppo_muscolare: GruppoMuscolare;
  attrezzatura: string | null;
  tipo: TipoEsercizio;
  unita_misura: UnitaMisura;
  descrizione_esecuzione: string | null;
  errori_comuni: string | null;
  immagine_url: string | null;
  attivo: boolean;
  ordine: number;
};

export type EsitoLettura = { righe: RigaImportata[]; errori: string[] };

/** Legge un file CSV o Excel e restituisce le righe valide più gli errori riga per riga. */
export async function leggiFileCatalogo(file: File): Promise<EsitoLettura> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const libro = XLSX.read(buffer, { type: "array" });
  const primoFoglio = libro.SheetNames[0];
  if (!primoFoglio) return { righe: [], errori: ["Il file non contiene fogli di dati."] };
  const grezze = XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets[primoFoglio]!, {
    defval: "",
  });

  const righe: RigaImportata[] = [];
  const errori: string[] = [];

  grezze.forEach((grezza, indice) => {
    const riga: Record<string, unknown> = {};
    for (const [chiave, valore] of Object.entries(grezza)) {
      const campo = ALIAS[normalizzaIntestazione(chiave)];
      if (campo) riga[campo] = valore;
    }

    const numeroRiga = indice + 2;
    const nome = String(riga["nome"] ?? "").trim();
    const gruppo = gruppoValido(riga["gruppo_muscolare"]);
    const ordine = Number(String(riga["ordine"] ?? "").trim());

    if (!nome) {
      errori.push(`Riga ${numeroRiga}: manca il nome dell'esercizio.`);
      return;
    }
    if (!gruppo) {
      errori.push(`Riga ${numeroRiga}: gruppo muscolare non valido («${riga["gruppo_muscolare"]}»).`);
      return;
    }
    if (!Number.isFinite(ordine) || ordine <= 0) {
      errori.push(`Riga ${numeroRiga}: numero dell'esercizio mancante o non valido.`);
      return;
    }

    const tipoTesto = String(riga["tipo"] ?? "").trim().toLowerCase();
    const tipo: TipoEsercizio =
      tipoTesto === "cardio" || (!tipoTesto && gruppo === "cardio") ? "cardio" : "forza";

    const unitaTesto = normalizzaIntestazione(String(riga["unita_misura"] ?? ""));
    const unita_misura: UnitaMisura =
      unitaTesto === "minuti" || (!unitaTesto && tipo === "cardio") ? "minuti" : "serie_ripetizioni";

    const testo = (campo: string) => {
      const valore = String(riga[campo] ?? "").trim();
      return valore ? valore : null;
    };

    righe.push({
      nome,
      gruppo_muscolare: gruppo,
      attrezzatura: testo("attrezzatura"),
      tipo,
      unita_misura,
      descrizione_esecuzione: testo("descrizione_esecuzione"),
      errori_comuni: testo("errori_comuni"),
      immagine_url: testo("immagine_url"),
      attivo: booleano(riga["attivo"]),
      ordine: Math.trunc(ordine),
    });
  });

  return { righe, errori };
}

/** Salva le righe importate: aggiorna l'esercizio con lo stesso numero, altrimenti lo crea. */
export async function importaEsercizi(righe: RigaImportata[]): Promise<number> {
  if (righe.length === 0) return 0;
  const { error, data } = await supabase
    .from("esercizi")
    .upsert(righe as never, { onConflict: "ordine" })
    .select("id");
  if (error) throw error;
  return data?.length ?? righe.length;
}

export function numeroDaNomeFile(nomeFile: string): number | null {
  const trovato = nomeFile.match(/^(\d+)/);
  if (!trovato) return null;
  const numero = Number(trovato[1]);
  return Number.isFinite(numero) ? numero : null;
}

export type EsitoImmagini = { abbinate: number; nonAbbinate: string[]; errori: string[] };

/** Carica più immagini abbinandole all'esercizio con lo stesso numero iniziale nel nome del file. */
export async function caricaImmagini(file: File[], esercizi: Esercizio[]): Promise<EsitoImmagini> {
  const perNumero = new Map(esercizi.map((e) => [e.ordine, e]));
  const esito: EsitoImmagini = { abbinate: 0, nonAbbinate: [], errori: [] };

  for (const f of file) {
    const numero = numeroDaNomeFile(f.name);
    const esercizio = numero === null ? undefined : perNumero.get(numero);
    if (!esercizio) {
      esito.nonAbbinate.push(f.name);
      continue;
    }
    const percorso = `${String(esercizio.ordine).padStart(3, "0")}/${f.name}`;
    const { error: erroreUpload } = await supabase.storage
      .from(BUCKET_IMMAGINI)
      .upload(percorso, f, { upsert: true, contentType: f.type || undefined });
    if (erroreUpload) {
      esito.errori.push(`${f.name}: ${erroreUpload.message}`);
      continue;
    }
    const { error: erroreRiga } = await supabase
      .from("esercizi")
      .update({ immagine_url: percorso })
      .eq("id", esercizio.id);
    if (erroreRiga) {
      esito.errori.push(`${f.name}: ${erroreRiga.message}`);
      continue;
    }
    esito.abbinate += 1;
  }

  return esito;
}
