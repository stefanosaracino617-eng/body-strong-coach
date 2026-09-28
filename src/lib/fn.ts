import { createServerFn } from "@tanstack/react-start";
import type { GruppoMuscolare, TipoEsercizio, UnitaMisura, RigaImportata } from "@/lib/esercizi";
import type { ValoriEsercizio } from "@/lib/allenamenti";

export const accediFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.accedi(data.email, data.password);
  });

export const registraFn = createServerFn({ method: "POST" })
  .validator((d: {
    email: string;
    password: string;
    nome: string;
    cognome: string;
    telefono: string;
    dataNascita: string;
    sesso: string;
  }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.registra(data);
  });

export const esciFn = createServerFn({ method: "POST" }).handler(async () => {
  const repo = await import("@/server/repo");
  await repo.esci();
});

export const sessioneAppFn = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await import("@/server/repo");
  return repo.caricaSessioneApp();
});

export const idGestoriFn = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await import("@/server/repo");
  return repo.caricaIdGestori();
});

export const elencoProfiliFn = createServerFn({ method: "POST" })
  .validator((d: { stato: "in_attesa" | "approvato" }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.elencoProfili(data.stato);
  });

export const profiloFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaProfilo(data.id);
  });

export const decidiRegistrazioneFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; approva: boolean }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.decidiRegistrazione(data.id, data.approva);
  });

export const assegnaGestoreFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string; assegna: boolean }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.assegnaGestore(data.userId, data.assegna);
  });

export const aggiornaAbbonamentoFn = createServerFn({ method: "POST" })
  .validator((d: {
    id: string;
    tipo_abbonamento: string | null;
    abbonamento_inizio: string | null;
    abbonamento_scadenza: string | null;
  }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.aggiornaAbbonamento(data.id, data);
  });

export const aggiornaCertificatoFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; certificato_scadenza: string | null }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.aggiornaCertificato(data.id, data.certificato_scadenza);
  });

export const catalogoObiettiviFn = createServerFn({ method: "POST" })
  .validator((d: { soloAttivi: boolean }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaCatalogoObiettivi(data.soloAttivi);
  });

export const obiettiviClienteFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaObiettiviCliente(data.clienteId);
  });

export const obiettiviNominatiFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaObiettiviNominati(data.clienteId);
  });

export const salvaObiettiviClienteFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string; selezionati: string[] }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.salvaObiettiviCliente(data.clienteId, data.selezionati);
  });

export const salvaObiettivoCatalogoFn = createServerFn({ method: "POST" })
  .validator((d: {
    id?: string;
    nome: string;
    descrizione: string | null;
    gruppo: string;
    ordine: number;
    attivo: boolean;
  }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.salvaObiettivoCatalogo(data);
  });

export const eliminaObiettivoCatalogoFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.eliminaObiettivoCatalogo(data.id);
  });

export const regoleFn = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await import("@/server/repo");
  return repo.caricaRegole();
});

export const salvaRegoleFn = createServerFn({ method: "POST" })
  .validator((d: { id: string | null; contenuto: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.salvaRegole(data.id, data.contenuto);
  });

export const eserciziFn = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await import("@/server/repo");
  return repo.caricaEsercizi();
});

export const salvaEsercizioFn = createServerFn({ method: "POST" })
  .validator((d: {
    id?: string;
    nome: string;
    gruppo_muscolare: GruppoMuscolare;
    attrezzatura: string | null;
    tipo: TipoEsercizio;
    unita_misura: UnitaMisura;
    descrizione_esecuzione: string | null;
    errori_comuni: string | null;
    attivo: boolean;
    ordine: number;
  }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.salvaEsercizio(data);
  });

export const attivoEsercizioFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; attivo: boolean }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.impostaAttivoEsercizio(data.id, data.attivo);
  });

export const importaEserciziFn = createServerFn({ method: "POST" })
  .validator((d: { righe: RigaImportata[] }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.importaEsercizi(data.righe);
  });

export const caricaImmaginiFn = createServerFn({ method: "POST" })
  .validator((d: { file: { name: string; contentType: string; base64: string }[] }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaImmaginiEsercizi(data.file);
  });

export const caricaImmagineLiberaFn = createServerFn({ method: "POST" })
  .validator((d: {
    schedaId: string;
    file: { name: string; contentType: string; base64: string };
  }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaImmagineLibera(data.schedaId, data.file);
  });

export const schedaAttivaFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaSchedaAttiva(data.clienteId);
  });

export const schedaClienteAttivaFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaSchedaClienteAttiva(data.clienteId);
  });

export const schedaPerAllenamentoFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaSchedaPerAllenamento(data.clienteId);
  });

export const eserciziSchedaFn = createServerFn({ method: "POST" })
  .validator((d: { schedaId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaEserciziScheda(data.schedaId);
  });

export const archiviaSchedaFn = createServerFn({ method: "POST" })
  .validator((d: { schedaId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.archiviaScheda(data.schedaId);
  });

export const scadenzeFn = createServerFn({ method: "POST" })
  .validator((d: { clientiId: string[] }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaScadenzePerClienti(data.clientiId);
  });

export const schedeClienteFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaSchedeCliente(data.clienteId);
  });

export const salvaOrdineFn = createServerFn({ method: "POST" })
  .validator((d: { righe: { id: string; ordine: number }[] }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.salvaOrdine(data.righe);
  });

export const duplicaSchedaFn = createServerFn({ method: "POST" })
  .validator((d: { origineId: string; dataInizio: string; dataScadenza: string; titolo?: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.duplicaScheda(data.origineId, data.dataInizio, data.dataScadenza, data.titolo);
  });

export const salvaSchedaFn = createServerFn({ method: "POST" })
  .validator((d: {
    id?: string;
    cliente_id: string;
    titolo: string;
    data_inizio: string;
    data_scadenza: string;
    note_gestore: string | null;
  }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.salvaScheda(data);
  });

export const inserisciRigaSchedaFn = createServerFn({ method: "POST" })
  .validator((d: {
    scheda_id: string;
    esercizio_id: string | null;
    nome_libero: string | null;
    descrizione_libera: string | null;
    immagine_libera_url: string | null;
    sessione: string;
    ordine: number;
    serie: number | null;
    ripetizioni: string | null;
    durata_minuti: number | null;
    recupero_secondi: number | null;
    carico_indicativo: string | null;
    note: string | null;
  }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.inserisciRigaScheda(data);
  });

export const aggiornaRigaSchedaFn = createServerFn({ method: "POST" })
  .validator((d: {
    id: string;
    serie: number | null;
    ripetizioni: string | null;
    durata_minuti: number | null;
    recupero_secondi: number | null;
    carico_indicativo: string | null;
    note: string | null;
  }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.aggiornaRigaScheda(data.id, data);
  });

export const eliminaRigaSchedaFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.eliminaRigaScheda(data.id);
  });

export const ultimiValoriFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.ultimiValori(data.clienteId);
  });

export const andamentoCaricoFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.andamentoCarico(data.clienteId);
  });

export const storicoFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaStorico(data.clienteId);
  });

export const storicoDettagliatoFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaStoricoDettagliato(data.clienteId);
  });

export const apriAllenamentoFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId: string; schedaId: string; sessione: string; oggi: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.apriAllenamento(data.clienteId, data.schedaId, data.sessione, data.oggi);
  });

export const righeAllenamentoFn = createServerFn({ method: "POST" })
  .validator((d: { allenamentoId: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.caricaRigheAllenamento(data.allenamentoId);
  });

export const salvaRigaAllenamentoFn = createServerFn({ method: "POST" })
  .validator((d: {
    allenamentoId: string;
    schedaEsercizioId: string;
    valori: { completato: boolean } & ValoriEsercizio & { note?: string | null };
  }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.salvaRigaAllenamento(data.allenamentoId, data.schedaEsercizioId, data.valori);
  });

export const terminaAllenamentoFn = createServerFn({ method: "POST" })
  .validator((d: { allenamentoId: string; noteCliente: string | null }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    await repo.terminaAllenamento(data.allenamentoId, data.noteCliente);
  });

export const numeriDashboardFn = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await import("@/server/repo");
  return repo.caricaNumeriDashboard();
});

export const allenamentiRecentiFn = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await import("@/server/repo");
  return repo.caricaAllenamentiRecenti();
});

export const esportazioneFn = createServerFn({ method: "POST" })
  .validator((d: { clienteId?: string }) => d)
  .handler(async ({ data }) => {
    const repo = await import("@/server/repo");
    return repo.datiEsportazione(data.clienteId);
  });
