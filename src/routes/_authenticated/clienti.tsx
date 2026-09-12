import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { caricaSessioneApp, etichettaStato, type Profilo } from "@/lib/profilo";
import { formattaData } from "@/lib/date";

export const Route = createFileRoute("/_authenticated/clienti")({
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

  if (sessione.isLoading) return <Pagina titolo="Caricamento…" />;

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

  const voci = elenco.data ?? [];

  return (
    <Pagina titolo="Clienti">
      {elenco.isLoading && <p className="text-base text-muted-foreground">Caricamento…</p>}

      {!elenco.isLoading && voci.length === 0 && (
        <div className="card-surface p-6 text-base text-muted-foreground">
          Nessun cliente approvato.
        </div>
      )}

      {voci.map((p) => (
        <article key={p.id} className="card-surface flex flex-col gap-3 p-6">
          <h2 className="text-lg">
            {p.nome} {p.cognome}
          </h2>
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
