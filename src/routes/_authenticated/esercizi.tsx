import { createFileRoute, Link } from "@tanstack/react-router";
import { BloccoErrore, CaricamentoCard, StatoVuoto } from "@/components/Stati";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { caricaSessioneApp } from "@/lib/profilo";
import {
  GRUPPI_MUSCOLARI,
  caricaEsercizi,
  caricaImmagini,
  etichettaUnita,
  importaEsercizi,
  leggiFileCatalogo,
  urlImmagini,
  type Esercizio,
  type GruppoMuscolare,
  type TipoEsercizio,
  type UnitaMisura,
} from "@/lib/esercizi";

export const Route = createFileRoute("/_authenticated/esercizi")({
  head: () => ({
    meta: [
      { title: "Catalogo esercizi | Body Strong Fitness Club" },
      {
        name: "description",
        content:
          "Gestisci il catalogo degli esercizi: ricerca, filtri per gruppo muscolare, importazione e immagini.",
      },
      { property: "og:title", content: "Catalogo esercizi | Body Strong Fitness Club" },
      {
        property: "og:description",
        content:
          "Gestisci il catalogo degli esercizi: ricerca, filtri per gruppo muscolare, importazione e immagini.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaEsercizi,
});

type Modulo = {
  nome: string;
  gruppo_muscolare: GruppoMuscolare;
  attrezzatura: string;
  tipo: TipoEsercizio;
  unita_misura: UnitaMisura;
  descrizione_esecuzione: string;
  errori_comuni: string;
  attivo: boolean;
  ordine: string;
};

const vuoto: Modulo = {
  nome: "",
  gruppo_muscolare: "pettorali",
  attrezzatura: "",
  tipo: "forza",
  unita_misura: "serie_ripetizioni",
  descrizione_esecuzione: "",
  errori_comuni: "",
  attivo: true,
  ordine: "",
};

function PaginaEsercizi() {
  const queryClient = useQueryClient();
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState("");
  const [filtro, setFiltro] = useState<"" | GruppoMuscolare>("");
  const [modifica, setModifica] = useState<string | null>(null);
  const [nuovo, setNuovo] = useState(false);
  const [modulo, setModulo] = useState<Modulo>(vuoto);
  const [anteprima, setAnteprima] = useState<string[] | null>(null);

  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const gestore = sessione.data?.isGestore === true;

  const elenco = useQuery({
    queryKey: ["catalogo-esercizi"],
    enabled: gestore,
    queryFn: caricaEsercizi,
  });

  const esercizi = useMemo(() => elenco.data ?? [], [elenco.data]);

  const immagini = useQuery({
    queryKey: ["immagini-esercizi", esercizi.map((e) => e.immagine_url).join("|")],
    enabled: gestore && esercizi.length > 0,
    queryFn: () => urlImmagini(esercizi.map((e) => e.immagine_url ?? "")),
  });

  const invalida = () => queryClient.invalidateQueries({ queryKey: ["catalogo-esercizi"] });

  const salva = useMutation({
    mutationFn: async () => {
      const valori = {
        nome: modulo.nome.trim(),
        gruppo_muscolare: modulo.gruppo_muscolare,
        attrezzatura: modulo.attrezzatura.trim() || null,
        tipo: modulo.tipo,
        unita_misura: modulo.unita_misura,
        descrizione_esecuzione: modulo.descrizione_esecuzione.trim() || null,
        errori_comuni: modulo.errori_comuni.trim() || null,
        attivo: modulo.attivo,
        ordine: Number(modulo.ordine),
      };
      if (!valori.nome) throw new Error("Il nome è obbligatorio.");
      if (!Number.isFinite(valori.ordine) || valori.ordine <= 0)
        throw new Error("Il numero dell'esercizio è obbligatorio.");
      if (modifica) {
        const { error } = await supabase.from("esercizi").update(valori).eq("id", modifica);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("esercizi").insert(valori);
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

  const cambiaStato = useMutation({
    mutationFn: async (e: Esercizio) => {
      const { error } = await supabase
        .from("esercizi")
        .update({ attivo: !e.attivo })
        .eq("id", e.id);
      if (error) throw error;
    },
    onError: (e) => setErrore(e instanceof Error ? e.message : "Operazione non riuscita."),
    onSuccess: () => {
      setErrore(null);
      invalida();
    },
  });

  const importa = useMutation({
    mutationFn: async (file: File) => {
      const { righe, errori } = await leggiFileCatalogo(file);
      const salvate = await importaEsercizi(righe);
      return { salvate, errori };
    },
    onError: (e) => setErrore(e instanceof Error ? e.message : "Importazione non riuscita."),
    onSuccess: ({ salvate, errori }) => {
      setErrore(null);
      setAvviso(`Importati ${salvate} esercizi.`);
      setAnteprima(errori.length > 0 ? errori : null);
      invalida();
    },
  });

  const immaginiUpload = useMutation({
    mutationFn: async (file: File[]) => caricaImmagini(file, esercizi),
    onError: (e) => setErrore(e instanceof Error ? e.message : "Caricamento non riuscito."),
    onSuccess: (esito) => {
      setErrore(null);
      setAvviso(`Immagini abbinate: ${esito.abbinate}.`);
      const problemi = [
        ...esito.nonAbbinate.map((n) => `Nessun esercizio con quel numero: ${n}`),
        ...esito.errori,
      ];
      setAnteprima(problemi.length > 0 ? problemi : null);
      queryClient.invalidateQueries({ queryKey: ["catalogo-esercizi"] });
      queryClient.invalidateQueries({ queryKey: ["immagini-esercizi"] });
    },
  });

  const filtrati = useMemo(() => {
    const testo = ricerca.trim().toLowerCase();
    return esercizi.filter(
      (e) =>
        (!testo || e.nome.toLowerCase().includes(testo)) &&
        (!filtro || e.gruppo_muscolare === filtro),
    );
  }, [esercizi, ricerca, filtro]);

  if (sessione.isLoading) return <Pagina titolo="Caricamento"><CaricamentoCard /></Pagina>;

  if (!gestore) {
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

  function apriModifica(e: Esercizio) {
    setErrore(null);
    setNuovo(false);
    setModifica(e.id);
    setModulo({
      nome: e.nome,
      gruppo_muscolare: e.gruppo_muscolare,
      attrezzatura: e.attrezzatura ?? "",
      tipo: e.tipo,
      unita_misura: e.unita_misura,
      descrizione_esecuzione: e.descrizione_esecuzione ?? "",
      errori_comuni: e.errori_comuni ?? "",
      attivo: e.attivo,
      ordine: String(e.ordine),
    });
  }

  return (
    <Pagina titolo="Catalogo esercizi">
      {errore && (
        <p className="rounded-[10px] border border-destructive px-3 py-3 text-base text-destructive">
          {errore}
        </p>
      )}
      {avviso && (
        <p className="rounded-[10px] border border-[#2FBF71] px-3 py-3 text-base text-success">
          {avviso}
        </p>
      )}
      {anteprima && (
        <div className="card-surface flex flex-col gap-2 p-6">
          <h2 className="text-lg">Righe o file non importati</h2>
          {anteprima.slice(0, 30).map((m) => (
            <p key={m} className="text-base text-warning">
              {m}
            </p>
          ))}
          <button type="button" className="btn-secondary w-full" onClick={() => setAnteprima(null)}>
            Chiudi
          </button>
        </div>
      )}

      <div className="card-surface flex flex-col gap-4 p-6">
        <h2 className="text-lg">Importa il catalogo</h2>
        <p className="text-base text-muted-foreground">
          File CSV o Excel con le colonne: numero, nome, gruppo_muscolare, attrezzatura, tipo,
          unita_misura, descrizione_esecuzione, errori_comuni, attivo. Gli esercizi con lo stesso
          numero vengono aggiornati.
        </p>
        <input
          className="field"
          type="file"
          accept=".csv,.xlsx,.xls"
          aria-label="File del catalogo esercizi"
          disabled={importa.isPending}
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) importa.mutate(f);
            ev.target.value = "";
          }}
        />
        {importa.isPending && <p className="text-base text-muted-foreground">Importazione in corso…</p>}
      </div>

      <div className="card-surface flex flex-col gap-4 p-6">
        <h2 className="text-lg">Carica le immagini</h2>
        <p className="text-base text-muted-foreground">
          Seleziona più file insieme. Il numero iniziale del nome file (esempio
          006_spinte-panca-piana-bilanciere.png) abbina l&apos;immagine all&apos;esercizio numero 6.
        </p>
        <input
          className="field"
          type="file"
          accept="image/*"
          multiple
          aria-label="Immagini degli esercizi"
          disabled={immaginiUpload.isPending}
          onChange={(ev) => {
            const f = Array.from(ev.target.files ?? []);
            if (f.length > 0) immaginiUpload.mutate(f);
            ev.target.value = "";
          }}
        />
        {immaginiUpload.isPending && (
          <p className="text-base text-muted-foreground">Caricamento in corso…</p>
        )}
      </div>

      <div className="card-surface flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-2 text-base">
          <span className="text-accent">Cerca per nome</span>
          <input
            className="field"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Es. panca piana"
          />
        </label>
        <label className="flex flex-col gap-2 text-base">
          <span className="text-accent">Gruppo muscolare</span>
          <select
            className="field"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as "" | GruppoMuscolare)}
          >
            <option value="">Tutti i gruppi</option>
            {GRUPPI_MUSCOLARI.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      {nuovo || modifica ? (
        <div className="card-surface flex flex-col gap-4 p-6">
          <h2 className="text-lg">{modifica ? "Modifica esercizio" : "Nuovo esercizio"}</h2>
          <ModuloEsercizio modulo={modulo} onChange={setModulo} />
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
            const massimo = esercizi.reduce((m, e) => Math.max(m, e.ordine), 0);
            setModulo({ ...vuoto, ordine: String(massimo + 1) });
            setNuovo(true);
          }}
        >
          Aggiungi esercizio
        </button>
      )}

      {elenco.isLoading && <CaricamentoCard />}
      {elenco.isError && <BloccoErrore onRiprova={() => elenco.refetch()} />}
      {!elenco.isLoading && filtrati.length === 0 && (
        <p className="text-base text-muted-foreground">Nessun esercizio trovato.</p>
      )}

      {filtrati.map((e) => (
        <article key={e.id} className="card-surface flex flex-col gap-2 p-6">
          {e.immagine_url && immagini.data?.[e.immagine_url] && (
            <div className="immagine-esercizio">
              <img
                src={immagini.data[e.immagine_url]}
                alt={`Esecuzione dell'esercizio ${e.nome}`}
                loading="lazy"
              />
            </div>
          )}
          <h2 className="text-lg">
            {String(e.ordine).padStart(3, "0")} · {e.nome}
          </h2>
          <p className="text-base text-muted-foreground">
            <span className="text-accent">{e.gruppo_muscolare}</span>
            {e.attrezzatura ? ` · ${e.attrezzatura}` : ""} · {etichettaUnita[e.unita_misura]}
          </p>
          {e.descrizione_esecuzione && (
            <p className="text-base text-muted-foreground">{e.descrizione_esecuzione}</p>
          )}
          {e.errori_comuni && (
            <p className="text-base text-warning">Errori comuni: {e.errori_comuni}</p>
          )}
          <p className={`text-base ${e.attivo ? "text-success" : "text-warning"}`}>
            {e.attivo ? "Attivo" : "Non attivo"}
          </p>
          <div className="mt-2 flex flex-col gap-3">
            <button type="button" className="btn-primary" onClick={() => apriModifica(e)}>
              Modifica
            </button>
            <button
              type="button"
              className="btn-secondary w-full"
              disabled={cambiaStato.isPending}
              onClick={() => cambiaStato.mutate(e)}
            >
              {e.attivo ? "Disattiva" : "Riattiva"}
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

function ModuloEsercizio({
  modulo,
  onChange,
}: {
  modulo: Modulo;
  onChange: (m: Modulo) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Numero *</span>
        <input
          className="field"
          inputMode="numeric"
          value={modulo.ordine}
          onChange={(e) => onChange({ ...modulo, ordine: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Nome *</span>
        <input
          className="field"
          value={modulo.nome}
          onChange={(e) => onChange({ ...modulo, nome: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Gruppo muscolare</span>
        <select
          className="field"
          value={modulo.gruppo_muscolare}
          onChange={(e) =>
            onChange({ ...modulo, gruppo_muscolare: e.target.value as GruppoMuscolare })
          }
        >
          {GRUPPI_MUSCOLARI.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Attrezzatura</span>
        <input
          className="field"
          value={modulo.attrezzatura}
          onChange={(e) => onChange({ ...modulo, attrezzatura: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Tipo</span>
        <select
          className="field"
          value={modulo.tipo}
          onChange={(e) => {
            const tipo = e.target.value as TipoEsercizio;
            onChange({
              ...modulo,
              tipo,
              unita_misura: tipo === "cardio" ? "minuti" : "serie_ripetizioni",
            });
          }}
        >
          <option value="forza">Forza</option>
          <option value="cardio">Cardio</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Unità di misura</span>
        <select
          className="field"
          value={modulo.unita_misura}
          onChange={(e) => onChange({ ...modulo, unita_misura: e.target.value as UnitaMisura })}
        >
          <option value="serie_ripetizioni">Serie e ripetizioni</option>
          <option value="minuti">Minuti</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Descrizione esecuzione</span>
        <textarea
          className="field min-h-[120px]"
          value={modulo.descrizione_esecuzione}
          onChange={(e) => onChange({ ...modulo, descrizione_esecuzione: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Errori comuni</span>
        <textarea
          className="field min-h-[120px]"
          value={modulo.errori_comuni}
          onChange={(e) => onChange({ ...modulo, errori_comuni: e.target.value })}
        />
      </label>
      <label className="flex min-h-[48px] items-center gap-3 text-base">
        <input
          type="checkbox"
          className="h-6 w-6"
          checked={modulo.attivo}
          onChange={(e) => onChange({ ...modulo, attivo: e.target.checked })}
        />
        <span>Attivo (utilizzabile nelle schede)</span>
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
