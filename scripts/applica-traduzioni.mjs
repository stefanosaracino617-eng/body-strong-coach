/**
 * Applica le descrizioni italiane salvate in data/descrizioni-it.json.
 * Non sovrascrive una descrizione se il gestore l'ha già cambiata a mano
 * solo quando il testo attuale è ancora quello inglese di partenza.
 */
import { existsSync, readFileSync } from "node:fs";
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

caricaEnv();
const databaseUrl = process.env.DATABASE_URL;
const file = resolve(process.cwd(), "data/descrizioni-it.json");
if (!databaseUrl || !existsSync(file)) {
  console.log("Traduzioni: niente da applicare.");
  process.exit(0);
}

const voci = JSON.parse(readFileSync(file, "utf8"));
const sql = postgres(databaseUrl, {
  max: 2,
  ssl:
    databaseUrl.includes("localhost") ||
    databaseUrl.includes("127.0.0.1") ||
    databaseUrl.includes(".railway.internal")
      ? false
      : { rejectUnauthorized: false },
});

let aggiornate = 0;
for (const voce of voci) {
  if (!voce.fonte_id || !voce.descrizione) continue;
  const esito = await sql`
    UPDATE esercizi
    SET descrizione_esecuzione = ${voce.descrizione}
    WHERE fonte_id = ${voce.fonte_id}
      AND descrizione_esecuzione IS DISTINCT FROM ${voce.descrizione}
      AND (
        descrizione_esecuzione IS NULL
        OR descrizione_esecuzione = ${voce.originale ?? voce.descrizione}
      )
  `;
  aggiornate += esito.count;
}

console.log(`Traduzioni applicate: ${aggiornate}`);
await sql.end();
