import "./lib/error-capture";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

let importCatalogoAvviato = false;

function applicaTraduzioni() {
  const script = resolve(process.cwd(), "scripts/applica-traduzioni.mjs");
  if (!existsSync(script) || !existsSync(resolve(process.cwd(), "data/descrizioni-it.json"))) return;
  const processo = spawn(process.execPath, [script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  processo.on("exit", (codice) => {
    console.log(`Traduzioni applicate con codice ${codice ?? "sconosciuto"}`);
  });
}

function avviaImportCatalogo() {
  if (importCatalogoAvviato) return;
  importCatalogoAvviato = true;
  const script = resolve(process.cwd(), "scripts/importa-wger.mjs");
  if (!existsSync(script)) {
    console.error("Catalogo wger: script non trovato", script);
    return;
  }
  void (async () => {
    try {
      const { db } = await import("./server/db");
      const righe = await db()`SELECT count(*)::int AS n FROM esercizi WHERE fonte = 'wger'`;
      const presenti = Number((righe[0] as { n?: number } | undefined)?.n ?? 0);
      if (presenti >= 800) {
        applicaTraduzioni();
        return;
      }
      console.log(`Catalogo wger incompleto (${presenti}). Avvio import.`);
      const processo = spawn(process.execPath, [script], {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
      });
      processo.on("exit", (codice) => {
        console.log(`Import catalogo terminato con codice ${codice ?? "sconosciuto"}`);
        applicaTraduzioni();
      });
    } catch (error) {
      importCatalogoAvviato = false;
      console.error("Import catalogo non avviato", error);
    }
  })();
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/health" || url.pathname === "/healthz") {
        return new Response("ok", { headers: { "content-type": "text/plain" } });
      }
      if (url.pathname.startsWith("/media/")) {
        const { serveMedia } = await import("./server/media");
        return serveMedia(request);
      }
      const { assicuraSchema } = await import("./server/db");
      await assicuraSchema();
      avviaImportCatalogo();
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
