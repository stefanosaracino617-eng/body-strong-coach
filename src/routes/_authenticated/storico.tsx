import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { caricaSessioneApp } from "@/lib/profilo";
import { caricaStorico } from "@/lib/allenamenti";
import { formattaData, formattaDataOra } from "@/lib/date";

export const Route = createFileRoute("/_authenticated/storico")({
  head: () => ({
    meta: [
      { title: "Storico allenamenti | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Elenco degli allenamenti svolti con data e sessione della scheda.",
      },
      { property: "og:title", content: "Storico allenamenti | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Elenco degli allenamenti svolti con data e sessione della scheda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Storico,
});

function Storico() {
  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const clienteId = sessione.data?.profilo.id;

  const storico = useQuery({
    queryKey: ["storico-allenamenti", clienteId],
    enabled: !!clienteId,
    queryFn: () => caricaStorico(clienteId!),
  });

  const voci = (storico.data ?? []).filter((a) => a.completato_at !== null);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl">Storico allenamenti</h1>

        {storico.isLoading && <p className="text-lg text-muted-foreground">Caricamento…</p>}

        {!storico.isLoading && voci.length === 0 && (
          <p className="card-surface p-6 text-lg text-muted-foreground">
            Non hai ancora registrato allenamenti.
          </p>
        )}

        {voci.map((a) => (
          <article key={a.id} className="card-surface flex flex-col gap-2 p-5">
            <h2 className="text-xl">{a.sessione || "Allenamento"}</h2>
            <p className="text-base text-muted-foreground">{formattaData(a.data)}</p>
            <p className="text-base text-muted-foreground">
              Concluso il {formattaDataOra(a.completato_at)}
            </p>
            {a.note_cliente && <p className="whitespace-pre-line text-lg">{a.note_cliente}</p>}
          </article>
        ))}

        <Link to="/area" className="btn-secondary w-full">
          Torna alla mia area
        </Link>
      </div>
    </main>
  );
}
