import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { caricaSessioneApp } from "@/lib/profilo";
import {
  caricaCatalogo,
  caricaObiettiviCliente,
  nomeGruppo,
  salvaObiettiviCliente,
  type Obiettivo,
} from "@/lib/obiettivi";

export const Route = createFileRoute("/_authenticated/obiettivi")({
  head: () => ({
    meta: [
      { title: "I miei obiettivi | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Scegli gli obiettivi del tuo allenamento alla palestra Body Strong Fitness Club.",
      },
      { property: "og:title", content: "I miei obiettivi | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Scegli gli obiettivi del tuo allenamento alla palestra Body Strong Fitness Club.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ObiettiviCliente,
});

function ObiettiviCliente() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selezionati, setSelezionati] = useState<string[]>([]);
  const [pronto, setPronto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);

  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const clienteId = sessione.data?.profilo.id;

  const catalogo = useQuery({ queryKey: ["catalogo-obiettivi"], queryFn: () => caricaCatalogo(true) });

  const selezione = useQuery({
    queryKey: ["obiettivi-cliente", clienteId],
    enabled: !!clienteId,
    queryFn: () => caricaObiettiviCliente(clienteId!),
  });

  useEffect(() => {
    if (selezione.data && !pronto) {
      setSelezionati(selezione.data);
      setPronto(true);
    }
  }, [selezione.data, pronto]);

  const salva = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Sessione non disponibile.");
      await salvaObiettiviCliente(clienteId, selezionati);
    },
    onError: (e) => setErrore(e instanceof Error ? e.message : "Salvataggio non riuscito."),
    onSuccess: () => {
      setErrore(null);
      setSalvato(true);
      queryClient.invalidateQueries({ queryKey: ["obiettivi-cliente"] });
      navigate({ to: "/area" });
    },
  });

  if (sessione.isLoading || catalogo.isLoading || selezione.isLoading) {
    return <Pagina titolo="Caricamento"><CaricamentoCard /></Pagina>;
  }

  const primaVolta = (selezione.data ?? []).length === 0;
  const gruppi = raggruppa(catalogo.data ?? []);

  function commuta(id: string) {
    setSalvato(false);
    setSelezionati((prec) =>
      prec.includes(id) ? prec.filter((x) => x !== id) : [...prec, id],
    );
  }

  return (
    <Pagina titolo={primaVolta ? "Scegli i tuoi obiettivi" : "I miei obiettivi"}>
      <p className="text-base text-muted-foreground">
        Seleziona uno o più obiettivi: aiuteranno il gestore a costruire la tua scheda. Potrai
        modificarli in qualsiasi momento.
      </p>

      {errore && (
        <p className="rounded-[10px] border border-destructive px-3 py-3 text-base text-destructive">
          {errore}
        </p>
      )}
      {salvato && (
        <p className="rounded-[10px] border border-[#2FBF71] px-3 py-3 text-base text-success">
          Obiettivi salvati.
        </p>
      )}

      {gruppi.map(([gruppo, voci]) => (
        <section key={gruppo} className="flex flex-col gap-3">
          <h2 className="text-lg text-accent">{nomeGruppo(gruppo)}</h2>
          <div className="flex flex-col gap-3">
            {voci.map((o) => {
              const attivo = selezionati.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={attivo}
                  onClick={() => commuta(o.id)}
                  className={`card-surface flex min-h-[48px] flex-col gap-1 p-4 text-left ${
                    attivo ? "border-[#2FBF71]" : ""
                  }`}
                >
                  <span className="flex items-center justify-between gap-3 text-base font-semibold">
                    {o.nome}
                    <span className={attivo ? "text-success" : "text-muted-foreground"}>
                      {attivo ? "Selezionato" : "Tocca per scegliere"}
                    </span>
                  </span>
                  {o.descrizione && (
                    <span className="text-base text-muted-foreground">{o.descrizione}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <button
        type="button"
        className="btn-primary"
        disabled={salva.isPending || selezionati.length === 0}
        onClick={() => salva.mutate()}
      >
        {selezionati.length === 0 ? "Seleziona almeno un obiettivo" : "Salva obiettivi"}
      </button>

      {!primaVolta && (
        <Link to="/area" className="btn-secondary w-full">
          Torna alla mia area
        </Link>
      )}
    </Pagina>
  );
}

function raggruppa(voci: Obiettivo[]): [string, Obiettivo[]][] {
  const mappa = new Map<string, Obiettivo[]>();
  for (const v of voci) {
    const lista = mappa.get(v.gruppo) ?? [];
    lista.push(v);
    mappa.set(v.gruppo, lista);
  }
  return [...mappa.entries()];
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
