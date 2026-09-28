import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BloccoErrore, CaricamentoCard, StatoVuoto } from "@/components/Stati";
import {
  caricaTipiAbbonamento,
  eliminaTipoAbbonamento,
  etichettaDurata,
  salvaTipoAbbonamento,
  type TipoAbbonamento,
} from "@/lib/abbonamento";
import { avvisoOk } from "@/lib/avvisi";
import { caricaSessioneApp } from "@/lib/profilo";

export const Route = createFileRoute("/_authenticated/abbonamenti")({
  head: () => ({
    meta: [
      { title: "Tipi di abbonamento | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Elenco dei tipi di abbonamento che il gestore può assegnare ai soci.",
      },
    ],
  }),
  component: Abbonamenti,
});

type Modulo = { nome: string; durata: string; attivo: boolean };

const vuoto: Modulo = { nome: "", durata: "", attivo: true };

function Abbonamenti() {
  const queryClient = useQueryClient();
  const [errore, setErrore] = useState<string | null>(null);
  const [nuovo, setNuovo] = useState(false);
  const [modifica, setModifica] = useState<string | null>(null);
  const [modulo, setModulo] = useState<Modulo>(vuoto);
  const [elimina, setElimina] = useState<TipoAbbonamento | null>(null);

  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const elenco = useQuery({
    queryKey: ["tipi-abbonamento"],
    enabled: sessione.data?.isGestore === true,
    queryFn: () => caricaTipiAbbonamento(false),
  });

  function chiudiModulo() {
    setNuovo(false);
    setModifica(null);
    setModulo(vuoto);
    setErrore(null);
  }

  const salva = useMutation({
    mutationFn: async () => {
      const nome = modulo.nome.trim();
      if (!nome) throw new Error("Il nome è obbligatorio.");
      const durataTesto = modulo.durata.trim();
      let durata: number | null = null;
      if (durataTesto) {
        if (!/^\d+$/.test(durataTesto)) {
          throw new Error("La durata va indicata in giorni, solo con un numero.");
        }
        durata = Number(durataTesto);
      }
      await salvaTipoAbbonamento({
        ...(modifica ? { id: modifica } : {}),
        nome,
        durata_giorni: durata,
        attivo: modulo.attivo,
      });
    },
    onSuccess: async () => {
      chiudiModulo();
      await queryClient.invalidateQueries({ queryKey: ["tipi-abbonamento"] });
      avvisoOk("Tipo di abbonamento salvato.");
    },
    onError: (e) => setErrore(e instanceof Error ? e.message : "Salvataggio non riuscito."),
  });

  const rimuovi = useMutation({
    mutationFn: (id: string) => eliminaTipoAbbonamento(id),
    onSuccess: async () => {
      setElimina(null);
      await queryClient.invalidateQueries({ queryKey: ["tipi-abbonamento"] });
      avvisoOk("Tipo rimosso dall'elenco. I soci che lo avevano restano invariati.");
    },
    onError: (e) => setErrore(e instanceof Error ? e.message : "Eliminazione non riuscita."),
  });

  if (sessione.isLoading) {
    return (
      <Pagina titolo="Tipi di abbonamento">
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

  const tipi = elenco.data ?? [];
  const moduloAperto = nuovo || modifica !== null;

  return (
    <Pagina titolo="Tipi di abbonamento">
      <p className="text-base text-muted-foreground">
        Qui definisci i piani che usate in palestra. Quando assegni l&apos;abbonamento a un socio
        scegli da questo elenco. Se indichi la durata in giorni, la scadenza si calcola da sola e
        puoi comunque correggerla.
      </p>

      {elenco.isLoading && <CaricamentoCard />}
      {elenco.isError && <BloccoErrore onRiprova={() => elenco.refetch()} />}
      {!elenco.isLoading && !elenco.isError && tipi.length === 0 && !moduloAperto && (
        <StatoVuoto testo="Nessun tipo di abbonamento. Aggiungi quelli che usate, per esempio mensile o annuale." />
      )}

      {tipi.map((tipo) =>
        modifica === tipo.id ? (
          <ModuloTipo
            key={tipo.id}
            modulo={modulo}
            setModulo={setModulo}
            errore={errore}
            attesa={salva.isPending}
            onAnnulla={chiudiModulo}
            onSalva={() => salva.mutate()}
          />
        ) : (
          <article key={tipo.id} className="card-surface flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg">{tipo.nome}</h2>
                <p className="text-base text-muted-foreground">{etichettaDurata(tipo.durata_giorni)}</p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-sm ${
                  tipo.attivo ? "border-success text-success" : "border-border text-muted-foreground"
                }`}
              >
                {tipo.attivo ? "In elenco" : "Nascosto"}
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => {
                  setErrore(null);
                  setNuovo(false);
                  setModifica(tipo.id);
                  setModulo({
                    nome: tipo.nome,
                    durata: tipo.durata_giorni ? String(tipo.durata_giorni) : "",
                    attivo: tipo.attivo,
                  });
                }}
              >
                Modifica
              </button>
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => {
                  setErrore(null);
                  setElimina(tipo);
                }}
              >
                Elimina
              </button>
            </div>
          </article>
        ),
      )}

      {nuovo && (
        <ModuloTipo
          modulo={modulo}
          setModulo={setModulo}
          errore={errore}
          attesa={salva.isPending}
          onAnnulla={chiudiModulo}
          onSalva={() => salva.mutate()}
        />
      )}

      {!moduloAperto && (
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setErrore(null);
            setModifica(null);
            setModulo(vuoto);
            setNuovo(true);
          }}
        >
          Aggiungi un tipo
        </button>
      )}

      {elimina && (
        <section className="card-surface flex flex-col gap-3 border-destructive p-5">
          <p className="text-base">
            Eliminare «{elimina.nome}» dall&apos;elenco? I soci che lo hanno già assegnato
            conservano quel nome.
          </p>
          {errore && <p className="text-base text-destructive">{errore}</p>}
          <button
            type="button"
            className="btn-primary"
            disabled={rimuovi.isPending}
            onClick={() => rimuovi.mutate(elimina.id)}
          >
            {rimuovi.isPending ? "Attendi…" : "Elimina"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setElimina(null)}>
            Annulla
          </button>
        </section>
      )}
    </Pagina>
  );
}

function ModuloTipo({
  modulo,
  setModulo,
  errore,
  attesa,
  onAnnulla,
  onSalva,
}: {
  modulo: Modulo;
  setModulo: (modulo: Modulo) => void;
  errore: string | null;
  attesa: boolean;
  onAnnulla: () => void;
  onSalva: () => void;
}) {
  return (
    <section className="card-surface flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-2">
        <span className="text-base font-semibold text-accent">Nome</span>
        <input
          className="field"
          value={modulo.nome}
          onChange={(e) => setModulo({ ...modulo, nome: e.target.value })}
          placeholder="Es. Mensile, Trimestrale, 10 ingressi"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-base font-semibold text-accent">Durata in giorni</span>
        <input
          className="field"
          inputMode="numeric"
          value={modulo.durata}
          onChange={(e) => setModulo({ ...modulo, durata: e.target.value })}
          placeholder="Vuoto se la scadenza la decidi tu di volta in volta"
        />
      </label>
      <label className="flex items-center gap-3 text-base">
        <input
          type="checkbox"
          className="size-6 accent-[#1080CC]"
          checked={modulo.attivo}
          onChange={(e) => setModulo({ ...modulo, attivo: e.target.checked })}
        />
        Disponibile quando assegni un abbonamento
      </label>
      {errore && <p className="text-base text-destructive">{errore}</p>}
      <button type="button" className="btn-primary" disabled={attesa} onClick={onSalva}>
        {attesa ? "Attendi…" : "Salva"}
      </button>
      <button type="button" className="btn-secondary" onClick={onAnnulla}>
        Annulla
      </button>
    </section>
  );
}

function Pagina({ titolo, children }: { titolo: string; children?: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl">{titolo}</h1>
        {children}
      </div>
    </main>
  );
}
