import { statoCertificato } from "@/lib/certificato";
import { abbonamentoDaRinnovare, abbonamentoSospeso, statoAbbonamento } from "@/lib/abbonamento";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { caricaSessioneApp, etichettaStato, type Profilo } from "@/lib/profilo";
import { elencoProfiliFn, obiettiviNominatiFn } from "@/lib/fn";
import { formattaData, formattaDataOra, giorniAllaScadenza } from "@/lib/date";
import { caricaScadenzePerClienti } from "@/lib/schede";
import { caricaIdGestori, soloClienti } from "@/lib/clienti";
import { andamentoCarico, riepilogoCliente } from "@/lib/allenamenti";
import { FotoProfilo } from "@/components/FotoProfilo";
import { BloccoErrore, CaricamentoCard, StatoVuoto } from "@/components/Stati";

type Filtro = "tutti" | "in-scadenza" | "senza-scheda" | "abbonamento";

const etichettaFiltro: Record<Filtro, string> = {
  tutti: "Clienti",
  "in-scadenza": "Schede in scadenza",
  "senza-scheda": "Clienti senza scheda attiva",
  abbonamento: "Abbonamenti da rinnovare",
};

const vuotoFiltro: Record<Filtro, string> = {
  tutti: "Nessun cliente approvato.",
  "in-scadenza": "Nessuna scheda in scadenza nei prossimi 14 giorni.",
  "senza-scheda": "Tutti i clienti hanno una scheda attiva.",
  abbonamento: "Nessun abbonamento scaduto o in scadenza.",
};

export const Route = createFileRoute("/_authenticated/clienti")({
  validateSearch: (search: Record<string, unknown>): { filtro: Filtro } => {
    const valore = search["filtro"];
    return {
      filtro:
        valore === "in-scadenza" || valore === "senza-scheda" || valore === "abbonamento"
          ? valore
          : ("tutti" as Filtro),
    };
  },
  head: () => ({
    meta: [
      { title: "Clienti | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Scheda dei clienti approvati con dati anagrafici e obiettivi selezionati.",
      },
      { property: "og:title", content: "Clienti | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Scheda dei clienti approvati con dati anagrafici e obiettivi selezionati.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Clienti,
});

function Clienti() {
  const { filtro } = Route.useSearch();
  const [aperto, setAperto] = useState<string | null>(null);
  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });

  const elenco = useQuery({
    queryKey: ["clienti-approvati"],
    enabled: sessione.data?.isGestore === true,
    queryFn: async () => {
      const [gestori, data] = await Promise.all([
        caricaIdGestori(),
        elencoProfiliFn({ data: { stato: "approvato" } }),
      ]);
      return soloClienti(data, gestori);
    },
  });

  const scadenze = useQuery({
    queryKey: ["scadenze-schede", (elenco.data ?? []).map((p) => p.id).join(",")],
    enabled: (elenco.data ?? []).length > 0,
    queryFn: () => caricaScadenzePerClienti((elenco.data ?? []).map((p) => p.id)),
  });

  if (sessione.isLoading) {
    return (
      <Pagina titolo={etichettaFiltro[filtro]}>
        <CaricamentoCard />
      </Pagina>
    );
  }

  if (!sessione.data?.isGestore) {
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

  const caricamento = elenco.isLoading || (scadenze.isLoading && filtro !== "tutti");
  const errore = elenco.isError || scadenze.isError;

  const tutti = elenco.data ?? [];
  const mappaScadenze = scadenze.data ?? {};
  const voci = tutti.filter((p) => {
    const scadenza = mappaScadenze[p.id];
    if (filtro === "senza-scheda") return !scadenza;
    if (filtro === "in-scadenza") return !!scadenza && giorniAllaScadenza(scadenza) <= 14;
    if (filtro === "abbonamento") return abbonamentoDaRinnovare(p.abbonamento_scadenza);
    return true;
  });

  return (
    <Pagina titolo={etichettaFiltro[filtro]} nota="Scegli un cliente per aprire la scheda o vedere i dati.">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["tutti", "Tutti"],
            ["in-scadenza", "Schede in scadenza"],
            ["senza-scheda", "Senza scheda"],
            ["abbonamento", "Abbonamenti"],
          ] as const
        ).map(([chiave, etichetta]) => (
          <Link
            key={chiave}
            to="/clienti"
            search={{ filtro: chiave }}
            className={`rounded-full border px-3 py-2 text-sm font-semibold ${
              filtro === chiave ? "border-primary bg-primary text-white" : "border-border text-muted-foreground"
            }`}
          >
            {etichetta}
          </Link>
        ))}
      </div>

      {caricamento && <CaricamentoCard />}

      {!caricamento && errore && (
        <BloccoErrore
          onRiprova={() => {
            elenco.refetch();
            scadenze.refetch();
          }}
        />
      )}

      {!caricamento && !errore && voci.length === 0 && <StatoVuoto testo={vuotoFiltro[filtro]} />}

      {!caricamento && !errore && voci.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {voci.length} {voci.length === 1 ? "cliente" : "clienti"}
        </p>
      )}

      {!caricamento &&
        !errore &&
        voci.map((p) => (
        <article key={p.id} className="card-surface flex flex-col gap-4 p-4 lg:p-5">
          <div className="grid items-center gap-4 lg:grid-cols-[minmax(14rem,1.1fr)_minmax(16rem,1.6fr)_auto]">
            <div className="flex items-center gap-3">
              <FotoProfilo nome={p.nome} cognome={p.cognome} fotoUrl={p.foto_url} misura="sm" />
              <h2 className="text-lg">
                {p.nome} {p.cognome}
              </h2>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              {abbonamentoSospeso(p.abbonamento_scadenza) && (
                <span className="text-destructive">
                  Sospeso — abbonamento scaduto il {formattaData(p.abbonamento_scadenza)}
                </span>
              )}
              <ScadenzaScheda scadenza={mappaScadenze[p.id] ?? null} />
              <p className={statoAbbonamento(p.abbonamento_scadenza).colore}>
                {statoAbbonamento(p.abbonamento_scadenza).testo}
              </p>
              <p className={statoCertificato(p.certificato_scadenza).colore}>
                {statoCertificato(p.certificato_scadenza).testo}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <button type="button" className="btn-secondary btn-auto" onClick={() => setAperto(aperto === p.id ? null : p.id)}>
                {aperto === p.id ? "Chiudi" : "Dettaglio"}
              </button>
              <Link to="/scheda" search={{ cliente: p.id }} className="btn-primary btn-auto text-center">
                {mappaScadenze[p.id] ? "Scheda" : "Crea scheda"}
              </Link>
            </div>
          </div>
          {aperto === p.id && (
            <div className="grid gap-4 border-t border-border pt-4 lg:grid-cols-3">
              <dl className="flex flex-col gap-2 text-base text-muted-foreground">
                <Riga etichetta="Email" valore={p.email} />
                <Riga etichetta="Telefono" valore={p.telefono ?? "—"} />
                <Riga etichetta="Data di nascita" valore={formattaData(p.data_nascita)} />
                <Riga etichetta="Sesso" valore={p.sesso ?? "—"} />
                <Riga etichetta="Stato" valore={etichettaStato[p.stato]} />
                <Riga
                  etichetta="Approvato il"
                  valore={p.data_approvazione ? formattaDataOra(p.data_approvazione) : "—"}
                />
              </dl>
              <dl className="flex flex-col gap-2 text-base text-muted-foreground">
                <Riga etichetta="Tipo di abbonamento" valore={p.tipo_abbonamento ?? "—"} />
                <Riga etichetta="Abbonamento dal" valore={formattaData(p.abbonamento_inizio)} />
                <Riga
                  etichetta="Abbonamento valido fino al"
                  valore={formattaData(p.abbonamento_scadenza)}
                />
              </dl>
              <div className="flex flex-col gap-4">
                <ObiettiviCliente clienteId={p.id} />
                <AllenamentiCliente clienteId={p.id} />
              </div>
            </div>
          )}
        </article>
        ))}
    </Pagina>
  );
}

function ScadenzaScheda({ scadenza }: { scadenza: string | null }) {
  if (!scadenza) {
    return <p className="text-base text-destructive">Nessuna scheda attiva</p>;
  }
  const giorni = giorniAllaScadenza(scadenza);
  if (giorni < 0) {
    return (
      <p className="text-base text-destructive">
        Scaduta il {formattaData(scadenza)} - da rinnovare
      </p>
    );
  }
  const colore =
    giorni <= 3 ? "text-destructive" : giorni <= 14 ? "text-warning" : "text-muted-foreground";
  return <p className={`text-base ${colore}`}>Scadenza scheda: {formattaData(scadenza)}</p>;
}

function ObiettiviCliente({ clienteId }: { clienteId: string }) {
  const q = useQuery({
    queryKey: ["obiettivi-di", clienteId],
    queryFn: async () => {
      return obiettiviNominatiFn({ data: { clienteId } });
    },
  });

  const voci = (q.data ?? [])
    .filter((v) => v.obiettivi)
    .sort((a, b) => (a.obiettivi!.ordine ?? 0) - (b.obiettivi!.ordine ?? 0));

  return (
    <section className="rounded-[10px] border border-[#58ADEC] p-4">
      <h3 className="text-base font-semibold text-accent">Obiettivi selezionati</h3>
      {q.isLoading && <CaricamentoCard />}
      {!q.isLoading && voci.length === 0 && (
        <p className="mt-2 text-base text-muted-foreground">
          Il cliente non ha ancora scelto i propri obiettivi.
        </p>
      )}
      <ul className="mt-2 flex flex-col gap-2">
        {voci.map((v) => (
          <li key={v.obiettivi!.nome} className="text-base">
            {v.obiettivi!.nome}
            <span className="text-muted-foreground"> · scelto il {formattaData(v.data_selezione)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AllenamentiCliente({ clienteId }: { clienteId: string }) {
  const riepilogo = useQuery({
    queryKey: ["riepilogo-allenamenti", clienteId],
    queryFn: () => riepilogoCliente(clienteId),
  });
  const carichi = useQuery({
    queryKey: ["andamento-carico", clienteId],
    queryFn: () => andamentoCarico(clienteId),
  });

  return (
    <section className="rounded-[10px] border border-[#58ADEC] p-4">
      <h3 className="text-base font-semibold text-accent">Allenamenti</h3>
      {riepilogo.isLoading && <CaricamentoCard />}
      {riepilogo.data && (
        <dl className="mt-2 flex flex-col gap-2 text-base">
          <Riga etichetta="Ultimo allenamento" valore={formattaData(riepilogo.data.ultimo)} />
          <Riga etichetta="Ultimi 30 giorni" valore={String(riepilogo.data.ultimi30)} />
        </dl>
      )}

      <h4 className="mt-4 text-base font-semibold text-accent">Andamento del carico</h4>
      {!carichi.isLoading && (carichi.data ?? []).length === 0 && (
        <p className="mt-2 text-base text-muted-foreground">Nessun dato registrato.</p>
      )}
      <ul className="mt-2 flex flex-col gap-3">
        {(carichi.data ?? []).map((e) => (
          <li key={e.chiave} className="text-base">
            <span className="font-semibold">{e.nome}</span>
            <span className="block text-muted-foreground">
              {e.punti
                .map((p) =>
                  p.peso_kg !== null
                    ? `${formattaData(p.data)}: ${p.peso_kg} kg`
                    : `${formattaData(p.data)}: ${p.durata_minuti} min`,
                )
                .join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Riga({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-accent">{etichetta}</dt>
      <dd className="text-right text-foreground">{valore}</dd>
    </div>
  );
}

function Pagina({
  titolo,
  nota,
  children,
}: {
  titolo: string;
  nota?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="pagina">
      <div className="pagina-contenuto">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl">{titolo}</h1>
            {nota && <p className="mt-1 text-base text-muted-foreground">{nota}</p>}
          </div>
          <Link to="/area" className="text-sm font-semibold text-accent">
            Torna all&apos;area
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}
