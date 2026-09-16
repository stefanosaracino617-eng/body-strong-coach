import { zipSync, strToU8 } from "fflate";
import { supabase } from "@/integrations/supabase/client";
import { caricaIdGestori } from "@/lib/clienti";
import { formattaData, oggiRoma } from "@/lib/date";

/* ---------------------------------------------------------------- formato */

/** Numero con la virgola come separatore decimale, come si usa in Italia. */
function numero(valore: number | null | undefined): string {
  if (valore === null || valore === undefined) return "";
  return String(valore).replace(".", ",");
}

function data(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = formattaData(iso.slice(0, 10));
  return t === "—" ? "" : t;
}

/** Solo l'orario, formato 24 ore, fuso italiano. */
function ora(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function dataOraSoloData(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function campo(valore: string | number | null | undefined): string {
  const testo = valore === null || valore === undefined ? "" : String(valore);
  return /[";\n\r]/.test(testo) ? `"${testo.replace(/"/g, '""')}"` : testo;
}

/** CSV per Excel italiano: punto e virgola, UTF-8 con BOM, fine riga Windows. */
export function creaCsv(intestazioni: string[], righe: (string | number | null)[][]): string {
  const corpo = [intestazioni, ...righe]
    .map((r) => r.map(campo).join(";"))
    .join("\r\n");
  return `\ufeff${corpo}\r\n`;
}

/* ------------------------------------------------------------------- dati */

type ProfiloRiga = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  data_nascita: string | null;
  sesso: string | null;
  stato: string;
  created_at: string;
  certificato_scadenza: string | null;
  data_consenso: string | null;
  data_consenso_avvertenze: string | null;
};

type SchedaRiga = {
  id: string;
  cliente_id: string;
  titolo: string;
  data_inizio: string;
  data_scadenza: string;
  stato: string;
  archiviata_at: string | null;
};

type SchedaEsercizioRiga = {
  id: string;
  scheda_id: string;
  sessione: string;
  ordine: number;
  nome_libero: string | null;
  serie: number | null;
  ripetizioni: string | null;
  durata_minuti: number | null;
  recupero_secondi: number | null;
  carico_indicativo: string | null;
  note: string | null;
  esercizi: { nome: string } | null;
};

type AllenamentoRiga = {
  id: string;
  cliente_id: string;
  scheda_id: string | null;
  sessione: string;
  data: string;
  created_at: string;
  completato_at: string | null;
};

type RigaSvolta = {
  allenamento_id: string;
  scheda_esercizio_id: string | null;
  completato: boolean;
  peso_kg: number | null;
  ripetizioni_effettive: string | null;
  durata_minuti: number | null;
};

type EsercizioRiga = {
  ordine: number;
  nome: string;
  gruppo_muscolare: string;
  attrezzatura: string | null;
  tipo: string;
  unita_misura: string;
  descrizione_esecuzione: string | null;
  errori_comuni: string | null;
  immagine_url: string | null;
  attivo: boolean;
};

function controlla<T>(risultato: { data: T[] | null; error: unknown }): T[] {
  if (risultato.error) throw risultato.error;
  return risultato.data ?? [];
}

export type FileEsportato = { nome: string; contenuto: string };

/**
 * Prepara tutti i file CSV dell'esportazione.
 * Con clienteId valorizzato, i dati sono limitati a quella sola persona.
 */
export async function preparaFileEsportazione(clienteId?: string): Promise<FileEsportato[]> {
  const gestori = clienteId ? new Set<string>() : await caricaIdGestori();

  const profiliQuery = supabase
    .from("profili")
    .select(
      "id, nome, cognome, email, telefono, data_nascita, sesso, stato, created_at, certificato_scadenza, data_consenso, data_consenso_avvertenze",
    )
    .order("cognome", { ascending: true });
  if (clienteId) profiliQuery.eq("id", clienteId);

  const obiettiviQuery = supabase
    .from("cliente_obiettivi")
    .select("cliente_id, obiettivi(nome, ordine)");
  if (clienteId) obiettiviQuery.eq("cliente_id", clienteId);

  const schedeQuery = supabase
    .from("schede")
    .select("id, cliente_id, titolo, data_inizio, data_scadenza, stato, archiviata_at")
    .order("data_inizio", { ascending: true });
  if (clienteId) schedeQuery.eq("cliente_id", clienteId);

  const allenamentiQuery = supabase
    .from("allenamenti")
    .select("id, cliente_id, scheda_id, sessione, data, created_at, completato_at")
    .order("data", { ascending: true });
  if (clienteId) allenamentiQuery.eq("cliente_id", clienteId);

  const [profiliRes, obiettiviRes, schedeRes, allenamentiRes, catalogoRes] = await Promise.all([
    profiliQuery,
    obiettiviQuery,
    schedeQuery,
    allenamentiQuery,
    supabase
      .from("esercizi")
      .select(
        "ordine, nome, gruppo_muscolare, attrezzatura, tipo, unita_misura, descrizione_esecuzione, errori_comuni, immagine_url, attivo",
      )
      .order("ordine", { ascending: true }),
  ]);

  const profili = (controlla(profiliRes) as ProfiloRiga[]).filter((p) => !gestori.has(p.id));
  const idClienti = new Set(profili.map((p) => p.id));
  const obiettiviRighe = controlla(obiettiviRes) as {
    cliente_id: string;
    obiettivi: { nome: string; ordine: number } | null;
  }[];
  const schede = (controlla(schedeRes) as SchedaRiga[]).filter((s) => idClienti.has(s.cliente_id));
  const allenamenti = (controlla(allenamentiRes) as AllenamentoRiga[]).filter((a) =>
    idClienti.has(a.cliente_id),
  );
  const catalogo = controlla(catalogoRes) as EsercizioRiga[];

  const idSchede = schede.map((s) => s.id);
  let righeSchede: SchedaEsercizioRiga[] = [];
  if (idSchede.length > 0) {
    const res = await supabase
      .from("scheda_esercizi")
      .select(
        "id, scheda_id, sessione, ordine, nome_libero, serie, ripetizioni, durata_minuti, recupero_secondi, carico_indicativo, note, esercizi(nome)",
      )
      .in("scheda_id", idSchede)
      .order("ordine", { ascending: true });
    righeSchede = controlla(res) as unknown as SchedaEsercizioRiga[];
  }

  const idAllenamenti = allenamenti.map((a) => a.id);
  let righeSvolte: RigaSvolta[] = [];
  if (idAllenamenti.length > 0) {
    const res = await supabase
      .from("allenamento_esercizi")
      .select(
        "allenamento_id, scheda_esercizio_id, completato, peso_kg, ripetizioni_effettive, durata_minuti",
      )
      .in("allenamento_id", idAllenamenti);
    righeSvolte = controlla(res) as RigaSvolta[];
  }

  /* --------------------------------------------------------- indici utili */

  const nomeCliente = new Map<string, string>();
  for (const p of profili) nomeCliente.set(p.id, `${p.cognome} ${p.nome}`.trim());

  const obiettiviPerCliente = new Map<string, { nome: string; ordine: number }[]>();
  for (const r of obiettiviRighe) {
    if (!r.obiettivi) continue;
    const elenco = obiettiviPerCliente.get(r.cliente_id) ?? [];
    elenco.push(r.obiettivi);
    obiettiviPerCliente.set(r.cliente_id, elenco);
  }

  const schedaPerId = new Map<string, SchedaRiga>();
  for (const s of schede) schedaPerId.set(s.id, s);

  const righePerScheda = new Map<string, SchedaEsercizioRiga[]>();
  for (const r of righeSchede) {
    const elenco = righePerScheda.get(r.scheda_id) ?? [];
    elenco.push(r);
    righePerScheda.set(r.scheda_id, elenco);
  }

  const rigaSchedaPerId = new Map<string, SchedaEsercizioRiga>();
  for (const r of righeSchede) rigaSchedaPerId.set(r.id, r);

  const svoltePerAllenamento = new Map<string, RigaSvolta[]>();
  for (const r of righeSvolte) {
    const elenco = svoltePerAllenamento.get(r.allenamento_id) ?? [];
    elenco.push(r);
    svoltePerAllenamento.set(r.allenamento_id, elenco);
  }

  const nomeEsercizioRiga = (r: SchedaEsercizioRiga | undefined): string =>
    r ? (r.esercizi?.nome ?? r.nome_libero ?? "Esercizio") : "Esercizio";

  /* ----------------------------------------------------------- clienti.csv */

  const clienti = creaCsv(
    [
      "Cognome",
      "Nome",
      "Email",
      "Telefono",
      "Data di nascita",
      "Sesso",
      "Stato account",
      "Data di registrazione",
      "Data di approvazione",
      "Certificato medico valido fino al",
      "Consenso privacy accettato il",
      "Avvertenze accettate il",
      "Obiettivi selezionati",
    ],
    profili.map((p) => [
      p.cognome,
      p.nome,
      p.email,
      p.telefono ?? "",
      data(p.data_nascita),
      p.sesso ?? "",
      p.stato === "in_attesa" ? "In attesa" : p.stato === "approvato" ? "Approvato" : "Sospeso",
      dataOraSoloData(p.created_at),
      "",
      data(p.certificato_scadenza),
      dataOraSoloData(p.data_consenso),
      dataOraSoloData(p.data_consenso_avvertenze),
      (obiettiviPerCliente.get(p.id) ?? [])
        .slice()
        .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0))
        .map((o) => o.nome)
        .join("; "),
    ]),
  );

  /* ------------------------------------------------------------ schede.csv */

  const schedeCsv = creaCsv(
    [
      "Cliente",
      "Nome della scheda",
      "Data di inizio",
      "Data di scadenza",
      "Stato",
      "Data di archiviazione",
      "Numero di sessioni",
      "Numero di esercizi",
    ],
    schede.map((s) => {
      const righe = righePerScheda.get(s.id) ?? [];
      const sessioni = new Set(righe.map((r) => r.sessione));
      return [
        nomeCliente.get(s.cliente_id) ?? "",
        s.titolo,
        data(s.data_inizio),
        data(s.data_scadenza),
        s.stato === "attiva" ? "Attiva" : "Archiviata",
        dataOraSoloData(s.archiviata_at),
        sessioni.size,
        righe.length,
      ];
    }),
  );

  /* --------------------------------------------------- esercizi_schede.csv */

  const eserciziSchede = creaCsv(
    [
      "Cliente",
      "Nome della scheda",
      "Sessione",
      "Ordine",
      "Esercizio",
      "Serie",
      "Ripetizioni",
      "Minuti",
      "Recupero (secondi)",
      "Carico indicativo",
      "Note",
    ],
    righeSchede
      .filter((r) => schedaPerId.has(r.scheda_id))
      .map((r) => {
        const s = schedaPerId.get(r.scheda_id)!;
        return [
          nomeCliente.get(s.cliente_id) ?? "",
          s.titolo,
          r.sessione,
          r.ordine,
          nomeEsercizioRiga(r),
          numero(r.serie),
          r.ripetizioni ?? "",
          numero(r.durata_minuti),
          numero(r.recupero_secondi),
          r.carico_indicativo ?? "",
          r.note ?? "",
        ];
      }),
  );

  /* ------------------------------------------------------- allenamenti.csv */

  const allenamentiCsv = creaCsv(
    [
      "Cliente",
      "Nome della scheda",
      "Sessione",
      "Data",
      "Ora di inizio",
      "Ora di fine",
      "Esercizi svolti",
      "Esercizi previsti",
    ],
    allenamenti.map((a) => {
      const righe = svoltePerAllenamento.get(a.id) ?? [];
      const scheda = a.scheda_id ? schedaPerId.get(a.scheda_id) : undefined;
      const previsti = scheda
        ? (righePerScheda.get(scheda.id) ?? []).filter((r) => r.sessione === a.sessione).length
        : righe.length;
      return [
        nomeCliente.get(a.cliente_id) ?? "",
        scheda?.titolo ?? "",
        a.sessione,
        data(a.data),
        ora(a.created_at),
        ora(a.completato_at),
        righe.filter((r) => r.completato).length,
        previsti,
      ];
    }),
  );

  /* ---------------------------------------------- dettaglio_allenamenti.csv */

  const dettaglio: (string | number | null)[][] = [];
  for (const a of allenamenti) {
    for (const r of svoltePerAllenamento.get(a.id) ?? []) {
      const rigaScheda = r.scheda_esercizio_id
        ? rigaSchedaPerId.get(r.scheda_esercizio_id)
        : undefined;
      dettaglio.push([
        nomeCliente.get(a.cliente_id) ?? "",
        data(a.data),
        a.sessione,
        nomeEsercizioRiga(rigaScheda),
        r.completato ? "si" : "no",
        numero(r.peso_kg),
        r.ripetizioni_effettive ?? "",
        numero(r.durata_minuti),
      ]);
    }
  }
  const dettaglioCsv = creaCsv(
    [
      "Cliente",
      "Data",
      "Sessione",
      "Esercizio",
      "Svolto",
      "Peso registrato (kg)",
      "Ripetizioni registrate",
      "Minuti registrati",
    ],
    dettaglio,
  );

  /* -------------------------------------------------- catalogo_esercizi.csv */

  const catalogoCsv = creaCsv(
    [
      "Numero",
      "Nome",
      "Gruppo_muscolare",
      "Attrezzatura",
      "Tipo",
      "Unita_misura",
      "Descrizione_esecuzione",
      "Errori_comuni",
      "Immagine_url",
      "Attivo",
    ],
    catalogo.map((e) => [
      e.ordine,
      e.nome,
      e.gruppo_muscolare,
      e.attrezzatura ?? "",
      e.tipo,
      e.unita_misura,
      e.descrizione_esecuzione ?? "",
      e.errori_comuni ?? "",
      e.immagine_url ?? "",
      e.attivo ? "si" : "no",
    ]),
  );

  return [
    { nome: "clienti.csv", contenuto: clienti },
    { nome: "schede.csv", contenuto: schedeCsv },
    { nome: "esercizi_schede.csv", contenuto: eserciziSchede },
    { nome: "allenamenti.csv", contenuto: allenamentiCsv },
    { nome: "dettaglio_allenamenti.csv", contenuto: dettaglioCsv },
    { nome: "catalogo_esercizi.csv", contenuto: catalogoCsv },
  ];
}

function senzaAccenti(testo: string): string {
  return testo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

/** aaaammgg di oggi, fuso italiano. */
export function oggiCompatto(): string {
  return oggiRoma().replace(/-/g, "");
}

function scarica(nomeFile: string, file: FileEsportato[]): void {
  const contenuti: Record<string, Uint8Array> = {};
  for (const f of file) contenuti[f.nome] = strToU8(f.contenuto);
  const zip = zipSync(contenuti, { level: 6 });
  const blob = new Blob([zip as unknown as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Esportazione completa di tutti i clienti. */
export async function esportaTutto(): Promise<string> {
  const file = await preparaFileEsportazione();
  const nome = `esportazione_bodystrong_${oggiCompatto()}.zip`;
  scarica(nome, file);
  return nome;
}

/** Esportazione limitata a un solo cliente. */
export async function esportaCliente(
  clienteId: string,
  cognome: string,
  nomeProprio: string,
): Promise<string> {
  const file = await preparaFileEsportazione(clienteId);
  const nome = `esportazione_${senzaAccenti(cognome)}_${senzaAccenti(nomeProprio)}_${oggiCompatto()}.zip`;
  scarica(nome, file);
  return nome;
}
