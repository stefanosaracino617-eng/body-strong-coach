import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { caricaSessioneApp, etichettaStato, type Profilo } from "@/lib/profilo";
import { formattaData } from "@/lib/date";
import { avvisoErrore, avvisoOk } from "@/lib/avvisi";
import { BloccoErrore, CaricamentoCard, StatoVuoto } from "@/components/Stati";

export const Route = createFileRoute("/_authenticated/registrazioni")({
  head: () => ({
    meta: [
      { title: "Registrazioni | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Approva o rifiuta le registrazioni dei nuovi clienti della palestra.",
      },
      { property: "og:title", content: "Registrazioni | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Approva o rifiuta le registrazioni dei nuovi clienti della palestra.",
      },
    ],
  }),
  component: Registrazioni,
});

function Registrazioni() {
  const queryClient = useQueryClient();
  const [errore, setErrore] = useState<string | null>(null);

  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });

  const inAttesa = useQuery({
    queryKey: ["registrazioni-in-attesa"],
    enabled: sessione.data?.isGestore === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profili")
        .select("*")
        .eq("stato", "in_attesa")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Profilo[];
    },
  });

  const decidi = useMutation({
    mutationFn: async ({ id, approva }: { id: string; approva: boolean }) => {
      const { error } = await supabase
        .from("profili")
        .update({ stato: approva ? "approvato" : "sospeso" })
        .eq("id", id);
      if (error) throw error;
    },
    onError: (e) => setErrore(e instanceof Error ? e.message : "Operazione non riuscita."),
    onSuccess: () => {
      setErrore(null);
      queryClient.invalidateQueries({ queryKey: ["registrazioni-in-attesa"] });
    },
  });

  if (sessione.isLoading) {
    return <Pagina titolo="Caricamento…" />;
  }

  if (!sessione.data?.isGestore) {
    return (
      <Pagina titolo="Accesso non consentito">
        <p className="text-base text-muted-foreground">
          Questa pagina è riservata al gestore della palestra.
        </p>
        <Link to="/area" className="btn-primary">
          Torna alla mia area
        </Link>
      </Pagina>
    );
  }

  const elenco = inAttesa.data ?? [];

  return (
    <Pagina titolo="Registrazioni in attesa">
      {errore && (
        <p className="rounded-[10px] border border-destructive px-3 py-3 text-base text-destructive">
          {errore}
        </p>
      )}

      {inAttesa.isLoading && <p className="text-base text-muted-foreground">Caricamento…</p>}

      {!inAttesa.isLoading && elenco.length === 0 && (
        <div className="card-surface p-6 text-base text-muted-foreground">
          Nessuna registrazione in attesa.
        </div>
      )}

      {elenco.map((p) => (
        <article key={p.id} className="card-surface flex flex-col gap-3 p-6">
          <h2 className="text-lg">
            {p.nome} {p.cognome}
          </h2>
          <dl className="flex flex-col gap-2 text-base text-muted-foreground">
            <Riga etichetta="Email" valore={p.email} />
            <Riga etichetta="Telefono" valore={p.telefono ?? "—"} />
            <Riga
              etichetta="Data di nascita"
              valore={formattaData(p.data_nascita)}
            />
            <Riga etichetta="Sesso" valore={p.sesso ?? "—"} />
            <Riga etichetta="Privacy" valore={p.consenso_privacy ? "Consenso dato" : "Mancante"} />
            <Riga etichetta="Stato" valore={etichettaStato[p.stato]} />
          </dl>
          <div className="mt-2 flex flex-col gap-3">
            <button
              type="button"
              className="btn-primary"
              disabled={decidi.isPending}
              onClick={() => decidi.mutate({ id: p.id, approva: true })}
            >
              Approva
            </button>
            <button
              type="button"
              className="btn-secondary w-full text-destructive"
              disabled={decidi.isPending}
              onClick={() => decidi.mutate({ id: p.id, approva: false })}
            >
              Rifiuta
            </button>
          </div>
        </article>
      ))}

      <Link to="/area" className="btn-secondary w-full">
        Torna alla mia area
      </Link>
    </Pagina>
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
