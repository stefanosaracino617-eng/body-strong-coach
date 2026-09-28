import { useSyncExternalStore } from "react";

type EsitoInstallazione = "accepted" | "dismissed";

interface PromptInstallazione extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: EsitoInstallazione; platform: string }>;
}

let promptDifferito: PromptInstallazione | null = null;
let installataOra = false;
let avviato = false;
const ascoltatori = new Set<() => void>();

function notifica() {
  ascoltatori.forEach((ascolta) => ascolta());
}

/** Registra il service worker e intercetta l'invito nativo di Chrome. */
export function avviaInstallazioneApp() {
  if (avviato || typeof window === "undefined") return;
  avviato = true;

  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/sw.js").catch((errore: unknown) => {
      console.error("Service worker non registrato", errore);
    });
  }

  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    promptDifferito = evento as PromptInstallazione;
    notifica();
  });

  window.addEventListener("appinstalled", () => {
    promptDifferito = null;
    installataOra = true;
    notifica();
  });
}

export function sottoscriviInstallazione(ascolta: () => void) {
  ascoltatori.add(ascolta);
  return () => {
    ascoltatori.delete(ascolta);
  };
}

export function installazioneDisponibile() {
  return promptDifferito !== null;
}

export function appInstallata() {
  if (typeof window === "undefined") return false;
  const finestraPropria =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches;
  const ios =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return installataOra || finestraPropria || ios;
}

export async function chiediInstallazione(): Promise<EsitoInstallazione | "assente"> {
  if (!promptDifferito) return "assente";
  const evento = promptDifferito;
  promptDifferito = null;
  notifica();
  await evento.prompt();
  const scelta = await evento.userChoice;
  if (scelta.outcome === "accepted") installataOra = true;
  notifica();
  return scelta.outcome;
}

export function useInstallazioneApp() {
  const disponibile = useSyncExternalStore(
    sottoscriviInstallazione,
    installazioneDisponibile,
    () => false,
  );
  const installata = useSyncExternalStore(sottoscriviInstallazione, appInstallata, () => false);
  return { disponibile, installata, chiediInstallazione };
}
