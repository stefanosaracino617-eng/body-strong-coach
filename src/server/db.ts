import "./env";
import postgres from "postgres";
import { SCHEMA_SQL } from "./schema";

function databaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "Manca DATABASE_URL. Su Railway collega il plugin Postgres al servizio web.",
    );
  }
  return url;
}

function usaSsl(url: string): boolean | { rejectUnauthorized: boolean } {
  if (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes(".railway.internal")
  ) {
    return false;
  }
  return { rejectUnauthorized: false };
}

declare global {
  // eslint-disable-next-line no-var
  var __bodystrongSql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __bodystrongMigrato: Promise<void> | undefined;
}

export function db() {
  if (!globalThis.__bodystrongSql) {
    const url = databaseUrl();
    globalThis.__bodystrongSql = postgres(url, {
      max: 10,
      ssl: usaSsl(url),
      idle_timeout: 20,
      connect_timeout: 30,
      onnotice: (n) => {
        if (n.code === "00000" && n.message.includes("does not exist, skipping")) return;
        console.log(n);
      },
    });
  }
  return globalThis.__bodystrongSql;
}

export async function assicuraSchema(): Promise<void> {
  if (!globalThis.__bodystrongMigrato) {
    globalThis.__bodystrongMigrato = db()
      .unsafe(SCHEMA_SQL)
      .simple()
      .then(() => undefined)
      .catch((err) => {
        globalThis.__bodystrongMigrato = undefined;
        throw err;
      });
  }
  await globalThis.__bodystrongMigrato;
}

export function erroreDb(err: unknown): never {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    const constraint = String((err as { constraint?: string }).constraint ?? "");
    if (code === "23505") {
      if (constraint.includes("utenti_email") || constraint.includes("email")) {
        throw new Error("Esiste già un account con questa email.");
      }
      if (constraint.includes("esercizi_ordine")) {
        throw new Error("Esiste già un esercizio con questo numero.");
      }
      if (constraint.includes("tipi_abbonamento_nome")) {
        throw new Error("Esiste già un tipo di abbonamento con questo nome.");
      }
      if (constraint.includes("obiettivi_nome") || constraint.includes("nome")) {
        throw new Error("Esiste già un obiettivo con questo nome.");
      }
    }
  }
  throw err instanceof Error ? err : new Error("Errore del database.");
}
