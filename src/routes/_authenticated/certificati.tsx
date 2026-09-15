import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { caricaSessioneApp, type Profilo } from "@/lib/profilo";
import { caricaIdGestori, soloClienti } from "@/lib/clienti";
import { certificatoDaRinnovare, statoCertificato } from "@/lib/certificato";
import { BloccoErrore, CaricamentoCard, StatoVuoto } from "@/components/Stati";

export const Route = createFileRoute("/_authenticated/certificati")({
  head: () => ({
    meta: [
      { title: "Certificati da rinnovare | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Clienti con certificato medico scaduto o in scadenza entro 30 giorni.",
      },
      { property: "og:title", content: "Certificati da rinnovare | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Clienti con certificato medico scaduto o in scadenza entro 30 giorni.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Certificati,
});

function Certificati() {
  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const elenco = useQuery({
    queryKey: ["certificati-da-rinnovare"],
    enabled: sessione.data?.isGestore === true,
    queryFn: async () => {
      const [gestori, { data, error }] = await Promise.all([
        caricaIdGestori(),
        supabase
          .from("profili")
          .select("*")
          .eq("stato", "approvato")
          .order("cognome", { ascending: true }),
      ]);
      if (error) throw error;
      return soloClienti((data ?? []) as Profilo[], gestori).filter((p) =>
        certificatoDaRinnovare(p.certificato_scadenza),
      );
    },
  });

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl">Certificati da rinnovare</h1>

        {(sessione.isLoading || elenco.isLoading) && <CaricamentoCard />}
        {elenco.isError && <BloccoErrore onRiprova={() => elenco.refetch()} />}
        {!sessione.isLoading && !sessione.data?.isGestore && (
          <p className="text-base text-muted-foreground">
            Questa pagina è riservata ai gestori della palestra.
          </p>
        )}

        {elenco.isSuccess && elenco.data.length === 0 && (
          <StatoVuoto testo="Nessun certificato scaduto o in scadenza nei prossimi 30 giorni." />
        )}

        {(elenco.data ?? []).map((p) => {
          const stato = statoCertificato(p.certificato_scadenza);
          return (
            <article key={p.id} className="card-surface flex flex-col gap-2 p-6">
              <h2 className="text-lg">
                {p.nome} {p.cognome}
              </h2>
              <p className={`text-base ${stato.colore}`}>{stato.testo}</p>
              <Link to="/clienti" search={{ filtro: "tutti" as const }} className="btn-secondary text-center">
                Vai ai clienti
              </Link>
            </article>
          );
        })}

        <Link to="/area" className="btn-secondary w-full text-center">
          Torna alla mia area
        </Link>
      </div>
    </main>
  );
}
