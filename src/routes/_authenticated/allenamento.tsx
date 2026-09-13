import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { caricaSessioneApp } from "@/lib/profilo";
import { caricaEserciziScheda, caricaSchedaClienteAttiva, nomeRiga, unitaRiga, type SchedaEsercizio } from "@/lib/schede";
import {
  apriAllenamento,
  caricaRigheAllenamento,
  chiaveRiga,
  numeroDecimaleOppureNull,
  salvaRigaAllenamento,
  terminaAllenamento,
  ultimiValori,
} from "@/lib/allenamenti";
import { dataAIso } from "@/lib/date";

export const Route = createFileRoute("/_authenticated/allenamento")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessione: typeof search["sessione"] === "string" ? (search["sessione"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Allenamento in corso | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Registra gli esercizi svolti, il peso utilizzato e le ripetizioni effettive.",
      },
      { property: "og:title", content: "Allenamento in corso | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Registra gli esercizi svolti, il peso utilizzato e le ripetizioni effettive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaAllenamento,
});

type Valori = {
  completato: boolean;
  peso: string;
  ripetizioni: string;
  durata: string;
};

function PaginaAllenamento() {
  const { sessione } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [valori, setValori] = useState<Record<string, Valori>>({});
  const [avviato, setAvviato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);

  const sessioneApp = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const clienteId = sessioneApp.data?.profilo.id;

  const scheda = useQuery({
    queryKey: ["mia-scheda-attiva", clienteId],
    enabled: !!clienteId,
    queryFn: () => caricaSchedaClienteAttiva(clienteId!),
  });

  const righe = useQuery({
    queryKey: ["scheda-esercizi", scheda.data?.id],
    enabled: !!scheda.data,
    queryFn: () => caricaEserciziScheda(scheda.data!.id),
  });

  const precedenti = useQuery({
    queryKey: ["ultimi-valori", clienteId],
    enabled: !!clienteId,
    queryFn: () => ultimiValori(clienteId!),
  });

  const allenamento = useQuery({
    queryKey: ["allenamento-aperto", clienteId, scheda.data?.id, sessione],
    enabled: avviato && !!clienteId && !!scheda.data,
    queryFn: () => apriAllenamento(clienteId!, scheda.data!.id, sessione, dataAIso(new Date())),
  });

  const righeSalvate = useQuery({
    queryKey: ["righe-allenamento", allenamento.data?.id],
    enabled: !!allenamento.data,
    queryFn: () => caricaRigheAllenamento(allenamento.data!.id),
  });

  const eserciziSessione = useMemo(
    () => (righe.data ?? []).filter((r) => r.sessione === sessione),
    [righe.data, sessione],
  );

  // Precompila con l'ultimo valore registrato dal cliente per lo stesso esercizio.
  useEffect(() => {
    if (eserciziSessione.length === 0 || !precedenti.data) return;
    setValori((attuali) => {
      if (Object.keys(attuali).length > 0) return attuali;
      const iniziali: Record<string, Valori> = {};
      for (const riga of eserciziSessione) {
        const ultimo = precedenti.data[chiaveRiga(riga)];
        iniziali[riga.id] = {
          completato: false,
          peso: ultimo?.peso_kg != null ? String(ultimo.peso_kg) : "",
          ripetizioni: ultimo?.ripetizioni_effettive ?? riga.ripetizioni ?? "",
          durata:
            ultimo?.durata_minuti != null
              ? String(ultimo.durata_minuti)
              : riga.durata_minuti != null
                ? String(riga.durata_minuti)
                : "",
        };
      }
      return iniziali;
    });
  }, [eserciziSessione, precedenti.data]);

  // Riprende i valori già registrati oggi in questa sessione.
  useEffect(() => {
    const salvate = righeSalvate.data;
    if (!salvate || salvate.length === 0) return;
    setValori((attuali) => {
      const nuovi = { ...attuali };
      for (const r of salvate) {
        if (!r.scheda_esercizio_id) continue;
        nuovi[r.scheda_esercizio_id] = {
          completato: r.completato,
          peso: r.peso_kg != null ? String(r.peso_kg) : "",
          ripetizioni: r.ripetizioni_effettive ?? "",
          durata: r.durata_minuti != null ? String(r.durata_minuti) : "",
        };
      }
      return nuovi;
    });
  }, [righeSalvate.data]);

  function aggiorna(id: string, parziale: Partial<Valori>) {
    setValori((attuali) => ({
      ...attuali,
      [id]: { completato: false, peso: "", ripetizioni: "", durata: "", ...attuali[id], ...parziale },
    }));
  }

  async function termina() {
    const idAllenamento = allenamento.data?.id;
    if (!idAllenamento) return;
    setSalvataggio(true);
    setErrore(null);
    try {
      for (const riga of eserciziSessione) {
        const v = valori[riga.id];
        if (!v) continue;
        await salvaRigaAllenamento(idAllenamento, riga.id, {
          completato: v.completato,
          peso_kg: numeroDecimaleOppureNull(v.peso),
          ripetizioni_effettive: v.ripetizioni.trim() || null,
          durata_minuti: numeroDecimaleOppureNull(v.durata) !== null ? Math.trunc(numeroDecimaleOppureNull(v.durata)!) : null,
          note: null,
        });
      }
      await terminaAllenamento(idAllenamento, note.trim() || null);
      await queryClient.invalidateQueries({ queryKey: ["storico-allenamenti"] });
      await queryClient.invalidateQueries({ queryKey: ["ultimi-valori"] });
      navigate({ to: "/storico" });
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Salvataggio non riuscito");
    } finally {
      setSalvataggio(false);
    }
  }

  if (sessioneApp.isLoading || scheda.isLoading) return <Pagina titolo="Caricamento…" />;

  if (!scheda.data) {
    return (
      <Pagina titolo="Nessuna scheda attiva">
        <p className="text-lg text-muted-foreground">La tua scheda è in preparazione.</p>
        <Link to="/area" className="btn-secondary w-full">
          Torna alla mia area
        </Link>
      </Pagina>
    );
  }

  return (
    <Pagina titolo={sessione || "Allenamento"}>
      <p className="text-base text-muted-foreground">{scheda.data.titolo}</p>

      {!avviato && (
        <button type="button" className="btn-primary w-full" onClick={() => setAvviato(true)}>
          Avvia allenamento
        </button>
      )}

      {eserciziSessione.length === 0 && (
        <p className="card-surface p-6 text-lg text-muted-foreground">
          Questa sessione non contiene esercizi.
        </p>
      )}

      {eserciziSessione.map((riga) => (
        <SchedaRiga
          key={riga.id}
          riga={riga}
          valori={valori[riga.id]}
          attivo={avviato}
          onCambia={(p) => aggiorna(riga.id, p)}
        />
      ))}

      {avviato && (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-base text-accent">Note dell'allenamento</span>
            <textarea
              className="campo min-h-24"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Come è andata?"
            />
          </label>
          {errore && <p className="text-base text-destructive">{errore}</p>}
          <button
            type="button"
            className="btn-primary w-full"
            disabled={salvataggio || !allenamento.data}
            onClick={termina}
          >
            {salvataggio ? "Salvataggio…" : "Termina allenamento"}
          </button>
        </>
      )}

      <Link to="/area" className="btn-secondary w-full">
        Torna alla mia area
      </Link>
    </Pagina>
  );
}

function SchedaRiga({
  riga,
  valori,
  attivo,
  onCambia,
}: {
  riga: SchedaEsercizio;
  valori: Valori | undefined;
  attivo: boolean;
  onCambia: (p: Partial<Valori>) => void;
}) {
  const aMinuti = unitaRiga(riga) === "minuti";
  const v = valori ?? { completato: false, peso: "", ripetizioni: "", durata: "" };

  return (
    <article className="card-surface flex flex-col gap-4 p-5">
      <h2 className="text-xl">{nomeRiga(riga)}</h2>
      <p className="text-base text-muted-foreground">
        {aMinuti
          ? `Previsto: ${riga.durata_minuti ?? "—"} minuti`
          : `Previsto: ${riga.serie ?? "—"} × ${riga.ripetizioni ?? "—"}`}
      </p>

      <label className="flex min-h-12 items-center gap-3 text-lg">
        <input
          type="checkbox"
          className="h-6 w-6"
          checked={v.completato}
          disabled={!attivo}
          onChange={(e) => onCambia({ completato: e.target.checked })}
        />
        <span className={v.completato ? "text-success font-semibold" : ""}>Esercizio completato</span>
      </label>

      {aMinuti ? (
        <label className="flex flex-col gap-2">
          <span className="text-base text-accent">Durata effettiva (minuti)</span>
          <input
            className="campo"
            inputMode="numeric"
            value={v.durata}
            disabled={!attivo}
            onChange={(e) => onCambia({ durata: e.target.value })}
          />
        </label>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-base text-accent">Peso utilizzato (kg)</span>
            <input
              className="campo"
              inputMode="decimal"
              value={v.peso}
              disabled={!attivo}
              onChange={(e) => onCambia({ peso: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-base text-accent">Ripetizioni effettive</span>
            <input
              className="campo"
              value={v.ripetizioni}
              disabled={!attivo}
              onChange={(e) => onCambia({ ripetizioni: e.target.value })}
            />
          </label>
        </div>
      )}
    </article>
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
