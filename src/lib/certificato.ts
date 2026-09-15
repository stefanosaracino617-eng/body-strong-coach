import { formattaData, giorniAllaScadenza } from "@/lib/date";

export type StatoCertificato = "assente" | "scaduto" | "in-scadenza" | "valido";

export type EtichettaCertificato = {
  stato: StatoCertificato;
  testo: string;
  /** classe di colore del testo, coerente con il resto dell'app */
  colore: string;
};

/** Regola unica per lo stato del certificato medico, usata ovunque. */
export function statoCertificato(data: string | null | undefined): EtichettaCertificato {
  if (!data) {
    return { stato: "assente", testo: "Certificato non registrato", colore: "text-muted-foreground" };
  }
  const giorni = giorniAllaScadenza(data);
  if (giorni < 0) {
    return {
      stato: "scaduto",
      testo: `Certificato scaduto il ${formattaData(data)}`,
      colore: "text-destructive",
    };
  }
  if (giorni <= 30) {
    return {
      stato: "in-scadenza",
      testo: `Certificato in scadenza il ${formattaData(data)}`,
      colore: "text-warning",
    };
  }
  return {
    stato: "valido",
    testo: `Certificato valido fino al ${formattaData(data)}`,
    colore: "text-muted-foreground",
  };
}

/** Vero se il certificato è scaduto oppure scade entro 30 giorni. */
export function certificatoDaRinnovare(data: string | null | undefined): boolean {
  if (!data) return false;
  const s = statoCertificato(data).stato;
  return s === "scaduto" || s === "in-scadenza";
}
