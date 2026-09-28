/**
 * Importa il catalogo esercizi di wger (testi CC-BY-SA, immagini con la licenza di ciascuna).
 * I video restano un collegamento: i file originali sono MOV/HEVC, pesanti e poco riproducibili nel browser.
 * Eseguire dalla radice del progetto: node scripts/importa-wger.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function caricaEnv() {
  const file = resolve(process.cwd(), ".env");
  if (!existsSync(file)) throw new Error("Manca il file .env");
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

function pulisciHtml(html) {
  if (!html) return null;
  const testo = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return testo || null;
}

const GRUPPO_MUSCOLO = {
  Shoulders: "spalle e trapezio",
  Trapezius: "spalle e trapezio",
  Biceps: "bicipiti e brachiale",
  Brachialis: "bicipiti e brachiale",
  Triceps: "tricipiti",
  Lats: "dorsali",
  Hamstrings: "gambe e glutei",
  Glutes: "gambe e glutei",
  Quads: "gambe e glutei",
  Calves: "polpacci",
  Soleus: "polpacci",
  Abs: "addominali",
  "Obliquus externus abdominis": "addominali",
  Chest: "pettorali",
  "Serratus anterior": "pettorali",
};

const GRUPPO_CATEGORIA = {
  Abs: "addominali",
  Arms: "bicipiti e brachiale",
  Back: "dorsali",
  Calves: "polpacci",
  Cardio: "cardio",
  Chest: "pettorali",
  Legs: "gambe e glutei",
  Shoulders: "spalle e trapezio",
};

const ATTREZZATURA = {
  Barbell: "Bilanciere",
  Bench: "Panca",
  "Cable machine": "Cavi",
  Dumbbell: "Manubri",
  "Gym mat": "Tappetino",
  "Incline bench": "Panca inclinata",
  Kettlebell: "Kettlebell",
  "Pull-up bar": "Sbarra",
  "Resistance band": "Elastico",
  "SZ-Bar": "Bilanciere EZ",
  "Swiss Ball": "Fitball",
  "none (bodyweight exercise)": "Corpo libero",
};

function gruppoDi(esercizio) {
  const muscolo = esercizio.muscles?.[0]?.name_en;
  if (muscolo && GRUPPO_MUSCOLO[muscolo]) return GRUPPO_MUSCOLO[muscolo];
  const categoria = esercizio.category?.name;
  return GRUPPO_CATEGORIA[categoria] ?? "gambe e glutei";
}

function traduzione(esercizio) {
  const elenco = esercizio.translations ?? [];
  return elenco.find((t) => t.language === 13) ?? elenco.find((t) => t.language === 2) ?? elenco[0];
}

function videoDi(esercizio) {
  const elenco = esercizio.videos ?? [];
  const scelto = elenco.find((v) => v.is_main) ?? elenco[0];
  return scelto?.video ?? null;
}

function immagineDi(esercizio) {
  const elenco = esercizio.images ?? [];
  const scelto = elenco.find((i) => i.is_main) ?? elenco[0];
  if (!scelto) return null;
  return scelto.thumbnails?.medium || scelto.image;
}

async function scarica(url) {
  const risposta = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
  const bytes = Buffer.from(await risposta.arrayBuffer());
  if (bytes.length > 1_500_000) throw new Error("immagine troppo grande");
  const tipo = risposta.headers.get("content-type")?.split(";")[0] || "image/png";
  return { bytes, tipo };
}

caricaEnv();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Manca DATABASE_URL");
const sql = postgres(databaseUrl, {
  max: 4,
  ssl:
    databaseUrl.includes("localhost") ||
    databaseUrl.includes("127.0.0.1") ||
    databaseUrl.includes(".railway.internal")
      ? false
      : { rejectUnauthorized: false },
});

await sql.unsafe(`
ALTER TABLE esercizi ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE esercizi ADD COLUMN IF NOT EXISTS fonte text;
ALTER TABLE esercizi ADD COLUMN IF NOT EXISTS fonte_id text;
ALTER TABLE esercizi ADD COLUMN IF NOT EXISTS licenza text;
ALTER TABLE esercizi ADD COLUMN IF NOT EXISTS autore text;
CREATE UNIQUE INDEX IF NOT EXISTS esercizi_fonte_id_unico ON esercizi (fonte_id) WHERE fonte_id IS NOT NULL;
ALTER TABLE scheda_esercizi ADD COLUMN IF NOT EXISTS metodo text NOT NULL DEFAULT 'normale';
ALTER TABLE scheda_esercizi ADD COLUMN IF NOT EXISTS gruppo text;
ALTER TABLE scheda_esercizi ADD COLUMN IF NOT EXISTS tempo text;
`);

const gia = new Set(
  (await sql`SELECT fonte_id FROM esercizi WHERE fonte_id IS NOT NULL`).map((r) => r.fonte_id),
);
let ordine = Number((await sql`SELECT COALESCE(MAX(ordine), 0) AS n FROM esercizi`)[0].n);

let url = "https://wger.de/api/v2/exerciseinfo/?limit=100";
const esercizi = [];
while (url) {
  const pagina = await (await fetch(url)).json();
  esercizi.push(...pagina.results);
  url = pagina.next;
  console.log(`scaricati metadati ${esercizi.length}`);
}

let inseriti = 0;
let immagini = 0;
let saltati = 0;
let erroriImmagine = 0;

for (const esercizio of esercizi) {
  const fonteId = esercizio.uuid;
  if (!fonteId || gia.has(fonteId)) {
    saltati += 1;
    continue;
  }
  const nomeTradotto = traduzione(esercizio);
  const nome = (nomeTradotto?.name ?? "").trim();
  if (!nome) {
    saltati += 1;
    continue;
  }
  const categoria = esercizio.category?.name;
  const cardio = categoria === "Cardio";
  const attrezzatura = (esercizio.equipment ?? [])
    .map((e) => ATTREZZATURA[e.name] ?? e.name)
    .filter(Boolean)
    .join(", ");
  ordine += 1;
  const percorso = `catalogo/${fonteId}`;
  const urlImmagine = immagineDi(esercizio);
  let immagineSalvata = null;
  if (urlImmagine) {
    try {
      const file = await scarica(urlImmagine);
      await sql`
        INSERT INTO media (path, content_type, bytes)
        VALUES (${percorso}, ${file.tipo}, ${file.bytes})
        ON CONFLICT (path) DO UPDATE SET content_type = EXCLUDED.content_type, bytes = EXCLUDED.bytes
      `;
      immagineSalvata = percorso;
      immagini += 1;
    } catch (err) {
      erroriImmagine += 1;
      console.log(`immagine saltata ${nome}: ${err instanceof Error ? err.message : err}`);
    }
  }
  await sql`
    INSERT INTO esercizi (
      nome, gruppo_muscolare, attrezzatura, tipo, unita_misura,
      descrizione_esecuzione, immagine_url, video_url, fonte, fonte_id, licenza, autore,
      attivo, ordine
    ) VALUES (
      ${nome},
      ${gruppoDi(esercizio)},
      ${attrezzatura || null},
      ${cardio ? "cardio" : "forza"},
      ${cardio ? "minuti" : "serie_ripetizioni"},
      ${pulisciHtml(nomeTradotto?.description)},
      ${immagineSalvata},
      ${videoDi(esercizio)},
      ${"wger"},
      ${fonteId},
      ${esercizio.license?.short_name ?? null},
      ${esercizio.license_author || null},
      true,
      ${ordine}
    )
  `;
  inseriti += 1;
  if (inseriti % 50 === 0) console.log(`inseriti ${inseriti}, immagini ${immagini}`);
}

console.log(JSON.stringify({ inseriti, immagini, saltati, erroriImmagine, ordine }, null, 2));
await sql.end();
