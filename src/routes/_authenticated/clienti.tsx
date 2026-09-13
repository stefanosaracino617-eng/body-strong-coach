import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { caricaSessioneApp, etichettaStato, type Profilo } from "@/lib/profilo";
import { formattaData, giorniAllaScadenza } from "@/lib/date";
import { caricaScadenzePerClienti } from "@/lib/schede";
import { andamentoCarico, riepilogoCliente } from "@/lib/allenamenti";
import { BloccoErrore, CaricamentoCard, StatoVuoto } from "@/components/Stati";

type Filtro = "tutti" | "in-scadenza" | "senza-scheda";

const etichettaFiltro: Record<Filtro, string> = {
  tutti: "Clienti",
  "in-scadenza": "Schede in scadenza",
  "senza-scheda": "Clienti senza scheda attiva",
};

const vuotoFiltro: Record<Filtro, string> = {
  tutti: "Nessun cliente approvato.",
  "in-scadenza": "Nessuna scheda in scadenza nei prossimi 14 giorni.",
  "senza-scheda": "Tutti i clienti hanno una scheda attiva.",
};

export const Route = createFileRoute("/_authenticated/clienti")({
  validateSearch: (search: Record<string, unknown>): { filtro: Filtro } => {
    const valore = search["filtro"];
    return {
      filtro:
        valore === "in-scadenza" || valore === "senza-scheda" ? valore : ("tutti" as Filtro),
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
      const { data, error } = await supabase
        .from("profili")
        .select("*")
        .eq("stato", "approvato")
        .order("cognome", { ascending: true });
      if (error) throw error;
      return data as Profilo[];
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
    return true;
  });

  return (
    <Pagina titolo={etichettaFiltro[filtro]}>
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

      {!caricamento &&
        !errore &&
        voci.map((p) => (
        <article key={p.id} className="card-surface flex flex-col gap-3 p-6">
          <h2 className="text-lg">
            {p.nome} {p.cognome}
          </h2>
          <ScadenzaScheda scadenza={mappaScadenze[p.id] ?? null} />
          {aperto === p.id ? (
            <>
              <dl className="flex flex-col gap-2 text-base text-muted-foreground">
                <Riga etichetta="Email" valore={p.email} />
                <Riga etichetta="Telefono" valore={p.telefono ?? "—"} />
                <Riga etichetta="Data di nascita" valore={formattaData(p.data_nascita)} />
                <Riga etichetta="Sesso" valore={p.sesso ?? "—"} />
                <Riga etichetta="Stato" valore={etichettaStato[p.stato]} />
              </dl>
              <ObiettiviCliente clienteId={p.id} />
              <AllenamentiCliente clienteId={p.id} />
              <Link
                to="/scheda"
                search={{ cliente: p.id }}
                className="btn-primary text-center"
              >
                Scheda di allenamento
              </Link>
              <button type="button" className="btn-secondary w-full" onClick={() => setAperto(null)}>
                Chiudi dettaglio
              </button>
            </>
          ) : (
            <button type="button" className="btn-primary" onClick={() => setAperto(p.id)}>
              Apri dettaglio
            </button>
          )}
        </article>
        ))}

      <Link to="/area" className="btn-secondary w-full">
        Torna alla mia area
      </Link>
    </Pagina>
  );
}

function ScadenzaScheda({ scadenza }: { scadenza: string | null }) {
  if (!scadenza) {
    return <p className="text-base text-destructive">Nessuna scheda attiva</p>;
  }
  const giorni = giorniAllaScadenza(scadenza);
  const colore =
    giorni <= 3 ? "text-destructive" : giorni <= 14 ? "text-warning" : "text-muted-foreground";
  return <p className={`text-base ${colore}`}>Scadenza scheda: {formattaData(scadenza)}</p>;
}

function ObiettiviCliente({ clienteId }: { clienteId: string }) {
  const q = useQuery({
    queryKey: ["obiettivi-di", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_obiettivi")
        .select("data_selezione, obiettivi(nome, ordine)")
        .eq("cliente_id", clienteId);
      if (error) throw error;
      return (data ?? []) as { data_selezione: string; obiettivi: { nome: string; ordine: number } | null }[];
    },
  });

  const voci = (q.data ?? [])
    .filter((v) => v.obiettivi)
    .sort((a, b) => (a.obiettivi!.ordine ?? 0) - (b.obiettivi!.ordine ?? 0));

  return (
    <section className="rounded-[10px] border border-[#58ADEC] p-4">
      <h3 className="text-base font-semibold text-accent">Obiettivi selezionati</h3>
      {q.isLoading && <p className="mt-2 text-base text-muted-foreground">Caricamento…</p>}
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
      {riepilogo.isLoading && <p className="mt-2 text-base text-muted-foreground">Caricamento…</p>}
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

function Pagina({ titolo, children }: { titolo: string; children?: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl">{titolo}</h1>
        {children}
      </div>
    </main>
  );
}
