import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { caricaSessioneApp } from "@/lib/profilo";
import { caricaAllenamentiRecenti } from "@/lib/dashboard";
import { formattaData } from "@/lib/date";
import { BloccoErrore, CaricamentoCard, StatoVuoto } from "@/components/Stati";

export const Route = createFileRoute("/_authenticated/allenamenti-recenti")({
  head: () => ({
    meta: [
      { title: "Allenamenti recenti | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Allenamenti conclusi dai clienti della palestra negli ultimi 7 giorni.",
      },
      { property: "og:title", content: "Allenamenti recenti | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Allenamenti conclusi dai clienti della palestra negli ultimi 7 giorni.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AllenamentiRecenti,
});

function AllenamentiRecenti() {
  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const elenco = useQuery({
    queryKey: ["allenamenti-recenti"],
    enabled: sessione.data?.isGestore === true,
    queryFn: caricaAllenamentiRecenti,
  });

  if (sessione.isLoading) {
    return (
      <Pagina titolo="Allenamenti negli ultimi 7 giorni">
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

  return (
    <Pagina titolo="Allenamenti negli ultimi 7 giorni">
      {elenco.isLoading && <CaricamentoCard />}
      {elenco.isError && <BloccoErrore onRiprova={() => elenco.refetch()} />}
      {elenco.isSuccess && elenco.data.length === 0 && (
        <StatoVuoto testo="Nessun cliente ha ancora concluso allenamenti." />
      )}
      {(elenco.data ?? []).map((a) => (
        <article key={a.id} className="card-surface flex flex-col gap-1 p-6">
          <h2 className="text-lg">{a.nome}</h2>
          <p className="text-base text-muted-foreground">{a.sessione}</p>
          <p className="text-base text-muted-foreground">{formattaData(a.data)}</p>
        </article>
      ))}
      <Link to="/area" className="btn-secondary w-full">
        Torna alla mia area
      </Link>
    </Pagina>
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
