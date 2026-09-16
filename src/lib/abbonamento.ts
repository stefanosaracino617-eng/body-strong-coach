import { formattaData, giorniAllaScadenza } from "@/lib/date";

export type StatoAbbonamento = "assente" | "scaduto" | "in-scadenza" | "valido";

export type EtichettaAbbonamento = {
  stato: StatoAbbonamento;
  testo: string;
  /** classe di colore del testo, coerente con il resto dell'app */
  colore: string;
};

/** Giorni di tolleranza dopo la scadenza prima della sospensione automatica. */
export const GIORNI_TOLLERANZA = 7;

/** Regola unica per lo stato dell'abbonamento, usata ovunque. */
export function statoAbbonamento(data: string | null | undefined): EtichettaAbbonamento {
  if (!data) {
    return {
      stato: "assente",
      testo: "Abbonamento non registrato",
      colore: "text-muted-foreground",
    };
  }
  const giorni = giorniAllaScadenza(data);
  if (giorni < 0) {
    return {
      stato: "scaduto",
      testo: `Abbonamento scaduto il ${formattaData(data)}`,
      colore: "text-destructive",
    };
  }
  if (giorni <= 7) {
    return {
      stato: "in-scadenza",
      testo: `Abbonamento in scadenza il ${formattaData(data)}`,
      colore: "text-warning",
    };
  }
  return {
    stato: "valido",
    testo: `Abbonamento valido fino al ${formattaData(data)}`,
    colore: "text-muted-foreground",
  };
}

/** Vero se l'abbonamento è scaduto oppure scade entro 7 giorni. */
export function abbonamentoDaRinnovare(data: string | null | undefined): boolean {
  if (!data) return false;
  const s = statoAbbonamento(data).stato;
  return s === "scaduto" || s === "in-scadenza";
}

/**
 * Sospensione automatica: scatta solo se l'abbonamento è scaduto
 * da più di 7 giorni. Senza data non c'è mai sospensione.
 */
export function abbonamentoSospeso(data: string | null | undefined): boolean {
  if (!data) return false;
  return giorniAllaScadenza(data) < -GIORNI_TOLLERANZA;
}
