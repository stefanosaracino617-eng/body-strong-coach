import { toast } from "sonner";

/** Avviso verde che sparisce da solo dopo pochi secondi. */
export function avvisoOk(testo: string): void {
  toast.success(testo, { duration: 4000 });
}

/** Avviso rosso che resta finché non lo si chiude. */
export function avvisoErrore(testo: string): void {
  toast.error(testo, { duration: Infinity, closeButton: true });
}

export function testoErrore(e: unknown, ripiego: string): string {
  return e instanceof Error && e.message ? e.message : ripiego;
}
