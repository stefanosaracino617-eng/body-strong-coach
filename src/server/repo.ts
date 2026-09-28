import type { Profilo, SessioneApp } from "@/lib/profilo";
import type { Obiettivo } from "@/lib/obiettivi";
import type { RegolePalestra } from "@/lib/regole";
import type { Esercizio, GruppoMuscolare, RigaImportata, TipoEsercizio, UnitaMisura } from "@/lib/esercizi";
import type {
  Allenamento,
  AllenamentoConDettaglio,
  EsercizioDettaglio,
  PuntoCarico,
  RigaAllenamento,
  ValoriEsercizio,
} from "@/lib/allenamenti";
import type { Scheda, SchedaEsercizio } from "@/lib/schede";
import { certificatoDaRinnovare } from "@/lib/certificato";
import { metodoScheda } from "@/lib/schede";
import { abbonamentoDaRinnovare } from "@/lib/abbonamento";
import { giorniAllaScadenza, oggiRoma } from "@/lib/date";

function metodoDaTesto(valore: unknown) {
  return metodoScheda(valore == null ? null : testo(valore));
}

function chiaveEsercizio(riga: { esercizio_id: string | null; nome_libero: string | null }): string {
  return riga.esercizio_id ?? `libero:${(riga.nome_libero ?? "").trim().toLowerCase()}`;
}
import { assicuraSchema, db, erroreDb } from "./db";
import {
  avviaSessione,
  chiudiSessione,
  eGestore,
  hashPassword,
  idUtenteCorrente,
  richiedeGestore,
  richiedeSeStessoOGestore,
  richiedeUtente,
  verificaPassword,
} from "./auth";
import { booleano, isoData, isoIstante, numeroONull, testo } from "./serializza";

function mappaProfilo(r: Record<string, unknown>): Profilo {
  return {
    id: testo(r.id),
    nome: testo(r.nome),
    cognome: testo(r.cognome),
    email: testo(r.email),
    telefono: r.telefono == null ? null : testo(r.telefono),
    data_nascita: isoData(r.data_nascita),
    sesso: (r.sesso as Profilo["sesso"]) ?? null,
    stato: r.stato as Profilo["stato"],
    consenso_privacy: booleano(r.consenso_privacy),
    data_consenso: isoIstante(r.data_consenso),
    note_gestore: r.note_gestore == null ? null : testo(r.note_gestore),
    certificato_scadenza: isoData(r.certificato_scadenza),
    tipo_abbonamento: r.tipo_abbonamento == null ? null : testo(r.tipo_abbonamento),
    abbonamento_inizio: isoData(r.abbonamento_inizio),
    abbonamento_scadenza: isoData(r.abbonamento_scadenza),
    data_approvazione: isoIstante(r.data_approvazione),
    consenso_avvertenze: booleano(r.consenso_avvertenze),
    data_consenso_avvertenze: isoIstante(r.data_consenso_avvertenze),
    foto_url: r.foto_url == null ? null : testo(r.foto_url),
    created_at: isoIstante(r.created_at) ?? "",
  };
}

function mappaEsercizio(r: Record<string, unknown>): Esercizio {
  return {
    id: testo(r.id),
    nome: testo(r.nome),
    gruppo_muscolare: r.gruppo_muscolare as GruppoMuscolare,
    attrezzatura: r.attrezzatura == null ? null : testo(r.attrezzatura),
    tipo: r.tipo as TipoEsercizio,
    unita_misura: r.unita_misura as UnitaMisura,
    descrizione_esecuzione: r.descrizione_esecuzione == null ? null : testo(r.descrizione_esecuzione),
    errori_comuni: r.errori_comuni == null ? null : testo(r.errori_comuni),
    immagine_url: r.immagine_url == null ? null : testo(r.immagine_url),
    video_url: r.video_url == null ? null : testo(r.video_url),
    fonte: r.fonte == null ? null : testo(r.fonte),
    fonte_id: r.fonte_id == null ? null : testo(r.fonte_id),
    licenza: r.licenza == null ? null : testo(r.licenza),
    autore: r.autore == null ? null : testo(r.autore),
    attivo: booleano(r.attivo, true),
    ordine: Number(r.ordine),
    created_at: isoIstante(r.created_at) ?? "",
    updated_at: isoIstante(r.updated_at) ?? "",
  };
}

function mappaScheda(r: Record<string, unknown>): Scheda {
  return {
    id: testo(r.id),
    cliente_id: testo(r.cliente_id),
    titolo: testo(r.titolo),
    data_inizio: isoData(r.data_inizio) ?? "",
    data_scadenza: isoData(r.data_scadenza) ?? "",
    stato: r.stato as Scheda["stato"],
    note_gestore: r.note_gestore == null ? null : testo(r.note_gestore),
    archiviata_at: isoIstante(r.archiviata_at),
    created_at: isoIstante(r.created_at) ?? "",
    updated_at: isoIstante(r.updated_at) ?? "",
  };
}

function mappaAllenamento(r: Record<string, unknown>): Allenamento {
  return {
    id: testo(r.id),
    cliente_id: testo(r.cliente_id),
    scheda_id: r.scheda_id == null ? null : testo(r.scheda_id),
    sessione: testo(r.sessione),
    data: isoData(r.data) ?? "",
    completato_at: isoIstante(r.completato_at),
    note_cliente: r.note_cliente == null ? null : testo(r.note_cliente),
    created_at: isoIstante(r.created_at) ?? "",
  };
}

export async function accedi(email: string, password: string): Promise<SessioneApp> {
  await assicuraSchema();
  const pulita = email.trim().toLowerCase();
  const righe = await db()`SELECT id, password_hash FROM utenti WHERE email = ${pulita} LIMIT 1`;
  const utente = righe[0] as { id: string; password_hash: string } | undefined;
  if (!utente || !(await verificaPassword(password, utente.password_hash))) {
    throw new Error("Email o password non corretti.");
  }
  await avviaSessione(utente.id);
  const sessione = await caricaSessioneApp();
  if (!sessione) throw new Error("Profilo non disponibile.");
  return sessione;
}

export async function registra(dati: {
  email: string;
  password: string;
  nome: string;
  cognome: string;
  telefono: string;
  dataNascita: string;
  sesso: string;
}): Promise<SessioneApp> {
  await assicuraSchema();
  if (dati.password.length < 8) throw new Error("La password deve avere almeno 8 caratteri.");
  const email = dati.email.trim().toLowerCase();
  const hash = await hashPassword(dati.password);
  const sesso = dati.sesso === "maschio" || dati.sesso === "femmina" || dati.sesso === "altro" ? dati.sesso : null;
  const nascita = dati.dataNascita.trim() || null;
  const telefono = dati.telefono.trim() || null;

  try {
    const creato = await db().begin(async (tx) => {
      const esistenteGestore = await tx`
        SELECT 1 FROM ruoli_utente WHERE ruolo = 'gestore' LIMIT 1
      `;
      const primo = esistenteGestore.length === 0;
      const utenti = await tx`
        INSERT INTO utenti (email, password_hash)
        VALUES (${email}, ${hash})
        RETURNING id
      `;
      const id = testo((utenti[0] as { id: string }).id);
      const stato = primo ? "approvato" : "in_attesa";
      const ruolo = primo ? "gestore" : "cliente";
      const ora = new Date().toISOString();
      await tx`
        INSERT INTO profili (
          id, nome, cognome, email, telefono, data_nascita, sesso, stato,
          consenso_privacy, data_consenso, consenso_avvertenze, data_consenso_avvertenze,
          data_approvazione
        ) VALUES (
          ${id}, ${dati.nome.trim()}, ${dati.cognome.trim()}, ${email}, ${telefono},
          ${nascita}, ${sesso}, ${stato},
          true, ${ora}, true, ${ora},
          ${primo ? ora : null}
        )
      `;
      await tx`INSERT INTO ruoli_utente (user_id, ruolo) VALUES (${id}, ${ruolo})`;
      return id;
    });
    await avviaSessione(creato);
  } catch (err) {
    erroreDb(err);
  }

  const sessione = await caricaSessioneApp();
  if (!sessione) throw new Error("Profilo non disponibile.");
  return sessione;
}

export async function esci(): Promise<void> {
  await chiudiSessione();
}

export async function caricaSessioneApp(): Promise<SessioneApp | null> {
  await assicuraSchema();
  const id = await idUtenteCorrente();
  if (!id) return null;
  const [profili, ruoli] = await Promise.all([
    db()`SELECT * FROM profili WHERE id = ${id} LIMIT 1`,
    db()`SELECT ruolo FROM ruoli_utente WHERE user_id = ${id}`,
  ]);
  const profilo = profili[0] as Record<string, unknown> | undefined;
  if (!profilo) return null;
  return {
    profilo: mappaProfilo(profilo),
    isGestore: ruoli.some((r) => testo((r as { ruolo: string }).ruolo) === "gestore"),
  };
}

export async function caricaIdGestori(): Promise<string[]> {
  await richiedeUtente();
  const righe = await db()`SELECT user_id FROM ruoli_utente WHERE ruolo = 'gestore'`;
  return righe.map((r) => testo((r as { user_id: string }).user_id));
}

export async function elencoProfili(stato: "in_attesa" | "approvato"): Promise<Profilo[]> {
  await richiedeGestore();
  const righe = await db()`
    SELECT * FROM profili WHERE stato = ${stato}
    ORDER BY cognome ASC, nome ASC, created_at ASC
  `;
  return (righe as Record<string, unknown>[]).map(mappaProfilo);
}

export async function caricaProfilo(id: string): Promise<Profilo | null> {
  await richiedeSeStessoOGestore(id);
  const righe = await db()`SELECT * FROM profili WHERE id = ${id} LIMIT 1`;
  const riga = righe[0] as Record<string, unknown> | undefined;
  return riga ? mappaProfilo(riga) : null;
}

export async function decidiRegistrazione(id: string, approva: boolean): Promise<void> {
  await richiedeGestore();
  await db()`UPDATE profili SET stato = ${approva ? "approvato" : "sospeso"} WHERE id = ${id}`;
}

export async function assegnaGestore(userId: string, assegna: boolean): Promise<void> {
  const io = await richiedeGestore();
  if (!assegna && userId === io) throw new Error("Non puoi revocare il ruolo di gestore a te stesso.");
  if (assegna) {
    await db()`INSERT INTO ruoli_utente (user_id, ruolo) VALUES (${userId}, 'gestore') ON CONFLICT DO NOTHING`;
  } else {
    await db()`DELETE FROM ruoli_utente WHERE user_id = ${userId} AND ruolo = 'gestore'`;
  }
}

export async function aggiornaAbbonamento(
  id: string,
  valori: {
    tipo_abbonamento: string | null;
    abbonamento_inizio: string | null;
    abbonamento_scadenza: string | null;
  },
): Promise<void> {
  await richiedeGestore();
  if (valori.tipo_abbonamento) {
    const [trovato, attuale] = await Promise.all([
      db()`SELECT 1 FROM tipi_abbonamento WHERE nome = ${valori.tipo_abbonamento} LIMIT 1`,
      db()`SELECT tipo_abbonamento FROM profili WHERE id = ${id} LIMIT 1`,
    ]);
    const gia =
      attuale[0] && (attuale[0] as { tipo_abbonamento: string | null }).tipo_abbonamento;
    if (trovato.length === 0 && gia !== valori.tipo_abbonamento) {
      throw new Error("Scegli un tipo di abbonamento dall'elenco.");
    }
  }
  await db()`
    UPDATE profili SET
      tipo_abbonamento = ${valori.tipo_abbonamento},
      abbonamento_inizio = ${valori.abbonamento_inizio},
      abbonamento_scadenza = ${valori.abbonamento_scadenza}
    WHERE id = ${id}
  `;
}

export async function caricaTipiAbbonamento(soloAttivi: boolean): Promise<
  { id: string; nome: string; durata_giorni: number | null; ordine: number; attivo: boolean }[]
> {
  await richiedeGestore();
  const righe = soloAttivi
    ? await db()`SELECT * FROM tipi_abbonamento WHERE attivo = true ORDER BY ordine ASC, nome ASC`
    : await db()`SELECT * FROM tipi_abbonamento ORDER BY ordine ASC, nome ASC`;
  return (righe as Record<string, unknown>[]).map((r) => ({
    id: testo(r.id),
    nome: testo(r.nome),
    durata_giorni: r.durata_giorni == null ? null : Number(r.durata_giorni),
    ordine: Number(r.ordine ?? 0),
    attivo: booleano(r.attivo, true),
  }));
}

export async function salvaTipoAbbonamento(dati: {
  id?: string;
  nome: string;
  durata_giorni: number | null;
  attivo: boolean;
}): Promise<void> {
  await richiedeGestore();
  const nome = dati.nome.trim();
  if (!nome) throw new Error("Il nome è obbligatorio.");
  if (dati.durata_giorni != null && (!Number.isInteger(dati.durata_giorni) || dati.durata_giorni < 1 || dati.durata_giorni > 3650)) {
    throw new Error("La durata deve essere un numero di giorni tra 1 e 3650, oppure vuota.");
  }
  try {
    await db().begin(async (tx) => {
      if (dati.id) {
        const attuali = await tx`SELECT nome FROM tipi_abbonamento WHERE id = ${dati.id} LIMIT 1`;
        const vecchio = attuali[0] ? testo((attuali[0] as { nome: string }).nome) : null;
        await tx`
          UPDATE tipi_abbonamento SET
            nome = ${nome},
            durata_giorni = ${dati.durata_giorni},
            attivo = ${dati.attivo}
          WHERE id = ${dati.id}
        `;
        if (vecchio && vecchio !== nome) {
          await tx`UPDATE profili SET tipo_abbonamento = ${nome} WHERE tipo_abbonamento = ${vecchio}`;
        }
      } else {
        const ultimo = await tx`SELECT COALESCE(MAX(ordine), 0) AS ordine FROM tipi_abbonamento`;
        const ordine = Number((ultimo[0] as { ordine: number }).ordine) + 10;
        await tx`
          INSERT INTO tipi_abbonamento (nome, durata_giorni, ordine, attivo)
          VALUES (${nome}, ${dati.durata_giorni}, ${ordine}, ${dati.attivo})
        `;
      }
    });
  } catch (err) {
    erroreDb(err);
  }
}

export async function eliminaTipoAbbonamento(id: string): Promise<void> {
  await richiedeGestore();
  await db()`DELETE FROM tipi_abbonamento WHERE id = ${id}`;
}

export async function aggiornaCertificato(id: string, certificato_scadenza: string | null): Promise<void> {
  await richiedeGestore();
  await db()`UPDATE profili SET certificato_scadenza = ${certificato_scadenza} WHERE id = ${id}`;
}

const TIPI_FOTO = new Set(["image/jpeg", "image/png", "image/webp"]);
const FOTO_MAX_BYTE = 2_500_000;

/** Il cliente salva la propria foto profilo. Il percorso resta stabile, così una nuova foto sostituisce la precedente. */
export async function salvaFotoProfilo(file: { contentType: string; base64: string }): Promise<string> {
  const id = await richiedeUtente();
  if (!TIPI_FOTO.has(file.contentType)) {
    throw new Error("Usa una foto JPG, PNG o WebP.");
  }
  const bytes = Buffer.from(file.base64, "base64");
  if (bytes.length === 0) throw new Error("Il file della foto è vuoto.");
  if (bytes.length > FOTO_MAX_BYTE) throw new Error("La foto deve pesare meno di 2,5 MB.");
  const percorso = `profili/${id}`;
  await db()`
    INSERT INTO media (path, content_type, bytes)
    VALUES (${percorso}, ${file.contentType}, ${bytes})
    ON CONFLICT (path) DO UPDATE SET content_type = EXCLUDED.content_type, bytes = EXCLUDED.bytes
  `;
  await db()`UPDATE profili SET foto_url = ${percorso} WHERE id = ${id}`;
  return percorso;
}

export async function rimuoviFotoProfilo(): Promise<void> {
  const id = await richiedeUtente();
  const percorso = `profili/${id}`;
  await db()`UPDATE profili SET foto_url = NULL WHERE id = ${id}`;
  await db()`DELETE FROM media WHERE path = ${percorso}`;
}

export async function caricaCatalogoObiettivi(soloAttivi: boolean): Promise<Obiettivo[]> {
  await richiedeUtente();
  const righe = soloAttivi
    ? await db()`SELECT * FROM obiettivi WHERE attivo = true ORDER BY ordine ASC`
    : await db()`SELECT * FROM obiettivi ORDER BY ordine ASC`;
  return (righe as Record<string, unknown>[]).map((r) => ({
    id: testo(r.id),
    nome: testo(r.nome),
    descrizione: r.descrizione == null ? null : testo(r.descrizione),
    gruppo: testo(r.gruppo, "generale"),
    ordine: Number(r.ordine ?? 0),
    attivo: booleano(r.attivo, true),
    created_at: isoIstante(r.created_at) ?? "",
    updated_at: isoIstante(r.updated_at) ?? "",
  }));
}

export async function caricaObiettiviCliente(clienteId: string): Promise<string[]> {
  await richiedeSeStessoOGestore(clienteId);
  const righe = await db()`SELECT obiettivo_id FROM cliente_obiettivi WHERE cliente_id = ${clienteId}`;
  return righe.map((r) => testo((r as { obiettivo_id: string }).obiettivo_id));
}

export async function caricaObiettiviNominati(clienteId: string): Promise<
  { data_selezione: string; obiettivi: { nome: string; ordine: number } | null }[]
> {
  await richiedeGestore();
  const righe = await db()`
    SELECT co.data_selezione, o.nome, o.ordine
    FROM cliente_obiettivi co
    JOIN obiettivi o ON o.id = co.obiettivo_id
    WHERE co.cliente_id = ${clienteId}
  `;
  return (righe as Record<string, unknown>[]).map((r) => ({
    data_selezione: isoIstante(r.data_selezione) ?? "",
    obiettivi: { nome: testo(r.nome), ordine: Number(r.ordine ?? 0) },
  }));
}

export async function salvaObiettiviCliente(clienteId: string, selezionati: string[]): Promise<void> {
  const { id, gestore } = await richiedeSeStessoOGestore(clienteId);
  if (!gestore && id !== clienteId) throw new Error("Accesso non consentito.");
  const attuali = await caricaObiettiviCliente(clienteId);
  const daRimuovere = attuali.filter((x) => !selezionati.includes(x));
  const daAggiungere = selezionati.filter((x) => !attuali.includes(x));
  if (daRimuovere.length > 0) {
    await db()`DELETE FROM cliente_obiettivi WHERE cliente_id = ${clienteId} AND obiettivo_id IN ${db()(daRimuovere)}`;
  }
  for (const obiettivoId of daAggiungere) {
    await db()`
      INSERT INTO cliente_obiettivi (cliente_id, obiettivo_id)
      VALUES (${clienteId}, ${obiettivoId})
      ON CONFLICT DO NOTHING
    `;
  }
}

export async function salvaObiettivoCatalogo(dati: {
  id?: string;
  nome: string;
  descrizione: string | null;
  gruppo: string;
  ordine: number;
  attivo: boolean;
}): Promise<void> {
  await richiedeGestore();
  try {
    if (dati.id) {
      await db()`
        UPDATE obiettivi SET
          nome = ${dati.nome}, descrizione = ${dati.descrizione}, gruppo = ${dati.gruppo},
          ordine = ${dati.ordine}, attivo = ${dati.attivo}
        WHERE id = ${dati.id}
      `;
    } else {
      await db()`
        INSERT INTO obiettivi (nome, descrizione, gruppo, ordine, attivo)
        VALUES (${dati.nome}, ${dati.descrizione}, ${dati.gruppo}, ${dati.ordine}, ${dati.attivo})
      `;
    }
  } catch (err) {
    erroreDb(err);
  }
}

export async function eliminaObiettivoCatalogo(id: string): Promise<void> {
  await richiedeGestore();
  await db()`DELETE FROM obiettivi WHERE id = ${id}`;
}

export async function caricaRegole(): Promise<RegolePalestra | null> {
  await richiedeUtente();
  const righe = await db()`
    SELECT id, contenuto, updated_at FROM regole_palestra
    ORDER BY updated_at DESC LIMIT 1
  `;
  const r = righe[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return { id: testo(r.id), contenuto: testo(r.contenuto), updated_at: isoIstante(r.updated_at) ?? "" };
}

export async function salvaRegole(id: string | null, contenuto: string): Promise<void> {
  await richiedeGestore();
  if (id) {
    await db()`UPDATE regole_palestra SET contenuto = ${contenuto} WHERE id = ${id}`;
    return;
  }
  await db()`INSERT INTO regole_palestra (contenuto) VALUES (${contenuto})`;
}

export async function caricaEsercizi(): Promise<Esercizio[]> {
  await richiedeUtente();
  const righe = await db()`SELECT * FROM esercizi ORDER BY ordine ASC`;
  return (righe as Record<string, unknown>[]).map(mappaEsercizio);
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
  await richiedeGestore();
  try {
    if (dati.id) {
      await db()`
        UPDATE esercizi SET
          nome = ${dati.nome}, gruppo_muscolare = ${dati.gruppo_muscolare},
          attrezzatura = ${dati.attrezzatura}, tipo = ${dati.tipo},
          unita_misura = ${dati.unita_misura}, descrizione_esecuzione = ${dati.descrizione_esecuzione},
          errori_comuni = ${dati.errori_comuni}, attivo = ${dati.attivo}, ordine = ${dati.ordine}
        WHERE id = ${dati.id}
      `;
    } else {
      await db()`
        INSERT INTO esercizi (
          nome, gruppo_muscolare, attrezzatura, tipo, unita_misura,
          descrizione_esecuzione, errori_comuni, attivo, ordine
        ) VALUES (
          ${dati.nome}, ${dati.gruppo_muscolare}, ${dati.attrezzatura}, ${dati.tipo},
          ${dati.unita_misura}, ${dati.descrizione_esecuzione}, ${dati.errori_comuni},
          ${dati.attivo}, ${dati.ordine}
        )
      `;
    }
  } catch (err) {
    erroreDb(err);
  }
}

export async function impostaAttivoEsercizio(id: string, attivo: boolean): Promise<void> {
  await richiedeGestore();
  await db()`UPDATE esercizi SET attivo = ${attivo} WHERE id = ${id}`;
}

export async function importaEsercizi(righe: RigaImportata[]): Promise<number> {
  await richiedeGestore();
  if (righe.length === 0) return 0;
  for (const r of righe) {
    const esistenti = await db()`SELECT id FROM esercizi WHERE ordine = ${r.ordine} LIMIT 1`;
    const id = (esistenti[0] as { id?: string } | undefined)?.id;
    const tipo = r.tipo ?? (r.gruppo_muscolare === "cardio" ? "cardio" : "forza");
    const unita = r.unita_misura ?? (tipo === "cardio" ? "minuti" : "serie_ripetizioni");
    if (id) {
      const setNome = r.nome;
      await db()`
        UPDATE esercizi SET
          nome = ${setNome},
          gruppo_muscolare = ${r.gruppo_muscolare},
          attrezzatura = COALESCE(${r.attrezzatura ?? null}, attrezzatura),
          tipo = COALESCE(${r.tipo ?? null}, tipo),
          unita_misura = COALESCE(${r.unita_misura ?? null}, unita_misura),
          descrizione_esecuzione = COALESCE(${r.descrizione_esecuzione ?? null}, descrizione_esecuzione),
          errori_comuni = COALESCE(${r.errori_comuni ?? null}, errori_comuni),
          immagine_url = COALESCE(${r.immagine_url ?? null}, immagine_url),
          attivo = COALESCE(${r.attivo ?? null}, attivo)
        WHERE id = ${id}
      `;
    } else {
      await db()`
        INSERT INTO esercizi (
          nome, gruppo_muscolare, attrezzatura, tipo, unita_misura,
          descrizione_esecuzione, errori_comuni, immagine_url, attivo, ordine
        ) VALUES (
          ${r.nome}, ${r.gruppo_muscolare}, ${r.attrezzatura ?? null}, ${tipo}, ${unita},
          ${r.descrizione_esecuzione ?? null}, ${r.errori_comuni ?? null}, ${r.immagine_url ?? null},
          ${r.attivo ?? true}, ${r.ordine}
        )
      `;
    }
  }
  return righe.length;
}

export async function salvaMedia(path: string, contentType: string, bytes: Uint8Array): Promise<void> {
  await richiedeGestore();
  await db()`
    INSERT INTO media (path, content_type, bytes)
    VALUES (${path}, ${contentType}, ${bytes})
    ON CONFLICT (path) DO UPDATE SET content_type = EXCLUDED.content_type, bytes = EXCLUDED.bytes
  `;
}

export async function caricaImmaginiEsercizi(
  file: { name: string; contentType: string; base64: string }[],
): Promise<{ abbinate: number; nonAbbinate: string[]; errori: string[] }> {
  await richiedeGestore();
  const esercizi = await caricaEsercizi();
  const perNumero = new Map(esercizi.map((e) => [e.ordine, e]));
  const esito = { abbinate: 0, nonAbbinate: [] as string[], errori: [] as string[] };
  for (const f of file) {
    const trovato = f.name.match(/^(\d+)/);
    const numero = trovato ? Number(trovato[1]) : null;
    const esercizio = numero == null ? undefined : perNumero.get(numero);
    if (!esercizio) {
      esito.nonAbbinate.push(f.name);
      continue;
    }
    const percorso = `${String(esercizio.ordine).padStart(3, "0")}/${f.name}`;
    try {
      const bytes = Buffer.from(f.base64, "base64");
      await db()`
        INSERT INTO media (path, content_type, bytes)
        VALUES (${percorso}, ${f.contentType || "application/octet-stream"}, ${bytes})
        ON CONFLICT (path) DO UPDATE SET content_type = EXCLUDED.content_type, bytes = EXCLUDED.bytes
      `;
      await db()`UPDATE esercizi SET immagine_url = ${percorso} WHERE id = ${esercizio.id}`;
      esito.abbinate += 1;
    } catch (err) {
      esito.errori.push(`${f.name}: ${err instanceof Error ? err.message : "errore"}`);
    }
  }
  return esito;
}

export async function caricaImmagineLibera(
  schedaId: string,
  file: { name: string; contentType: string; base64: string },
): Promise<string> {
  await richiedeGestore();
  const nomePulito = file.name.replace(/[^A-Za-z0-9._-]+/g, "-");
  const percorso = `libere/${schedaId}/${Date.now()}-${nomePulito}`;
  const bytes = Buffer.from(file.base64, "base64");
  await db()`
    INSERT INTO media (path, content_type, bytes)
    VALUES (${percorso}, ${file.contentType || "application/octet-stream"}, ${bytes})
    ON CONFLICT (path) DO UPDATE SET content_type = EXCLUDED.content_type, bytes = EXCLUDED.bytes
  `;
  return percorso;
}

export async function leggiMedia(path: string): Promise<{ contentType: string; bytes: Uint8Array } | null> {
  await assicuraSchema();
  const id = await idUtenteCorrente();
  if (!id) return null;
  const righe = await db()`SELECT content_type, bytes FROM media WHERE path = ${path} LIMIT 1`;
  const r = righe[0] as { content_type: string; bytes: Uint8Array } | undefined;
  if (!r) return null;
  return { contentType: r.content_type, bytes: r.bytes };
}

export async function caricaSchedaAttiva(clienteId: string): Promise<Scheda | null> {
  await richiedeGestore();
  const righe = await db()`
    SELECT * FROM schede WHERE cliente_id = ${clienteId} AND stato = 'attiva' LIMIT 1
  `;
  const r = righe[0] as Record<string, unknown> | undefined;
  return r ? mappaScheda(r) : null;
}

export async function caricaSchedaClienteAttiva(clienteId: string): Promise<Scheda | null> {
  await richiedeSeStessoOGestore(clienteId);
  const oggi = oggiRoma();
  const righe = await db()`
    SELECT * FROM schede
    WHERE cliente_id = ${clienteId} AND stato = 'attiva' AND data_inizio <= ${oggi}::date
    LIMIT 1
  `;
  const r = righe[0] as Record<string, unknown> | undefined;
  return r ? mappaScheda(r) : null;
}

export async function caricaSchedaPerAllenamento(clienteId: string): Promise<Scheda | null> {
  const attiva = await caricaSchedaClienteAttiva(clienteId);
  if (attiva) return attiva;
  const aperti = await db()`
    SELECT scheda_id FROM allenamenti
    WHERE cliente_id = ${clienteId} AND completato_at IS NULL AND scheda_id IS NOT NULL
    ORDER BY created_at DESC LIMIT 1
  `;
  const schedaId = (aperti[0] as { scheda_id?: string } | undefined)?.scheda_id;
  if (!schedaId) return null;
  const righe = await db()`SELECT * FROM schede WHERE id = ${schedaId} LIMIT 1`;
  const r = righe[0] as Record<string, unknown> | undefined;
  return r ? mappaScheda(r) : null;
}

export async function caricaEserciziScheda(schedaId: string): Promise<SchedaEsercizio[]> {
  await richiedeUtente();
  const righe = await db()`
    SELECT se.*,
      e.nome AS e_nome,
      e.gruppo_muscolare AS e_gruppo,
      e.unita_misura AS e_unita,
      e.immagine_url AS e_immagine,
      e.video_url AS e_video,
      e.descrizione_esecuzione AS e_descrizione,
      e.errori_comuni AS e_errori,
      e.licenza AS e_licenza,
      e.autore AS e_autore
    FROM scheda_esercizi se
    LEFT JOIN esercizi e ON e.id = se.esercizio_id
    WHERE se.scheda_id = ${schedaId}
    ORDER BY se.ordine ASC
  `;
  return (righe as Record<string, unknown>[]).map((r) => ({
    id: testo(r.id),
    scheda_id: testo(r.scheda_id),
    esercizio_id: r.esercizio_id == null ? null : testo(r.esercizio_id),
    nome_libero: r.nome_libero == null ? null : testo(r.nome_libero),
    descrizione_libera: r.descrizione_libera == null ? null : testo(r.descrizione_libera),
    immagine_libera_url: r.immagine_libera_url == null ? null : testo(r.immagine_libera_url),
    sessione: testo(r.sessione),
    ordine: Number(r.ordine ?? 0),
    serie: numeroONull(r.serie),
    ripetizioni: r.ripetizioni == null ? null : testo(r.ripetizioni),
    durata_minuti: numeroONull(r.durata_minuti),
    recupero_secondi: numeroONull(r.recupero_secondi),
    carico_indicativo: r.carico_indicativo == null ? null : testo(r.carico_indicativo),
    note: r.note == null ? null : testo(r.note),
    metodo: metodoDaTesto(r.metodo),
    gruppo: r.gruppo == null || testo(r.gruppo) === "" ? null : testo(r.gruppo),
    tempo: r.tempo == null || testo(r.tempo) === "" ? null : testo(r.tempo),
    esercizi: r.e_nome
      ? {
          nome: testo(r.e_nome),
          gruppo_muscolare: testo(r.e_gruppo),
          unita_misura: r.e_unita as UnitaMisura,
          immagine_url: r.e_immagine == null ? null : testo(r.e_immagine),
          video_url: r.e_video == null ? null : testo(r.e_video),
          descrizione_esecuzione: r.e_descrizione == null ? null : testo(r.e_descrizione),
          errori_comuni: r.e_errori == null ? null : testo(r.e_errori),
          licenza: r.e_licenza == null ? null : testo(r.e_licenza),
          autore: r.e_autore == null ? null : testo(r.e_autore),
        }
      : null,
  }));
}

export async function archiviaScheda(schedaId: string): Promise<void> {
  await richiedeGestore();
  await db()`
    UPDATE schede SET stato = 'archiviata', archiviata_at = now() WHERE id = ${schedaId}
  `;
}

export async function caricaScadenzePerClienti(clientiId: string[]): Promise<Record<string, string>> {
  await richiedeGestore();
  if (clientiId.length === 0) return {};
  const oggi = oggiRoma();
  const righe = await db()`
    SELECT cliente_id, data_scadenza FROM schede
    WHERE cliente_id IN ${db()(clientiId)} AND stato = 'attiva' AND data_inizio <= ${oggi}::date
  `;
  const mappa: Record<string, string> = {};
  for (const r of righe as { cliente_id: string; data_scadenza: unknown }[]) {
    const d = isoData(r.data_scadenza);
    if (d) mappa[r.cliente_id] = d;
  }
  return mappa;
}

export async function caricaSchedeCliente(clienteId: string): Promise<Scheda[]> {
  await richiedeGestore();
  const righe = await db()`
    SELECT * FROM schede WHERE cliente_id = ${clienteId} ORDER BY created_at DESC
  `;
  return (righe as Record<string, unknown>[]).map(mappaScheda);
}

export async function salvaOrdine(righe: { id: string; ordine: number }[]): Promise<void> {
  await richiedeGestore();
  const posizioni = righe.map((r) => r.ordine).sort((a, b) => a - b);
  for (const [indice, riga] of righe.entries()) {
    const nuovo = posizioni[indice]!;
    if (nuovo === riga.ordine) continue;
    await db()`UPDATE scheda_esercizi SET ordine = ${nuovo} WHERE id = ${riga.id}`;
  }
}

export async function duplicaScheda(
  origineId: string,
  dataInizio: string,
  dataScadenza: string,
  titolo?: string,
): Promise<string> {
  await richiedeGestore();
  const origini = await db()`SELECT * FROM schede WHERE id = ${origineId} LIMIT 1`;
  const origine = origini[0] as Record<string, unknown> | undefined;
  if (!origine) throw new Error("Scheda non trovata.");
  const titoloNuovo = (titolo ?? "").trim() || testo(origine.titolo);
  const inserite = await db()`
    INSERT INTO schede (cliente_id, titolo, data_inizio, data_scadenza, stato, note_gestore)
    VALUES (${testo(origine.cliente_id)}, ${titoloNuovo}, ${dataInizio}, ${dataScadenza}, 'attiva', ${origine.note_gestore == null ? null : testo(origine.note_gestore)})
    RETURNING id
  `;
  const nuovaId = testo((inserite[0] as { id: string }).id);
  const righe = await caricaEserciziScheda(origineId);
  for (const r of righe) {
    await db()`
      INSERT INTO scheda_esercizi (
        scheda_id, esercizio_id, nome_libero, descrizione_libera, immagine_libera_url,
        sessione, ordine, serie, ripetizioni, durata_minuti, recupero_secondi, carico_indicativo, note,
        metodo, gruppo, tempo
      ) VALUES (
        ${nuovaId}, ${r.esercizio_id}, ${r.nome_libero}, ${r.descrizione_libera}, ${r.immagine_libera_url},
        ${r.sessione}, ${r.ordine}, ${r.serie}, ${r.ripetizioni}, ${r.durata_minuti},
        ${r.recupero_secondi}, ${r.carico_indicativo}, ${r.note},
        ${r.metodo}, ${r.gruppo}, ${r.tempo}
      )
    `;
  }
  return nuovaId;
}

export async function salvaScheda(dati: {
  id?: string;
  cliente_id: string;
  titolo: string;
  data_inizio: string;
  data_scadenza: string;
  note_gestore: string | null;
}): Promise<void> {
  await richiedeGestore();
  if (dati.id) {
    await db()`
      UPDATE schede SET
        titolo = ${dati.titolo}, data_inizio = ${dati.data_inizio},
        data_scadenza = ${dati.data_scadenza}, note_gestore = ${dati.note_gestore}
      WHERE id = ${dati.id}
    `;
  } else {
    await db()`
      INSERT INTO schede (cliente_id, titolo, data_inizio, data_scadenza, stato, note_gestore)
      VALUES (${dati.cliente_id}, ${dati.titolo}, ${dati.data_inizio}, ${dati.data_scadenza}, 'attiva', ${dati.note_gestore})
    `;
  }
}

export async function inserisciRigaScheda(dati: {
  scheda_id: string;
  esercizio_id: string | null;
  nome_libero: string | null;
  descrizione_libera: string | null;
  immagine_libera_url: string | null;
  sessione: string;
  ordine: number;
  serie: number | null;
  ripetizioni: string | null;
  durata_minuti: number | null;
  recupero_secondi: number | null;
  carico_indicativo: string | null;
  note: string | null;
}): Promise<void> {
  await richiedeGestore();
  await db()`
    INSERT INTO scheda_esercizi (
      scheda_id, esercizio_id, nome_libero, descrizione_libera, immagine_libera_url,
      sessione, ordine, serie, ripetizioni, durata_minuti, recupero_secondi, carico_indicativo, note
    ) VALUES (
      ${dati.scheda_id}, ${dati.esercizio_id}, ${dati.nome_libero}, ${dati.descrizione_libera},
      ${dati.immagine_libera_url}, ${dati.sessione}, ${dati.ordine}, ${dati.serie}, ${dati.ripetizioni},
      ${dati.durata_minuti}, ${dati.recupero_secondi}, ${dati.carico_indicativo}, ${dati.note}
    )
  `;
}

export async function aggiornaRigaScheda(
  id: string,
  valori: {
    serie: number | null;
    ripetizioni: string | null;
    durata_minuti: number | null;
    recupero_secondi: number | null;
    carico_indicativo: string | null;
    note: string | null;
    metodo: string;
    gruppo: string | null;
    tempo: string | null;
  },
): Promise<void> {
  await richiedeGestore();
  const metodo = metodoScheda(valori.metodo);
  const gruppo = metodo === "normale" ? null : valori.gruppo;
  await db()`
    UPDATE scheda_esercizi SET
      serie = ${valori.serie}, ripetizioni = ${valori.ripetizioni},
      durata_minuti = ${valori.durata_minuti}, recupero_secondi = ${valori.recupero_secondi},
      carico_indicativo = ${valori.carico_indicativo}, note = ${valori.note},
      metodo = ${metodo}, gruppo = ${gruppo}, tempo = ${valori.tempo}
    WHERE id = ${id}
  `;
}

export async function eliminaRigaScheda(id: string): Promise<void> {
  await richiedeGestore();
  await db()`DELETE FROM scheda_esercizi WHERE id = ${id}`;
}

async function righeStoriche(clienteId: string) {
  const righe = await db()`
    SELECT
      ae.peso_kg, ae.ripetizioni_effettive, ae.durata_minuti, ae.created_at,
      se.esercizio_id, se.nome_libero,
      a.cliente_id, a.data, a.completato_at
    FROM allenamento_esercizi ae
    JOIN allenamenti a ON a.id = ae.allenamento_id
    LEFT JOIN scheda_esercizi se ON se.id = ae.scheda_esercizio_id
    WHERE a.cliente_id = ${clienteId}
    ORDER BY ae.created_at DESC
    LIMIT 1000
  `;
  return righe as Record<string, unknown>[];
}

export async function ultimiValori(clienteId: string): Promise<Record<string, ValoriEsercizio>> {
  await richiedeSeStessoOGestore(clienteId);
  const righe = await righeStoriche(clienteId);
  const mappa: Record<string, ValoriEsercizio> = {};
  for (const r of righe) {
    if (r.esercizio_id == null && r.nome_libero == null) continue;
    const chiave = chiaveEsercizio({
      esercizio_id: r.esercizio_id == null ? null : testo(r.esercizio_id),
      nome_libero: r.nome_libero == null ? null : testo(r.nome_libero),
    });
    if (mappa[chiave]) continue;
    mappa[chiave] = {
      peso_kg: numeroONull(r.peso_kg),
      ripetizioni_effettive: r.ripetizioni_effettive == null ? null : testo(r.ripetizioni_effettive),
      durata_minuti: numeroONull(r.durata_minuti),
    };
  }
  return mappa;
}

export async function andamentoCarico(
  clienteId: string,
): Promise<{ chiave: string; nome: string; punti: PuntoCarico[] }[]> {
  await richiedeGestore();
  const righe = await righeStoriche(clienteId);
  const catalogo = await db()`SELECT id, nome FROM esercizi`;
  const nomi: Record<string, string> = {};
  for (const e of catalogo as { id: string; nome: string }[]) nomi[e.id] = e.nome;
  const gruppi = new Map<string, PuntoCarico[]>();
  for (const r of righe) {
    if (r.peso_kg == null && r.durata_minuti == null) continue;
    if (r.esercizio_id == null && r.nome_libero == null) continue;
    const chiave = chiaveEsercizio({
      esercizio_id: r.esercizio_id == null ? null : testo(r.esercizio_id),
      nome_libero: r.nome_libero == null ? null : testo(r.nome_libero),
    });
    const punti = gruppi.get(chiave) ?? [];
    punti.push({
      data: isoData(r.data) ?? "",
      peso_kg: numeroONull(r.peso_kg),
      durata_minuti: numeroONull(r.durata_minuti),
    });
    gruppi.set(chiave, punti);
  }
  return Array.from(gruppi.entries()).map(([chiave, punti]) => ({
    chiave,
    nome: nomi[chiave] ?? chiave.replace(/^libero:/, ""),
    punti: punti.slice(0, 8).reverse(),
  }));
}

export async function caricaStorico(clienteId: string): Promise<Allenamento[]> {
  await richiedeSeStessoOGestore(clienteId);
  const righe = await db()`
    SELECT * FROM allenamenti
    WHERE cliente_id = ${clienteId}
    ORDER BY data DESC, created_at DESC
  `;
  return (righe as Record<string, unknown>[]).map(mappaAllenamento);
}

export async function caricaStoricoDettagliato(clienteId: string): Promise<AllenamentoConDettaglio[]> {
  const storico = await caricaStorico(clienteId);
  const risultato: AllenamentoConDettaglio[] = [];
  for (const a of storico) {
    const titolo = a.scheda_id
      ? ((await db()`SELECT titolo FROM schede WHERE id = ${a.scheda_id} LIMIT 1`)[0] as
          | { titolo?: string }
          | undefined)?.titolo
      : undefined;
    const righe = await db()`
      SELECT
        ae.id, ae.completato, ae.peso_kg, ae.ripetizioni_effettive, ae.durata_minuti, ae.note,
        se.esercizio_id, se.nome_libero, se.serie, se.ordine,
        e.nome AS e_nome, e.unita_misura AS e_unita
      FROM allenamento_esercizi ae
      LEFT JOIN scheda_esercizi se ON se.id = ae.scheda_esercizio_id
      LEFT JOIN esercizi e ON e.id = se.esercizio_id
      WHERE ae.allenamento_id = ${a.id}
      ORDER BY se.ordine ASC NULLS LAST
    `;
    const allenamento_esercizi: EsercizioDettaglio[] = (righe as Record<string, unknown>[]).map((r) => ({
      id: testo(r.id),
      completato: booleano(r.completato),
      peso_kg: numeroONull(r.peso_kg),
      ripetizioni_effettive: r.ripetizioni_effettive == null ? null : testo(r.ripetizioni_effettive),
      durata_minuti: numeroONull(r.durata_minuti),
      note: r.note == null ? null : testo(r.note),
      scheda_esercizi: r.esercizio_id == null && r.nome_libero == null
        ? null
        : {
            esercizio_id: r.esercizio_id == null ? null : testo(r.esercizio_id),
            nome_libero: r.nome_libero == null ? null : testo(r.nome_libero),
            serie: numeroONull(r.serie),
            ordine: Number(r.ordine ?? 0),
            esercizi: r.e_nome ? { nome: testo(r.e_nome), unita_misura: testo(r.e_unita) } : null,
          },
    }));
    risultato.push({
      ...a,
      schede: titolo ? { titolo: testo(titolo) } : null,
      allenamento_esercizi,
    });
  }
  return risultato;
}

export async function apriAllenamento(
  clienteId: string,
  schedaId: string,
  sessione: string,
  oggi: string,
): Promise<Allenamento> {
  await richiedeSeStessoOGestore(clienteId);
  const esistenti = await db()`
    SELECT * FROM allenamenti
    WHERE cliente_id = ${clienteId} AND scheda_id = ${schedaId}
      AND sessione = ${sessione} AND data = ${oggi}::date AND completato_at IS NULL
    LIMIT 1
  `;
  const esistente = esistenti[0] as Record<string, unknown> | undefined;
  if (esistente) return mappaAllenamento(esistente);
  const inseriti = await db()`
    INSERT INTO allenamenti (cliente_id, scheda_id, sessione, data)
    VALUES (${clienteId}, ${schedaId}, ${sessione}, ${oggi}::date)
    RETURNING *
  `;
  return mappaAllenamento(inseriti[0] as Record<string, unknown>);
}

export async function caricaRigheAllenamento(allenamentoId: string): Promise<RigaAllenamento[]> {
  await richiedeUtente();
  const righe = await db()`SELECT * FROM allenamento_esercizi WHERE allenamento_id = ${allenamentoId}`;
  return (righe as Record<string, unknown>[]).map((r) => ({
    id: testo(r.id),
    allenamento_id: testo(r.allenamento_id),
    scheda_esercizio_id: r.scheda_esercizio_id == null ? null : testo(r.scheda_esercizio_id),
    completato: booleano(r.completato),
    peso_kg: numeroONull(r.peso_kg),
    ripetizioni_effettive: r.ripetizioni_effettive == null ? null : testo(r.ripetizioni_effettive),
    durata_minuti: numeroONull(r.durata_minuti),
    note: r.note == null ? null : testo(r.note),
  }));
}

export async function salvaRigaAllenamento(
  allenamentoId: string,
  schedaEsercizioId: string,
  valori: { completato: boolean } & ValoriEsercizio & { note?: string | null },
): Promise<void> {
  await richiedeUtente();
  await db()`
    INSERT INTO allenamento_esercizi (
      allenamento_id, scheda_esercizio_id, completato, peso_kg, ripetizioni_effettive, durata_minuti, note
    ) VALUES (
      ${allenamentoId}, ${schedaEsercizioId}, ${valori.completato}, ${valori.peso_kg},
      ${valori.ripetizioni_effettive}, ${valori.durata_minuti}, ${valori.note ?? null}
    )
    ON CONFLICT (allenamento_id, scheda_esercizio_id) DO UPDATE SET
      completato = EXCLUDED.completato,
      peso_kg = EXCLUDED.peso_kg,
      ripetizioni_effettive = EXCLUDED.ripetizioni_effettive,
      durata_minuti = EXCLUDED.durata_minuti,
      note = EXCLUDED.note
  `;
}

export async function terminaAllenamento(allenamentoId: string, noteCliente: string | null): Promise<void> {
  await richiedeUtente();
  await db()`
    UPDATE allenamenti SET completato_at = now(), note_cliente = ${noteCliente}
    WHERE id = ${allenamentoId}
  `;
}

export async function caricaNumeriDashboard() {
  await richiedeGestore();
  const oggi = oggiRoma();
  const settimanaFa = new Date(`${oggi}T00:00:00Z`);
  settimanaFa.setUTCDate(settimanaFa.getUTCDate() - 6);
  const daData = settimanaFa.toISOString().slice(0, 10);
  const gestori = new Set(await caricaIdGestori());

  const [attesa, approvati, schede, allenamenti, esercizi] = await Promise.all([
    db()`SELECT id FROM profili WHERE stato = 'in_attesa'`,
    db()`SELECT id, certificato_scadenza, abbonamento_scadenza FROM profili WHERE stato = 'approvato'`,
    db()`SELECT cliente_id, data_scadenza FROM schede WHERE stato = 'attiva' AND data_inizio <= ${oggi}::date`,
    db()`SELECT id, cliente_id FROM allenamenti WHERE completato_at IS NOT NULL AND data >= ${daData}::date`,
    db()`SELECT count(*)::int AS n FROM esercizi WHERE attivo = true`,
  ]);

  const clientiApprovati = (approvati as { id: string; certificato_scadenza: unknown; abbonamento_scadenza: unknown }[])
    .filter((p) => !gestori.has(p.id));
  const idApprovati = clientiApprovati.map((p) => p.id);
  const certificati = clientiApprovati.filter((p) => certificatoDaRinnovare(isoData(p.certificato_scadenza))).length;
  const abbonamenti = clientiApprovati.filter((p) => abbonamentoDaRinnovare(isoData(p.abbonamento_scadenza))).length;
  const inAttesaClienti = (attesa as { id: string }[]).filter((p) => !gestori.has(p.id)).length;
  const allenamentiClienti = (allenamenti as { id: string; cliente_id: string }[]).filter(
    (a) => !gestori.has(a.cliente_id),
  ).length;
  const scadenzePerCliente = new Map<string, string>();
  for (const r of schede as { cliente_id: string; data_scadenza: unknown }[]) {
    const d = isoData(r.data_scadenza);
    if (d) scadenzePerCliente.set(r.cliente_id, d);
  }
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
    certificati,
    abbonamenti,
    allenamenti7: allenamentiClienti,
    eserciziAttivi: Number((esercizi[0] as { n?: number } | undefined)?.n ?? 0),
  };
}

export async function caricaAllenamentiRecenti() {
  await richiedeGestore();
  const oggi = oggiRoma();
  const settimanaFa = new Date(`${oggi}T00:00:00Z`);
  settimanaFa.setUTCDate(settimanaFa.getUTCDate() - 6);
  const daData = settimanaFa.toISOString().slice(0, 10);
  const gestori = new Set(await caricaIdGestori());
  const righe = await db()`
    SELECT id, cliente_id, sessione, data, completato_at FROM allenamenti
    WHERE completato_at IS NOT NULL AND data >= ${daData}::date
    ORDER BY data DESC, completato_at DESC
  `;
  const filtrate = (righe as { id: string; cliente_id: string; sessione: string; data: unknown }[]).filter(
    (r) => !gestori.has(r.cliente_id),
  );
  if (filtrate.length === 0) return [];
  const ids = Array.from(new Set(filtrate.map((r) => r.cliente_id)));
  const profili = await db()`SELECT id, nome, cognome FROM profili WHERE id IN ${db()(ids)}`;
  const nomi = new Map<string, string>();
  for (const p of profili as { id: string; nome: string; cognome: string }[]) {
    nomi.set(p.id, `${p.nome} ${p.cognome}`.trim());
  }
  return filtrate.map((r) => ({
    id: r.id,
    nome: nomi.get(r.cliente_id) ?? "Cliente",
    sessione: r.sessione || "Allenamento",
    data: isoData(r.data) ?? "",
  }));
}

export async function datiEsportazione(clienteId?: string) {
  await richiedeGestore();
  const gestori = clienteId ? new Set<string>() : new Set(await caricaIdGestori());
  const profili = clienteId
    ? await db()`SELECT * FROM profili WHERE id = ${clienteId}`
    : await db()`SELECT * FROM profili ORDER BY cognome ASC`;
  const profiliOk = (profili as Record<string, unknown>[])
    .map(mappaProfilo)
    .filter((p) => !gestori.has(p.id));
  const idClienti = profiliOk.map((p) => p.id);

  const obiettiviRighe =
    idClienti.length === 0
      ? []
      : ((await db()`
          SELECT co.cliente_id, o.nome, o.ordine
          FROM cliente_obiettivi co JOIN obiettivi o ON o.id = co.obiettivo_id
          WHERE co.cliente_id IN ${db()(idClienti)}
        `) as { cliente_id: string; nome: string; ordine: number }[]);

  const schede =
    idClienti.length === 0
      ? []
      : ((await db()`
          SELECT id, cliente_id, titolo, data_inizio, data_scadenza, stato, archiviata_at
          FROM schede WHERE cliente_id IN ${db()(idClienti)} ORDER BY data_inizio ASC
        `) as Record<string, unknown>[]);

  const allenamenti =
    idClienti.length === 0
      ? []
      : ((await db()`
          SELECT id, cliente_id, scheda_id, sessione, data, created_at, completato_at
          FROM allenamenti WHERE cliente_id IN ${db()(idClienti)} ORDER BY data ASC
        `) as Record<string, unknown>[]);

  const catalogo = (await db()`
    SELECT ordine, nome, gruppo_muscolare, attrezzatura, tipo, unita_misura,
           descrizione_esecuzione, errori_comuni, immagine_url, attivo
    FROM esercizi ORDER BY ordine ASC
  `) as Record<string, unknown>[];

  const idSchede = schede.map((s) => testo(s.id));
  const righeSchede =
    idSchede.length === 0
      ? []
      : ((await db()`
          SELECT se.id, se.scheda_id, se.sessione, se.ordine, se.nome_libero, se.serie,
                 se.ripetizioni, se.durata_minuti, se.recupero_secondi, se.carico_indicativo, se.note,
                 e.nome AS e_nome
          FROM scheda_esercizi se
          LEFT JOIN esercizi e ON e.id = se.esercizio_id
          WHERE se.scheda_id IN ${db()(idSchede)}
          ORDER BY se.ordine ASC
        `) as Record<string, unknown>[]);

  const idAllenamenti = allenamenti.map((a) => testo(a.id));
  const righeSvolte =
    idAllenamenti.length === 0
      ? []
      : ((await db()`
          SELECT allenamento_id, scheda_esercizio_id, completato, peso_kg, ripetizioni_effettive, durata_minuti
          FROM allenamento_esercizi WHERE allenamento_id IN ${db()(idAllenamenti)}
        `) as Record<string, unknown>[]);

  return {
    profili: profiliOk,
    obiettivi: obiettiviRighe.map((r) => ({
      cliente_id: r.cliente_id,
      obiettivi: { nome: r.nome, ordine: Number(r.ordine) },
    })),
    schede: schede.map((s) => ({
      id: testo(s.id),
      cliente_id: testo(s.cliente_id),
      titolo: testo(s.titolo),
      data_inizio: isoData(s.data_inizio) ?? "",
      data_scadenza: isoData(s.data_scadenza) ?? "",
      stato: testo(s.stato),
      archiviata_at: isoIstante(s.archiviata_at),
    })),
    allenamenti: allenamenti.map((a) => ({
      id: testo(a.id),
      cliente_id: testo(a.cliente_id),
      scheda_id: a.scheda_id == null ? null : testo(a.scheda_id),
      sessione: testo(a.sessione),
      data: isoData(a.data) ?? "",
      created_at: isoIstante(a.created_at) ?? "",
      completato_at: isoIstante(a.completato_at),
    })),
    catalogo: catalogo.map((e) => ({
      ordine: Number(e.ordine),
      nome: testo(e.nome),
      gruppo_muscolare: testo(e.gruppo_muscolare),
      attrezzatura: e.attrezzatura == null ? null : testo(e.attrezzatura),
      tipo: testo(e.tipo),
      unita_misura: testo(e.unita_misura),
      descrizione_esecuzione: e.descrizione_esecuzione == null ? null : testo(e.descrizione_esecuzione),
      errori_comuni: e.errori_comuni == null ? null : testo(e.errori_comuni),
      immagine_url: e.immagine_url == null ? null : testo(e.immagine_url),
      attivo: booleano(e.attivo, true),
    })),
    righeSchede: righeSchede.map((r) => ({
      id: testo(r.id),
      scheda_id: testo(r.scheda_id),
      sessione: testo(r.sessione),
      ordine: Number(r.ordine ?? 0),
      nome_libero: r.nome_libero == null ? null : testo(r.nome_libero),
      serie: numeroONull(r.serie),
      ripetizioni: r.ripetizioni == null ? null : testo(r.ripetizioni),
      durata_minuti: numeroONull(r.durata_minuti),
      recupero_secondi: numeroONull(r.recupero_secondi),
      carico_indicativo: r.carico_indicativo == null ? null : testo(r.carico_indicativo),
      note: r.note == null ? null : testo(r.note),
      esercizi: r.e_nome ? { nome: testo(r.e_nome) } : null,
    })),
    righeSvolte: righeSvolte.map((r) => ({
      allenamento_id: testo(r.allenamento_id),
      scheda_esercizio_id: r.scheda_esercizio_id == null ? null : testo(r.scheda_esercizio_id),
      completato: booleano(r.completato),
      peso_kg: numeroONull(r.peso_kg),
      ripetizioni_effettive: r.ripetizioni_effettive == null ? null : testo(r.ripetizioni_effettive),
      durata_minuti: numeroONull(r.durata_minuti),
    })),
  };
}
