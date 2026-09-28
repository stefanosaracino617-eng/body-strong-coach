import {
  attivoEsercizioFn,
  caricaImmaginiFn,
  eserciziFn,
  importaEserciziFn,
  salvaEsercizioFn,
} from "@/lib/fn";

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

export function etichettaGruppo(gruppo: string): string {
  return gruppo.charAt(0).toUpperCase() + gruppo.slice(1);
}
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
  video_url: string | null;
  fonte: string | null;
  fonte_id: string | null;
  licenza: string | null;
  autore: string | null;
  attivo: boolean;
  ordine: number;
  created_at: string;
  updated_at: string;
};

export const BUCKET_IMMAGINI = "esercizi";

export async function fileToBase64(file: File): Promise<{
  name: string;
  contentType: string;
  base64: string;
}> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return {
    name: file.name,
    contentType: file.type || "application/octet-stream",
    base64: btoa(bin),
  };
}

export const etichettaUnita: Record<UnitaMisura, string> = {
  serie_ripetizioni: "Serie e ripetizioni",
  minuti: "Minuti",
};

export async function caricaEsercizi(): Promise<Esercizio[]> {
  return eserciziFn();
}

/** Genera gli indirizzi per mostrare le immagini del catalogo. */
export async function urlImmagini(percorsi: string[]): Promise<Record<string, string>> {
  const unici = Array.from(new Set(percorsi.filter(Boolean)));
  const mappa: Record<string, string> = {};
  for (const path of unici) {
    mappa[path] = `/media/${path
      .split("/")
      .map((p) => encodeURIComponent(p))
      .join("/")}`;
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

/** Solo le colonne presenti nel file vengono valorizzate: le altre restano invariate. */
export type RigaImportata = {
  nome: string;
  gruppo_muscolare: GruppoMuscolare;
  ordine: number;
  attrezzatura?: string | null;
  tipo?: TipoEsercizio;
  unita_misura?: UnitaMisura;
  descrizione_esecuzione?: string | null;
  errori_comuni?: string | null;
  immagine_url?: string | null;
  attivo?: boolean;
};

export type EsitoLettura = { righe: RigaImportata[]; errori: string[] };

export const MESSAGGIO_FORMATO_NON_SUPPORTATO =
  "Formato non supportato. Da Excel scegli File, Salva con nome, e seleziona CSV.";

/** Colonne indispensabili: senza una di queste l'importazione non parte. */
const COLONNE_RICHIESTE: { campo: string; etichetta: string }[] = [
  { campo: "ordine", etichetta: "numero" },
  { campo: "nome", etichetta: "nome" },
  { campo: "gruppo_muscolare", etichetta: "gruppo_muscolare" },
];

/** Decodifica il testo provando UTF-8 e, se fallisce, la codifica di Excel su Windows. */
function decodificaTesto(buffer: ArrayBuffer): string {
  let testo: string;
  try {
    testo = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    testo = new TextDecoder("windows-1252").decode(buffer);
  }
  // Toglie l'eventuale carattere invisibile iniziale (BOM).
  return testo.charCodeAt(0) === 0xfeff ? testo.slice(1) : testo;
}

/** Riconosce il separatore leggendo la prima riga (fuori dalle virgolette). */
function separatore(testo: string): string {
  let dentroVirgolette = false;
  const conteggio: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  for (const carattere of testo) {
    if (carattere === '"') dentroVirgolette = !dentroVirgolette;
    else if (!dentroVirgolette && (carattere === "\n" || carattere === "\r")) break;
    else if (!dentroVirgolette && carattere in conteggio) conteggio[carattere]! += 1;
  }
  const migliore = Object.entries(conteggio).sort((a, b) => b[1] - a[1])[0]!;
  return migliore[1] > 0 ? migliore[0] : ";";
}

/** Parser CSV: gestisce virgolette, separatori e a capo dentro i campi. */
function analizzaCsv(testo: string, sep: string): string[][] {
  const righe: string[][] = [];
  let riga: string[] = [];
  let campo = "";
  let dentroVirgolette = false;

  for (let i = 0; i < testo.length; i += 1) {
    const c = testo[i]!;
    if (dentroVirgolette) {
      if (c === '"') {
        if (testo[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else dentroVirgolette = false;
      } else campo += c;
      continue;
    }
    if (c === '"') {
      dentroVirgolette = true;
    } else if (c === sep) {
      riga.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && testo[i + 1] === "\n") i += 1;
      riga.push(campo);
      righe.push(riga);
      riga = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || riga.length > 0) {
    riga.push(campo);
    righe.push(riga);
  }
  // Ignora le righe completamente vuote.
  return righe.filter((r) => r.some((v) => v.trim() !== ""));
}

/** Legge un file CSV e restituisce le righe valide più gli errori riga per riga. */
export async function leggiFileCatalogo(file: File): Promise<EsitoLettura> {
  const nome = file.name.toLowerCase();
  if (nome.endsWith(".xlsx") || nome.endsWith(".xls")) {
    throw new Error(MESSAGGIO_FORMATO_NON_SUPPORTATO);
  }

  const testo = decodificaTesto(await file.arrayBuffer());
  const tabella = analizzaCsv(testo, separatore(testo));
  if (tabella.length === 0) throw new Error("Il file non contiene dati.");

  const intestazioni = tabella[0]!.map((c) => ALIAS[normalizzaIntestazione(c)] ?? "");
  for (const richiesta of COLONNE_RICHIESTE) {
    if (!intestazioni.includes(richiesta.campo)) {
      throw new Error(
        `Manca la colonna «${richiesta.etichetta}»: nessuna riga è stata importata.`,
      );
    }
  }

  const grezze = tabella.slice(1).map((valori) => {
    const oggetto: Record<string, unknown> = {};
    intestazioni.forEach((campo, indice) => {
      if (campo) oggetto[campo] = valori[indice] ?? "";
    });
    return oggetto;
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

    const presente = (campo: string) => intestazioni.includes(campo);
    const testo = (campo: string) => {
      const valore = String(riga[campo] ?? "").trim();
      return valore ? valore : null;
    };

    const voce: RigaImportata = {
      nome,
      gruppo_muscolare: gruppo,
      ordine: Math.trunc(ordine),
    };

    if (presente("tipo")) {
      const tipoTesto = String(riga["tipo"] ?? "").trim().toLowerCase();
      voce.tipo = tipoTesto === "cardio" || (!tipoTesto && gruppo === "cardio") ? "cardio" : "forza";
    }
    if (presente("unita_misura")) {
      const unitaTesto = normalizzaIntestazione(String(riga["unita_misura"] ?? ""));
      const cardio = voce.tipo === "cardio" || gruppo === "cardio";
      voce.unita_misura =
        unitaTesto === "minuti" || (!unitaTesto && cardio) ? "minuti" : "serie_ripetizioni";
    }
    if (presente("attrezzatura")) voce.attrezzatura = testo("attrezzatura");
    if (presente("descrizione_esecuzione")) voce.descrizione_esecuzione = testo("descrizione_esecuzione");
    if (presente("errori_comuni")) voce.errori_comuni = testo("errori_comuni");
    if (presente("immagine_url")) voce.immagine_url = testo("immagine_url");
    if (presente("attivo")) voce.attivo = booleano(riga["attivo"]);

    righe.push(voce);
  });

  return { righe, errori };
}

/**
 * Salva le righe importate: aggiorna l'esercizio con lo stesso numero, altrimenti lo crea.
 * Aggiorna solo le colonne presenti nel file: le altre restano invariate.
 */
export async function importaEsercizi(righe: RigaImportata[]): Promise<number> {
  if (righe.length === 0) return 0;
  return importaEserciziFn({ data: { righe } });
}

export function numeroDaNomeFile(nomeFile: string): number | null {
  const trovato = nomeFile.match(/^(\d+)/);
  if (!trovato) return null;
  const numero = Number(trovato[1]);
  return Number.isFinite(numero) ? numero : null;
}

export type EsitoImmagini = { abbinate: number; nonAbbinate: string[]; errori: string[] };

/** Carica più immagini abbinandole all'esercizio con lo stesso numero iniziale nel nome del file. */
export async function caricaImmagini(file: File[], _esercizi: Esercizio[]): Promise<EsitoImmagini> {
  const payload = await Promise.all(file.map(fileToBase64));
  return caricaImmaginiFn({ data: { file: payload } });
}

export async function salvaEsercizio(dati: {
  id?: string;
  nome: string;
  gruppo_muscolare: GruppoMuscolare;
  attrezzatura: string | null;
  tipo: TipoEsercizio;
  unita_misura: UnitaMisura;
  descrizione_esecuzione: string | null;
  errori_comuni: string | null;
  attivo: boolean;
  ordine: number;
}): Promise<void> {
  await salvaEsercizioFn({ data: dati });
}

export async function impostaAttivoEsercizio(id: string, attivo: boolean): Promise<void> {
  await attivoEsercizioFn({ data: { id, attivo } });
}
