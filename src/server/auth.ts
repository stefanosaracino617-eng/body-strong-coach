import "./env";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { unsealSession } from "h3-v2";
import { useSession } from "@tanstack/react-start/server";
import { assicuraSchema, db } from "./db";

const scrypt = promisify(scryptCb);

type DatiSessione = { userId: string };

function configSessione() {
  const password = process.env["SESSION_SECRET"];
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET deve contenere almeno 32 caratteri.");
  }
  return {
    name: "bs",
    password,
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
    },
  };
}

export async function hashPassword(password: string): Promise<string> {
  const sale = randomBytes(16);
  const hash = (await scrypt(password, sale, 64)) as Buffer;
  return `${sale.toString("hex")}:${hash.toString("hex")}`;
}

export async function verificaPassword(password: string, salvata: string): Promise<boolean> {
  const [saleHex, hashHex] = salvata.split(":");
  if (!saleHex || !hashHex) return false;
  const sale = Buffer.from(saleHex, "hex");
  const attesa = Buffer.from(hashHex, "hex");
  const calcolata = (await scrypt(password, sale, 64)) as Buffer;
  if (calcolata.length !== attesa.length) return false;
  return timingSafeEqual(calcolata, attesa);
}

export async function avviaSessione(userId: string): Promise<void> {
  const sessione = await useSession<DatiSessione>(configSessione());
  await sessione.update({ userId });
}

export async function chiudiSessione(): Promise<void> {
  const sessione = await useSession<DatiSessione>(configSessione());
  await sessione.clear();
}

export async function idUtenteCorrente(): Promise<string | null> {
  await assicuraSchema();
  const sessione = await useSession<DatiSessione>(configSessione());
  return sessione.data.userId ?? null;
}

function valoreCookie(header: string | null, nome: string): string | undefined {
  if (!header) return undefined;
  for (const parte of header.split(";")) {
    const indice = parte.indexOf("=");
    if (indice < 0) continue;
    if (parte.slice(0, indice).trim() !== nome) continue;
    const grezzo = parte.slice(indice + 1).trim();
    try {
      return decodeURIComponent(grezzo);
    } catch {
      return grezzo;
    }
  }
  return undefined;
}

/** Legge il cookie di sessione anche fuori dal runtime di Start (es. /media). */
function cookieSessione(header: string | null): string | undefined {
  const principale = valoreCookie(header, "bs");
  if (!principale) return undefined;
  if (!principale.startsWith("__chunked__")) return principale;
  const pezzi = Number.parseInt(principale.slice(11), 10);
  if (!Number.isFinite(pezzi) || pezzi < 1 || pezzi > 100) return undefined;
  const parti: string[] = [];
  for (let i = 1; i <= pezzi; i += 1) {
    const pezzo = valoreCookie(header, `bs.${i}`);
    if (!pezzo) return undefined;
    parti.push(pezzo);
  }
  return parti.join("");
}

export async function idUtenteDaRichiesta(request: Request): Promise<string | null> {
  const sigillata = cookieSessione(request.headers.get("cookie"));
  if (!sigillata) return null;
  try {
    const sessione = await unsealSession(undefined as never, configSessione(), sigillata);
    const dati = sessione.data as DatiSessione | undefined;
    return dati?.userId ?? null;
  } catch {
    return null;
  }
}

export async function richiedeUtente(): Promise<string> {
  const id = await idUtenteCorrente();
  if (!id) throw new Error("Devi accedere per continuare.");
  return id;
}

export async function eGestore(userId: string): Promise<boolean> {
  const righe = await db()`
    SELECT 1 FROM ruoli_utente WHERE user_id = ${userId} AND ruolo = 'gestore' LIMIT 1
  `;
  return righe.length > 0;
}

export async function richiedeGestore(): Promise<string> {
  const id = await richiedeUtente();
  if (!(await eGestore(id))) throw new Error("Questa operazione è riservata al gestore.");
  return id;
}

export async function richiedeSeStessoOGestore(clienteId: string): Promise<{ id: string; gestore: boolean }> {
  const id = await richiedeUtente();
  const gestore = await eGestore(id);
  if (!gestore && id !== clienteId) throw new Error("Accesso non consentito.");
  return { id, gestore };
}
