/**
 * Regole di localizzazione delle date per tutta l'app:
 * - visualizzazione e inserimento sempre in formato gg/mm/aaaa
 * - nel database le date restano in formato ISO (aaaa-mm-gg)
 * - i calendari usano la lingua italiana e iniziano di lunedì
 */
import { it } from "date-fns/locale";

export const localeIt = it;
export const LINGUA = "it-IT";
export const PRIMO_GIORNO_SETTIMANA = 1; // lunedì

/** ISO (aaaa-mm-gg) -> gg/mm/aaaa */
export function formattaData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, g] = iso.slice(0, 10).split("-");
  if (!a || !m || !g) return "—";
  return `${g}/${m}/${a}`;
}

/** Data/ora -> gg/mm/aaaa hh:mm */
export function formattaDataOra(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(LINGUA, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** gg/mm/aaaa -> ISO (aaaa-mm-gg), oppure null se non valida */
export function aIso(valore: string): string | null {
  const m = valore.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, g, me, a] = m;
  const d = new Date(Number(a), Number(me) - 1, Number(g));
  if (
    d.getFullYear() !== Number(a) ||
    d.getMonth() !== Number(me) - 1 ||
    d.getDate() !== Number(g)
  ) {
    return null;
  }
  return `${a}-${me}-${g}`;
}

/** Date -> ISO (aaaa-mm-gg) senza scivolamenti di fuso orario */
export function dataAIso(d: Date): string {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${a}-${m}-${g}`;
}

/** Data di oggi in Italia (fuso Europe/Rome) in formato ISO aaaa-mm-gg */
export function oggiRoma(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Giorni che mancano alla data indicata, calcolati sul fuso italiano */
export function giorniAllaScadenza(iso: string): number {
  const oggi = new Date(`${oggiRoma()}T00:00:00Z`).getTime();
  const fine = new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((fine - oggi) / 86400000);
}

/** ISO (aaaa-mm-gg) -> Date locale */
export function isoAData(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const [a, m, g] = iso.slice(0, 10).split("-").map(Number);
  if (!a || !m || !g) return undefined;
  return new Date(a, m - 1, g);
}

/** Inserisce automaticamente le barre mentre si digita */
export function mascheraData(valore: string): string {
  const cifre = valore.replace(/\D/g, "").slice(0, 8);
  if (cifre.length <= 2) return cifre;
  if (cifre.length <= 4) return `${cifre.slice(0, 2)}/${cifre.slice(2)}`;
  return `${cifre.slice(0, 2)}/${cifre.slice(2, 4)}/${cifre.slice(4)}`;
}
