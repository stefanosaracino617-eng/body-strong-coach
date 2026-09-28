import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function caricaEnvLocale() {
  if (process.env["DATABASE_URL"] && process.env["SESSION_SECRET"]) return;
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

caricaEnvLocale();
