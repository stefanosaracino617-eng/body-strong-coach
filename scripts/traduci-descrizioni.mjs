/**
 * Traduce in italiano le descrizioni ancora in inglese e le salva
 * in data/descrizioni-it.json, aggiornando anche il database locale.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function caricaEnv() {
  const file = resolve(process.cwd(), ".env");
  if (!existsSync(file)) return;
  for (const riga of readFileSync(file, "utf8").split("\n")) {
    const testo = riga.trim();
    if (!testo || testo.startsWith("#")) continue;
    const eq = testo.indexOf("=");
    if (eq < 0) continue;
    const chiave = testo.slice(0, eq).trim();
    let valore = testo.slice(eq + 1).trim();
    if (
      (valore.startsWith('"') && valore.endsWith('"')) ||
      (valore.startsWith("'") && valore.endsWith("'"))
    ) {
      valore = valore.slice(1, -1);
    }
    if (process.env[chiave] === undefined) process.env[chiave] = valore;
  }
}

function sembraItaliano(testo) {
  const t = testo.toLowerCase();
  const it = (t.match(/\b(il|lo|la|i|gli|le|un|una|di|che|per|con|del|della|nella|sul|esercizio|sdraiati|sdraiati|in piedi|ripeti|afferra|spingi|solleva)\b/g) || []).length;
  const en = (t.match(/\b(the|and|with|your|from|this|exercise|lie|stand|hold|press|then|keep|slowly)\b/g) || []).length;
  return it > en && it >= 2;
}

function utile(testo) {
  const pulito = testo.trim();
  if (pulito.length < 8) return false;
  if (/^[\s.\-–—]+$/.test(pulito)) return false;
  return true;
}

async function traduci(testo) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", "it");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", testo);
  let ultimo;
  for (let tentativo = 0; tentativo < 4; tentativo += 1) {
    const risposta = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (risposta.status === 429 || risposta.status >= 500) {
      ultimo = new Error(`HTTP ${risposta.status}`);
      await new Promise((r) => setTimeout(r, 800 * (tentativo + 1)));
      continue;
    }
    if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
    const dati = await risposta.json();
    const parti = Array.isArray(dati?.[0]) ? dati[0].map((p) => p?.[0] ?? "").join("") : "";
    if (!parti.trim()) throw new Error("traduzione vuota");
    return parti;
  }
  throw ultimo ?? new Error("traduzione non riuscita");
}

async function pool(elementi, limite, lavoro) {
  let indice = 0;
  async function operaio() {
    while (indice < elementi.length) {
      const corrente = indice;
      indice += 1;
      await lavoro(elementi[corrente], corrente);
    }
  }
  await Promise.all(Array.from({ length: limite }, () => operaio()));
}

caricaEnv();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Manca DATABASE_URL");
const sql = postgres(databaseUrl, { max: 4, ssl: false });
const righe = await sql`
  SELECT id, fonte_id, nome, descrizione_esecuzione
  FROM esercizi
  WHERE descrizione_esecuzione IS NOT NULL
  ORDER BY ordine
`;

const destinazione = resolve(process.cwd(), "data/descrizioni-it.json");
mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
const gia = existsSync(destinazione) ? JSON.parse(readFileSync(destinazione, "utf8")) : [];
const fatte = new Map(gia.filter((v) => v.fonte_id).map((v) => [v.fonte_id, v]));

const daFare = righe.filter((r) => {
  if (!r.fonte_id || !utile(r.descrizione_esecuzione)) return false;
  if (fatte.has(r.fonte_id)) return false;
  if (sembraItaliano(r.descrizione_esecuzione)) return false;
  return true;
});

console.log(`da tradurre ${daFare.length}, già pronte ${fatte.size}`);

let fatteOra = 0;
let errori = 0;
await pool(daFare, 4, async (riga) => {
  try {
    const descrizione = await traduci(riga.descrizione_esecuzione);
    await sql`UPDATE esercizi SET descrizione_esecuzione = ${descrizione} WHERE id = ${riga.id}`;
    fatte.set(riga.fonte_id, {
      fonte_id: riga.fonte_id,
      originale: riga.descrizione_esecuzione,
      descrizione,
    });
    fatteOra += 1;
    if (fatteOra % 10 === 0) {
      writeFileSync(destinazione, JSON.stringify([...fatte.values()]));
      console.log(`tradotte ${fatteOra}/${daFare.length}`);
    }
  } catch (err) {
    errori += 1;
    console.log(`errore ${riga.nome}: ${err instanceof Error ? err.message : err}`);
  }
});

writeFileSync(destinazione, JSON.stringify([...fatte.values()]));
console.log(JSON.stringify({ tradotte: fatteOra, errori, totale: fatte.size }));
await sql.end();
