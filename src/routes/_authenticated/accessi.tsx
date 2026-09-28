import { createFileRoute, Link } from "@tanstack/react-router";
import { BloccoErrore, CaricamentoCard, StatoVuoto } from "@/components/Stati";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { caricaSessioneApp, type Profilo } from "@/lib/profilo";
import { assegnaGestoreFn, elencoProfiliFn, idGestoriFn } from "@/lib/fn";

export const Route = createFileRoute("/_authenticated/accessi")({
  head: () => ({
    meta: [
      { title: "Gestione accessi | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Assegna o revoca il ruolo di gestore ai profili approvati della palestra.",
      },
      { property: "og:title", content: "Gestione accessi | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Assegna o revoca il ruolo di gestore ai profili approvati della palestra.",
      },
    ],
  }),
  component: Accessi,
});

type Voce = Profilo & { isGestore: boolean };

function Accessi() {
  const queryClient = useQueryClient();
  const [errore, setErrore] = useState<string | null>(null);
  const [conferma, setConferma] = useState<{ voce: Voce; assegna: boolean } | null>(null);

  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });

  const elenco = useQuery({
    queryKey: ["profili-approvati"],
    enabled: sessione.data?.isGestore === true,
    queryFn: async (): Promise<Voce[]> => {
      const [profili, ruoli] = await Promise.all([
        elencoProfiliFn({ data: { stato: "approvato" } }),
        idGestoriFn(),
      ]);
      const gestori = new Set(ruoli);
      return profili.map((p) => ({ ...p, isGestore: gestori.has(p.id) }));
    },
  });

  const cambia = useMutation({
    mutationFn: async ({ voce, assegna }: { voce: Voce; assegna: boolean }) => {
      await assegnaGestoreFn({ data: { userId: voce.id, assegna } });
    },
    onError: (e) => setErrore(e instanceof Error ? e.message : "Operazione non riuscita."),
    onSuccess: () => {
      setErrore(null);
      setConferma(null);
      queryClient.invalidateQueries({ queryKey: ["profili-approvati"] });
      queryClient.invalidateQueries({ queryKey: ["sessione-app"] });
    },
  });

  if (sessione.isLoading) return <Pagina titolo="Caricamento"><CaricamentoCard /></Pagina>;

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

  const mioId = sessione.data.profilo.id;
  const voci = elenco.data ?? [];

  return (
    <Pagina titolo="Gestione accessi">
      {errore && (
        <p className="rounded-[10px] border border-destructive px-3 py-3 text-base text-destructive">
          {errore}
        </p>
      )}

      {elenco.isLoading && <CaricamentoCard />}
      {elenco.isError && <BloccoErrore onRiprova={() => elenco.refetch()} />}

      {!elenco.isLoading && voci.length === 0 && (
        <div className="card-surface p-6 text-base text-muted-foreground">
          Nessun profilo approvato.
        </div>
      )}

      <div className="griglia-voci">
      {voci.map((v) => {
        const sonoIo = v.id === mioId;
        return (
          <article key={v.id} className="card-surface flex h-full flex-col gap-3 p-6">
            <h2 className="text-lg">
              {v.nome} {v.cognome}
              {sonoIo ? " (tu)" : ""}
            </h2>
            <p className="text-base text-muted-foreground">{v.email}</p>
            <p className="text-base">
              Ruolo attuale:{" "}
              <span className={v.isGestore ? "text-success" : "text-accent"}>
                {v.isGestore ? "Gestore" : "Cliente"}
              </span>
            </p>

            {conferma?.voce.id === v.id ? (
              <div className="flex flex-col gap-3">
                <p className="text-base text-warning">
                  {conferma.assegna
                    ? `Confermi di assegnare il ruolo di gestore a ${v.nome} ${v.cognome}?`
                    : `Confermi di revocare il ruolo di gestore a ${v.nome} ${v.cognome}?`}
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={cambia.isPending}
                  onClick={() => cambia.mutate(conferma)}
                >
                  Conferma
                </button>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  disabled={cambia.isPending}
                  onClick={() => setConferma(null)}
                >
                  Annulla
                </button>
              </div>
            ) : v.isGestore ? (
              sonoIo ? (
                <p className="text-base text-muted-foreground">
                  Non puoi revocare il ruolo di gestore a te stesso.
                </p>
              ) : (
                <button
                  type="button"
                  className="btn-secondary w-full text-destructive"
                  onClick={() => {
                    setErrore(null);
                    setConferma({ voce: v, assegna: false });
                  }}
                >
                  Revoca ruolo gestore
                </button>
              )
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setErrore(null);
                  setConferma({ voce: v, assegna: true });
                }}
              >
                Assegna ruolo gestore
              </button>
            )}
          </article>
        );
      })}
      </div>
    </Pagina>
  );
}

function Pagina({ titolo, children }: { titolo: string; children?: React.ReactNode }) {
  return (
    <main className="pagina">
      <div className="pagina-contenuto">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl">{titolo}</h1>
            <p className="mt-1 text-base text-muted-foreground">
              Assegna o revoca il ruolo di gestore.
            </p>
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
