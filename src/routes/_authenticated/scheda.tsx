import { statoCertificato } from "@/lib/certificato";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CaricamentoCard } from "@/components/Stati";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CostruttoreScheda } from "@/components/CostruttoreScheda";
import { caricaSessioneApp, type Profilo } from "@/lib/profilo";
import {
  aggiornaAbbonamentoFn,
  aggiornaCertificatoFn,
  profiloFn,
  salvaSchedaFn,
} from "@/lib/fn";
import { CampoData } from "@/components/CampoData";
import { VistaSchedaCliente } from "@/components/VistaSchedaCliente";
import { aggiungiGiorni, formattaData, formattaDataOra, oggiRoma } from "@/lib/date";
import {
  abbonamentoSospeso,
  caricaTipiAbbonamento,
  etichettaDurata,
  statoAbbonamento,
} from "@/lib/abbonamento";
import { avvisoErrore, avvisoOk, testoErrore } from "@/lib/avvisi";
import { esportaCliente } from "@/lib/esportazione";
import {
  archiviaScheda,
  caricaSchedaAttiva,
  caricaSchedeCliente,
  duplicaScheda,
  schedaScaduta,
  schedaProgrammata,
  testoOppureNull,
  verificaDateScheda,
  type Scheda,
} from "@/lib/schede";

export const Route = createFileRoute("/_authenticated/scheda")({
  validateSearch: (search: Record<string, unknown>) => ({
    cliente: typeof search["cliente"] === "string" ? (search["cliente"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Editor scheda | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Crea e modifica la scheda di allenamento del cliente con sessioni ed esercizi.",
      },
      { property: "og:title", content: "Editor scheda | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Crea e modifica la scheda di allenamento del cliente con sessioni ed esercizi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaScheda,
});

function Pagina({ titolo, children }: { titolo: string; children?: React.ReactNode }) {
  return (
    <main className="pagina">
      <div className="pagina-contenuto">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl">{titolo}</h1>
          <Link to="/clienti" search={{ filtro: "tutti" }} className="text-sm font-semibold text-accent">
            Tutti i clienti
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}

function PaginaScheda() {
  const { cliente } = Route.useSearch();
  const queryClient = useQueryClient();
  const [errore, setErrore] = useState<string | null>(null);
  const [duplicaDa, setDuplicaDa] = useState<string | null>(null);

  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const gestore = sessione.data?.isGestore === true;

  const profilo = useQuery({
    queryKey: ["profilo-cliente", cliente],
    enabled: gestore && cliente !== "",
    queryFn: async () => {
      return profiloFn({ data: { id: cliente } });
    },
  });

  const scheda = useQuery({
    queryKey: ["scheda-attiva", cliente],
    enabled: gestore && cliente !== "",
    queryFn: () => caricaSchedaAttiva(cliente),
  });

  if (sessione.isLoading) return <Pagina titolo="Caricamento"><CaricamentoCard /></Pagina>;

  if (!gestore) {
    return (
      <Pagina titolo="Accesso non consentito">
        <p className="text-base text-muted-foreground">
          Questa pagina è riservata ai gestori della palestra.
        </p>
        <Link to="/area" className="btn-primary">
          Torna alla mia area
        </Link>
      </Pagina>
    );
  }

  if (!cliente) {
    return (
      <Pagina titolo="Scheda">
        <p className="text-base text-muted-foreground">Scegli un cliente dall&apos;elenco.</p>
        <Link to="/clienti" search={{ filtro: "tutti" as const }} className="btn-primary">
          Vai ai clienti
        </Link>
      </Pagina>
    );
  }

  const nomeCliente = profilo.data ? `${profilo.data.nome} ${profilo.data.cognome}` : "Cliente";

  return (
    <Pagina titolo={`Scheda di ${nomeCliente}`}>
      {errore && (
        <p className="rounded-[10px] border border-destructive px-3 py-3 text-base text-destructive">
          {errore}
        </p>
      )}

      {scheda.isLoading && <CaricamentoCard />}

      {!scheda.isLoading && !scheda.data && (
        <DatiScheda
          clienteId={cliente}
          scheda={null}
          abbonamentoScadenza={profilo.data?.abbonamento_scadenza ?? null}
          onErrore={setErrore}
          onFatto={() => queryClient.invalidateQueries({ queryKey: ["scheda-attiva", cliente] })}
        />
      )}

      {scheda.data && (
        <>
          <CostruttoreScheda scheda={scheda.data} onErrore={setErrore} />
          <details className="card-surface">
            <summary className="cursor-pointer px-6 py-4 text-base font-semibold">
              Date e note · {formattaData(scheda.data.data_inizio)} – {formattaData(scheda.data.data_scadenza)}
            </summary>
            <div className="px-2 pb-2">
              <DatiScheda
                clienteId={cliente}
                scheda={scheda.data}
                abbonamentoScadenza={profilo.data?.abbonamento_scadenza ?? null}
                onErrore={setErrore}
                onFatto={() => queryClient.invalidateQueries({ queryKey: ["scheda-attiva", cliente] })}
              />
            </div>
          </details>
        </>
      )}

      <details className="card-surface">
        <summary className="cursor-pointer px-6 py-4 text-base font-semibold">
          Abbonamento, certificato ed export
        </summary>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <CertificatoCliente clienteId={cliente} valore={profilo.data?.certificato_scadenza ?? null} />
          <AbbonamentoCliente clienteId={cliente} profilo={profilo.data ?? null} />
          <EsportaCliente
            clienteId={cliente}
            cognome={profilo.data?.cognome ?? ""}
            nome={profilo.data?.nome ?? ""}
          />
        </div>
      </details>

      <SchedeArchiviate clienteId={cliente} onDuplica={(id) => setDuplicaDa(id)} />

      <DuplicaScheda
        clienteId={cliente}
        apriCon={duplicaDa}
        onAperturaGestita={() => setDuplicaDa(null)}
        onErrore={setErrore}
        onDuplicata={() => {
          queryClient.invalidateQueries({ queryKey: ["scheda-attiva", cliente] });
          queryClient.invalidateQueries({ queryKey: ["schede-cliente", cliente] });
        }}
      />
    </Pagina>
  );
}

/** Certificato medico del cliente: lo può registrare solo il gestore. */
/** Copia dei dati di un singolo cliente, da consegnare se li richiede. */
function EsportaCliente({
  clienteId,
  cognome,
  nome,
}: {
  clienteId: string;
  cognome: string;
  nome: string;
}) {
  const [attesa, setAttesa] = useState(false);
  const [erroreEsporta, setErroreEsporta] = useState<string | null>(null);

  async function avvia() {
    setAttesa(true);
    setErroreEsporta(null);
    try {
      const nomeFile = await esportaCliente(clienteId, cognome, nome);
      avvisoOk(`Esportazione pronta: ${nomeFile}`);
    } catch (e) {
      const testo = testoErrore(
        e,
        "Non riesco a preparare l'esportazione. Controlla la connessione.",
      );
      setErroreEsporta(testo);
      avvisoErrore(testo);
    } finally {
      setAttesa(false);
    }
  }

  return (
    <section className="card-surface flex flex-col gap-3 p-6">
      <h2 className="text-lg">Dati del cliente</h2>
      <p className="text-base text-muted-foreground">
        Il file conterrà dati personali. Conservalo in un luogo sicuro e non inviarlo per email o
        messaggistica.
      </p>
      {erroreEsporta && <p className="text-base text-destructive">{erroreEsporta}</p>}
      <button type="button" className="btn-secondary" disabled={attesa} onClick={() => void avvia()}>
        {attesa
          ? "Preparazione in corso…"
          : erroreEsporta
            ? "Riprova"
            : "Esporta i dati di questo cliente"}
      </button>
    </section>
  );
}

/** Dati dell'abbonamento: li registra solo il gestore. */
function AbbonamentoCliente({
  clienteId,
  profilo,
}: {
  clienteId: string;
  profilo: Profilo | null;
}) {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState(profilo?.tipo_abbonamento ?? "");
  const [inizio, setInizio] = useState(profilo?.abbonamento_inizio ?? "");
  const [scadenza, setScadenza] = useState(profilo?.abbonamento_scadenza ?? "");
  const tipi = useQuery({
    queryKey: ["tipi-abbonamento", "attivi"],
    queryFn: () => caricaTipiAbbonamento(true),
  });

  useEffect(() => {
    setTipo(profilo?.tipo_abbonamento ?? "");
    setInizio(profilo?.abbonamento_inizio ?? "");
    setScadenza(profilo?.abbonamento_scadenza ?? "");
  }, [profilo]);

  const salva = useMutation({
    mutationFn: async () => {
      await aggiornaAbbonamentoFn({
        data: {
          id: clienteId,
          tipo_abbonamento: testoOppureNull(tipo),
          abbonamento_inizio: inizio === "" ? null : inizio,
          abbonamento_scadenza: scadenza === "" ? null : scadenza,
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profilo-cliente", clienteId] });
      await queryClient.invalidateQueries({ queryKey: ["clienti-approvati"] });
      await queryClient.invalidateQueries({ queryKey: ["numeri-dashboard"] });
      avvisoOk("Abbonamento aggiornato.");
    },
    onError: (e) => avvisoErrore(e instanceof Error ? e.message : "Salvataggio non riuscito."),
  });

  const scelto = (tipi.data ?? []).find((t) => t.nome === tipo);
  const stato = statoAbbonamento(profilo?.abbonamento_scadenza ?? null);
  const sospeso = abbonamentoSospeso(profilo?.abbonamento_scadenza ?? null);

  return (
    <section className="card-surface flex flex-col gap-3 p-6">
      <h2 className="text-lg">Abbonamento</h2>
      <p className={`text-base ${stato.colore}`}>{stato.testo}</p>
      {sospeso && (
        <span className="inline-block w-fit rounded-[10px] border border-destructive px-2 py-1 text-base text-destructive">
          Sospeso - abbonamento scaduto il {formattaData(profilo?.abbonamento_scadenza ?? null)}
        </span>
      )}
      {profilo?.data_approvazione && (
        <p className="text-base text-muted-foreground">
          Approvato il {formattaDataOra(profilo.data_approvazione)}
        </p>
      )}
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Tipo di abbonamento</span>
        <select
          className="field"
          value={tipo}
          onChange={(e) => {
            const nome = e.target.value;
            setTipo(nome);
            const trovato = (tipi.data ?? []).find((t) => t.nome === nome);
            if (trovato?.durata_giorni && inizio) {
              const fine = aggiungiGiorni(inizio, trovato.durata_giorni);
              if (fine) setScadenza(fine);
            }
          }}
        >
          <option value="">Nessun tipo</option>
          {(tipi.data ?? []).map((t) => (
            <option key={t.id} value={t.nome}>
              {t.nome} · {etichettaDurata(t.durata_giorni)}
            </option>
          ))}
          {tipo && !(tipi.data ?? []).some((t) => t.nome === tipo) && (
            <option value={tipo}>{tipo} (non più in elenco)</option>
          )}
        </select>
      </label>
      {(tipi.data ?? []).length === 0 && !tipi.isLoading && (
        <p className="text-base text-muted-foreground">
          Non ci sono tipi da scegliere.{" "}
          <Link to="/abbonamenti" className="text-accent underline">
            Definisci i tipi di abbonamento
          </Link>
          .
        </p>
      )}
      {(tipi.data ?? []).length > 0 && (
        <Link to="/abbonamenti" className="text-base text-accent underline">
          Gestisci i tipi di abbonamento
        </Link>
      )}
      <CampoData
        label="Abbonamento dal"
        value={inizio}
        anniAvanti={2}
        onChange={(valore) => {
          setInizio(valore);
          const trovato = (tipi.data ?? []).find((t) => t.nome === tipo);
          if (trovato?.durata_giorni && valore) {
            const fine = aggiungiGiorni(valore, trovato.durata_giorni);
            if (fine) setScadenza(fine);
          }
        }}
      />
      <CampoData
        label="Abbonamento valido fino al"
        value={scadenza}
        onChange={setScadenza}
        anniAvanti={6}
      />
      {scelto?.durata_giorni && (
        <p className="text-sm text-muted-foreground">
          Con questo tipo la scadenza si calcola da sola ({etichettaDurata(scelto.durata_giorni)}).
          Puoi modificarla.
        </p>
      )}
      <button
        type="button"
        className="btn-secondary"
        disabled={salva.isPending}
        onClick={() => salva.mutate()}
      >
        {salva.isPending ? "Attendi…" : "Salva abbonamento"}
      </button>
    </section>
  );
}

function CertificatoCliente({ clienteId, valore }: { clienteId: string; valore: string | null }) {
  const queryClient = useQueryClient();
  const [data, setData] = useState(valore ?? "");
  const [inviato, setInviato] = useState(valore ?? "");

  useEffect(() => {
    setData(valore ?? "");
    setInviato(valore ?? "");
  }, [valore]);

  const salva = useMutation({
    mutationFn: async () => {
      await aggiornaCertificatoFn({
        data: { id: clienteId, certificato_scadenza: data === "" ? null : data },
      });
    },
    onSuccess: async () => {
      setInviato(data);
      await queryClient.invalidateQueries({ queryKey: ["profilo-cliente", clienteId] });
      await queryClient.invalidateQueries({ queryKey: ["certificati-da-rinnovare"] });
      await queryClient.invalidateQueries({ queryKey: ["numeri-dashboard"] });
      avvisoOk("Certificato medico aggiornato.");
    },
    onError: (e) => avvisoErrore(e instanceof Error ? e.message : "Salvataggio non riuscito."),
  });

  const stato = statoCertificato(valore);

  return (
    <section className="card-surface flex flex-col gap-3 p-6">
      <h2 className="text-lg">Certificato medico</h2>
      <p className={`text-base ${stato.colore}`}>{stato.testo}</p>
      <CampoData
        label="Certificato medico valido fino al"
        value={data}
        onChange={setData}
        anniAvanti={3}
      />
      <button
        type="button"
        className="btn-secondary"
        disabled={salva.isPending || data === inviato}
        onClick={() => salva.mutate()}
      >
        {salva.isPending ? "Attendi…" : "Salva certificato"}
      </button>
    </section>
  );
}

function DatiScheda({
  clienteId,
  scheda,
  abbonamentoScadenza,
  onErrore,
  onFatto,
}: {
  clienteId: string;
  scheda: Scheda | null;
  abbonamentoScadenza: string | null;
  onErrore: (m: string | null) => void;
  onFatto: () => void;
}) {
  const [titolo, setTitolo] = useState(scheda?.titolo ?? "Scheda di allenamento");
  const [inizio, setInizio] = useState(() => scheda?.data_inizio ?? oggiRoma());
  const [scadenza, setScadenza] = useState(
    () => scheda?.data_scadenza ?? aggiungiGiorni(oggiRoma(), 56) ?? "",
  );
  const [note, setNote] = useState(scheda?.note_gestore ?? "");

  const salva = useMutation({
    mutationFn: async () => {
      verificaDateScheda(inizio || new Date().toISOString().slice(0, 10), scadenza);
      const valori = {
        titolo: titolo.trim() || "Scheda di allenamento",
        data_inizio: inizio || new Date().toISOString().slice(0, 10),
        data_scadenza: scadenza,
        note_gestore: testoOppureNull(note),
      };
      if (scheda) {
        await salvaSchedaFn({ data: { id: scheda.id, cliente_id: clienteId, ...valori } });
      } else {
        await salvaSchedaFn({ data: { cliente_id: clienteId, ...valori } });
      }
    },
    onError: (e) => {
      const testo = e instanceof Error ? e.message : "Salvataggio non riuscito.";
      onErrore(testo);
      avvisoErrore(testo);
    },
    onSuccess: () => {
      onErrore(null);
      avvisoOk("Scheda salvata.");
      onFatto();
    },
  });

  return (
    <section className="card-surface flex flex-col gap-4 p-6">
      <h2 className="text-lg">{scheda ? "Dati della scheda" : "Crea la scheda"}</h2>
      {!scheda && (
        <p className="text-base text-muted-foreground">
          Parte oggi e dura 8 settimane. Dopo la creazione aggiungi gli esercizi per gruppo
          muscolare.
        </p>
      )}
      {scheda && scheda.stato === "attiva" && (
        <div className="flex flex-col gap-1">
          {schedaProgrammata(scheda) ? (
            <>
              <span className="inline-block w-fit rounded-[10px] border border-accent px-2 py-1 text-base text-accent">
                Programmata - parte il {formattaData(scheda.data_inizio)}
              </span>
              <span className="text-base text-muted-foreground">
                Il cliente la vedrà a partire da quella data.
              </span>
            </>
          ) : schedaScaduta(scheda) ? (
            <>
              <span className="inline-block w-fit rounded-[10px] border border-destructive px-2 py-1 text-base text-destructive">
                Scaduta il {formattaData(scheda.data_scadenza)} - da rinnovare
              </span>
              <span className="text-base text-muted-foreground">
                Il cliente continua a vederla e ad allenarsi finché non la archivi.
              </span>
            </>
          ) : (
            <span className="inline-block w-fit rounded-[10px] border border-border px-2 py-1 text-base text-muted-foreground">
              Attiva
            </span>
          )}
        </div>
      )}
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Titolo</span>
        <input
          className="field"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          placeholder="Es. Scheda ottobre"
        />
      </label>
      <CampoData label="Data di inizio" value={inizio} onChange={setInizio} anniAvanti={2} />
      <CampoData
        label="Data di scadenza"
        value={scadenza}
        onChange={setScadenza}
        required
        anniAvanti={3}
      />
      {abbonamentoScadenza && scadenza && scadenza > abbonamentoScadenza && (
        <p className="rounded-[10px] border border-[#F2A93B] px-3 py-3 text-base text-warning">
          Attenzione: la scheda scade dopo l&apos;abbonamento del cliente, che termina il{" "}
          {formattaData(abbonamentoScadenza)}.
        </p>
      )}
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Note del gestore</span>
        <textarea
          className="field min-h-[96px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="btn-primary"
        disabled={salva.isPending}
        onClick={() => salva.mutate()}
      >
        {scheda ? "Salva dati scheda" : "Crea scheda e aggiungi esercizi"}
      </button>
      {scheda && scheda.stato === "attiva" && (
        <ArchiviaOra scheda={scheda} onErrore={onErrore} onFatto={onFatto} />
      )}
    </section>
  );
}

function ArchiviaOra({
  scheda,
  onErrore,
  onFatto,
}: {
  scheda: Scheda;
  onErrore: (m: string | null) => void;
  onFatto: () => void;
}) {
  const queryClient = useQueryClient();
  const [conferma, setConferma] = useState(false);

  const archivia = useMutation({
    mutationFn: () => archiviaScheda(scheda.id),
    onError: (e) => {
      const testo = e instanceof Error ? e.message : "Archiviazione non riuscita.";
      onErrore(testo);
      avvisoErrore(testo);
    },
    onSuccess: () => {
      onErrore(null);
      avvisoOk("Scheda archiviata.");
      setConferma(false);
      queryClient.invalidateQueries({ queryKey: ["schede-cliente", scheda.cliente_id] });
      queryClient.invalidateQueries({ queryKey: ["numeri-dashboard"] });
      onFatto();
    },
  });

  if (!conferma) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setConferma(true)}>
        Archivia ora
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-[#F2A93B] p-4">
      <p className="text-base text-warning">
        Vuoi archiviare questa scheda? Il cliente non la vedrà più.
      </p>
      <button
        type="button"
        className="btn-primary"
        disabled={archivia.isPending}
        onClick={() => archivia.mutate()}
      >
        Sì, archivia
      </button>
      <button type="button" className="btn-secondary" onClick={() => setConferma(false)}>
        Annulla
      </button>
    </div>
  );
}

function SchedeArchiviate({
  clienteId,
  onDuplica,
}: {
  clienteId: string;
  onDuplica: (id: string) => void;
}) {
  const [apertaId, setApertaId] = useState<string | null>(null);

  const schede = useQuery({
    queryKey: ["schede-cliente", clienteId],
    queryFn: () => caricaSchedeCliente(clienteId),
  });

  const archiviate = (schede.data ?? []).filter((s) => s.stato === "archiviata");

  if (schede.isLoading || archiviate.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg">Schede archiviate</h2>
      {archiviate.map((s) => (
        <article key={s.id} className="card-surface overflow-hidden">
          <button
            type="button"
            className="flex min-h-16 w-full items-center justify-between gap-4 p-5 text-left"
            aria-expanded={apertaId === s.id}
            onClick={() => setApertaId((valore) => (valore === s.id ? null : s.id))}
          >
            <span>
              <span className="block font-display text-lg font-bold">{s.titolo}</span>
              <span className="mt-1 inline-block rounded-[10px] border border-border px-2 py-1 text-base text-muted-foreground">
                Archiviata
              </span>
              <span className="mt-1 block text-base text-muted-foreground">
                {formattaData(s.data_inizio)} → scadenza {formattaData(s.data_scadenza)}
                {s.archiviata_at ? ` · archiviata il ${formattaData(s.archiviata_at)}` : ""}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`h-7 w-7 shrink-0 text-accent transition-transform ${apertaId === s.id ? "rotate-180" : ""}`}
            />
          </button>
          {apertaId === s.id && (
            <div className="flex flex-col gap-4 border-t border-border p-5">
              <VistaSchedaCliente scheda={s} />
              <button type="button" className="btn-primary" onClick={() => onDuplica(s.id)}>
                Duplica questa scheda
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

function DuplicaScheda({
  clienteId,
  apriCon,
  onAperturaGestita,
  onErrore,
  onDuplicata,
}: {
  clienteId: string;
  apriCon: string | null;
  onAperturaGestita: () => void;
  onErrore: (m: string | null) => void;
  onDuplicata: () => void;
}) {
  const [aperta, setAperta] = useState(false);
  const [origineId, setOrigineId] = useState("");
  const [inizio, setInizio] = useState("");
  const [scadenza, setScadenza] = useState("");

  useEffect(() => {
    if (apriCon) {
      setOrigineId(apriCon);
      setAperta(true);
      onAperturaGestita();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apriCon]);

  const schede = useQuery({
    queryKey: ["schede-cliente", clienteId],
    enabled: aperta,
    queryFn: () => caricaSchedeCliente(clienteId),
  });

  const elenco = schede.data ?? [];

  const duplica = useMutation({
    mutationFn: async () => {
      const origine = elenco.find((s) => s.id === origineId) ?? elenco[0];
      if (!origine) throw new Error("Nessuna scheda da duplicare.");
      if (!inizio || !scadenza) throw new Error("Indica la nuova data di inizio e di scadenza.");
      await duplicaScheda(origine, inizio, scadenza);
    },
    onError: (e) => {
      const testo = e instanceof Error ? e.message : "Duplicazione non riuscita.";
      onErrore(testo);
      avvisoErrore(testo);
    },
    onSuccess: () => {
      onErrore(null);
      avvisoOk("Scheda duplicata.");
      setAperta(false);
      setInizio("");
      setScadenza("");
      onDuplicata();
    },
  });

  if (!aperta) {
    return (
      <button type="button" className="btn-secondary w-full" onClick={() => setAperta(true)}>
        Duplica scheda
      </button>
    );
  }

  return (
    <section className="card-surface flex flex-col gap-4 p-6">
      <h2 className="text-lg">Duplica scheda</h2>
      <p className="text-base text-muted-foreground">
        La copia diventa la scheda attiva del cliente: la precedente passa automaticamente in
        archivio e resta consultabile nello storico.
      </p>

      {schede.isLoading && <CaricamentoCard />}
      {!schede.isLoading && elenco.length === 0 && (
        <p className="text-base text-muted-foreground">Il cliente non ha ancora schede da copiare.</p>
      )}

      {elenco.length > 0 && (
        <>
          <label className="flex flex-col gap-2 text-base">
            <span className="text-accent">Scheda da copiare</span>
            <select
              className="field"
              value={origineId || elenco[0]!.id}
              onChange={(e) => setOrigineId(e.target.value)}
            >
              {elenco.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titolo} · {formattaData(s.data_inizio)} → {formattaData(s.data_scadenza)}
                  {s.stato === "archiviata" ? " (archiviata)" : ""}
                </option>
              ))}
            </select>
          </label>
          <CampoData
            label="Nuova data di inizio"
            value={inizio}
            onChange={setInizio}
            required
            anniAvanti={2}
          />
          <CampoData
            label="Nuova data di scadenza"
            value={scadenza}
            onChange={setScadenza}
            required
            anniAvanti={3}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={duplica.isPending}
            onClick={() => duplica.mutate()}
          >
            Crea la copia
          </button>
        </>
      )}

      <button type="button" className="btn-secondary w-full" onClick={() => setAperta(false)}>
        Annulla
      </button>
    </section>
  );
}
