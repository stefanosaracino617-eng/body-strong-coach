import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { caricaSessioneApp } from "@/lib/profilo";
import { caricaCatalogo, nomeGruppo, type Obiettivo } from "@/lib/obiettivi";

export const Route = createFileRoute("/_authenticated/catalogo-obiettivi")({
  head: () => ({
    meta: [
      { title: "Catalogo obiettivi | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Crea, modifica e disattiva gli obiettivi di allenamento della palestra.",
      },
      { property: "og:title", content: "Catalogo obiettivi | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Crea, modifica e disattiva gli obiettivi di allenamento della palestra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Catalogo,
});

const GRUPPI = ["generale", "zona", "benessere"];

type Modulo = { nome: string; descrizione: string; gruppo: string; ordine: string; attivo: boolean };

const vuoto: Modulo = { nome: "", descrizione: "", gruppo: "generale", ordine: "0", attivo: true };

function Catalogo() {
  const queryClient = useQueryClient();
  const [errore, setErrore] = useState<string | null>(null);
  const [modifica, setModifica] = useState<string | null>(null);
  const [modulo, setModulo] = useState<Modulo>(vuoto);
  const [nuovo, setNuovo] = useState(false);
  const [elimina, setElimina] = useState<string | null>(null);

  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });

  const catalogo = useQuery({
    queryKey: ["catalogo-obiettivi-completo"],
    enabled: sessione.data?.isGestore === true,
    queryFn: () => caricaCatalogo(false),
  });

  const invalida = () => {
    queryClient.invalidateQueries({ queryKey: ["catalogo-obiettivi-completo"] });
    queryClient.invalidateQueries({ queryKey: ["catalogo-obiettivi"] });
  };

  const salva = useMutation({
    mutationFn: async () => {
      const valori = {
        nome: modulo.nome.trim(),
        descrizione: modulo.descrizione.trim() || null,
        gruppo: modulo.gruppo,
        ordine: Number(modulo.ordine) || 0,
        attivo: modulo.attivo,
      };
      if (!valori.nome) throw new Error("Il nome è obbligatorio.");
      if (modifica) {
        const { error } = await supabase.from("obiettivi").update(valori).eq("id", modifica);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("obiettivi").insert(valori);
        if (error) throw error;
      }
    },
    onError: (e) => setErrore(e instanceof Error ? e.message : "Salvataggio non riuscito."),
    onSuccess: () => {
      setErrore(null);
      setModifica(null);
      setNuovo(false);
      setModulo(vuoto);
      invalida();
    },
  });

  const rimuovi = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("obiettivi").delete().eq("id", id);
      if (error) throw error;
    },
    onError: (e) => setErrore(e instanceof Error ? e.message : "Eliminazione non riuscita."),
    onSuccess: () => {
      setErrore(null);
      setElimina(null);
      invalida();
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

  function apriModifica(o: Obiettivo) {
    setErrore(null);
    setNuovo(false);
    setModifica(o.id);
    setModulo({
      nome: o.nome,
      descrizione: o.descrizione ?? "",
      gruppo: o.gruppo,
      ordine: String(o.ordine),
      attivo: o.attivo,
    });
  }

  const voci = catalogo.data ?? [];

  return (
    <Pagina titolo="Catalogo obiettivi">
      {errore && (
        <p className="rounded-[10px] border border-destructive px-3 py-3 text-base text-destructive">
          {errore}
        </p>
      )}

      {nuovo || modifica ? (
        <div className="card-surface flex flex-col gap-4 p-6">
          <h2 className="text-lg">{modifica ? "Modifica obiettivo" : "Nuovo obiettivo"}</h2>
          <Modulo modulo={modulo} onChange={setModulo} />
          <button
            type="button"
            className="btn-primary"
            disabled={salva.isPending}
            onClick={() => salva.mutate()}
          >
            Salva
          </button>
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => {
              setNuovo(false);
              setModifica(null);
              setModulo(vuoto);
            }}
          >
            Annulla
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setErrore(null);
            setModulo(vuoto);
            setNuovo(true);
          }}
        >
          Aggiungi obiettivo
        </button>
      )}

      {catalogo.isLoading && <p className="text-base text-muted-foreground">Caricamento…</p>}

      {voci.map((o) => (
        <article key={o.id} className="card-surface flex flex-col gap-2 p-6">
          <h2 className="text-lg">{o.nome}</h2>
          {o.descrizione && <p className="text-base text-muted-foreground">{o.descrizione}</p>}
          <p className="text-base text-muted-foreground">
            Gruppo: <span className="text-accent">{nomeGruppo(o.gruppo)}</span> · Ordine: {o.ordine}
          </p>
          <p className={`text-base ${o.attivo ? "text-success" : "text-warning"}`}>
            {o.attivo ? "Attivo" : "Non attivo"}
          </p>
          {elimina === o.id ? (
            <div className="flex flex-col gap-3">
              <p className="text-base text-warning">
                Confermi l&apos;eliminazione di «{o.nome}»? Verrà rimosso anche dalle selezioni dei
                clienti.
              </p>
              <button
                type="button"
                className="btn-secondary w-full text-destructive"
                disabled={rimuovi.isPending}
                onClick={() => rimuovi.mutate(o.id)}
              >
                Conferma eliminazione
              </button>
              <button type="button" className="btn-secondary w-full" onClick={() => setElimina(null)}>
                Annulla
              </button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-3">
              <button type="button" className="btn-primary" onClick={() => apriModifica(o)}>
                Modifica
              </button>
              <button
                type="button"
                className="btn-secondary w-full text-destructive"
                onClick={() => {
                  setErrore(null);
                  setElimina(o.id);
                }}
              >
                Elimina
              </button>
            </div>
          )}
        </article>
      ))}

      <Link to="/area" className="btn-secondary w-full">
        Torna alla mia area
      </Link>
    </Pagina>
  );
}

function Modulo({
  modulo,
  onChange,
}: {
  modulo: Modulo;
  onChange: (m: Modulo) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Nome *</span>
        <input
          className="field"
          value={modulo.nome}
          onChange={(e) => onChange({ ...modulo, nome: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Descrizione</span>
        <input
          className="field"
          value={modulo.descrizione}
          onChange={(e) => onChange({ ...modulo, descrizione: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Gruppo</span>
        <select
          className="field"
          value={modulo.gruppo}
          onChange={(e) => onChange({ ...modulo, gruppo: e.target.value })}
        >
          {GRUPPI.map((g) => (
            <option key={g} value={g}>
              {nomeGruppo(g)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Ordine</span>
        <input
          className="field"
          inputMode="numeric"
          value={modulo.ordine}
          onChange={(e) => onChange({ ...modulo, ordine: e.target.value })}
        />
      </label>
      <label className="flex min-h-[48px] items-center gap-3 text-base">
        <input
          type="checkbox"
          className="h-6 w-6"
          checked={modulo.attivo}
          onChange={(e) => onChange({ ...modulo, attivo: e.target.checked })}
        />
        <span>Attivo (visibile ai clienti)</span>
      </label>
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
