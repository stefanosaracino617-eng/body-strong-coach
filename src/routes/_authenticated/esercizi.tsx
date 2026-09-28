import { createFileRoute, Link } from "@tanstack/react-router";
import { BloccoErrore, CaricamentoCard, StatoVuoto } from "@/components/Stati";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { caricaSessioneApp, urlMedia } from "@/lib/profilo";
import {
  GRUPPI_MUSCOLARI,
  caricaEsercizi,
  caricaImmagini,
  esercizioCoincide,
  etichettaGruppo,
  etichettaUnita,
  importaEsercizi,
  leggiFileCatalogo,
  MESSAGGIO_FORMATO_NON_SUPPORTATO,
  salvaEsercizio,
  impostaAttivoEsercizio,
  type EsitoLettura,
  type RigaImportata,
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
  const [quanti, setQuanti] = useState(24);
  const [modifica, setModifica] = useState<string | null>(null);
  const [nuovo, setNuovo] = useState(false);
  const [modulo, setModulo] = useState<Modulo>(vuoto);
  const [anteprima, setAnteprima] = useState<string[] | null>(null);
  const [daImportare, setDaImportare] = useState<(EsitoLettura & { nomeFile: string }) | null>(
    null,
  );

  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const gestore = sessione.data?.isGestore === true;

  const elenco = useQuery({
    queryKey: ["catalogo-esercizi"],
    enabled: gestore,
    queryFn: caricaEsercizi,
  });

  const esercizi = useMemo(() => elenco.data ?? [], [elenco.data]);

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
        await salvaEsercizio({ id: modifica, ...valori });
      } else {
        await salvaEsercizio(valori);
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
      await impostaAttivoEsercizio(e.id, !e.attivo);
    },
    onError: (e) => setErrore(e instanceof Error ? e.message : "Operazione non riuscita."),
    onSuccess: () => {
      setErrore(null);
      invalida();
    },
  });

  const leggi = useMutation({
    mutationFn: async (file: File) => {
      const esito = await leggiFileCatalogo(file);
      return { ...esito, nomeFile: file.name };
    },
    onError: (e) => {
      setDaImportare(null);
      setErrore(e instanceof Error ? e.message : "Lettura del file non riuscita.");
    },
    onSuccess: (esito) => {
      setErrore(null);
      setAvviso(null);
      setDaImportare(esito);
    },
  });

  const importa = useMutation({
    mutationFn: async (righe: RigaImportata[]) => importaEsercizi(righe),
    onError: (e) => setErrore(e instanceof Error ? e.message : "Importazione non riuscita."),
    onSuccess: (salvate) => {
      setErrore(null);
      const errori = daImportare?.errori ?? [];
      setAvviso(`Importati ${salvate} esercizi.`);
      setAnteprima(errori.length > 0 ? errori : null);
      setDaImportare(null);
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
    },
  });

  const filtrati = useMemo(() => {
    const testo = ricerca.trim();
    return esercizi.filter(
      (e) => esercizioCoincide(e, testo) && (!testo && filtro ? e.gruppo_muscolare === filtro : true),
    );
  }, [esercizi, ricerca, filtro]);
  const conteggi = useMemo(() => {
    const mappa = new Map<string, number>();
    for (const esercizio of esercizi) {
      mappa.set(esercizio.gruppo_muscolare, (mappa.get(esercizio.gruppo_muscolare) ?? 0) + 1);
    }
    return mappa;
  }, [esercizi]);

  const visibili = filtrati.slice(0, quanti);

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
      <label className="sticky top-0 z-10 flex flex-col gap-2 bg-background py-2 text-base">
        <span className="text-accent">Cerca nel catalogo</span>
        <input
          className="field"
          value={ricerca}
          onChange={(e) => {
            setRicerca(e.target.value);
            setFiltro("");
            setQuanti(24);
          }}
          placeholder="Nome, attrezzo o muscolo. Es. panca, manubri, squat"
          aria-label="Cerca un esercizio"
        />
        {ricerca.trim() && (
          <span className="text-sm text-muted-foreground">
            {filtrati.length} {filtrati.length === 1 ? "risultato" : "risultati"} in tutto il catalogo
          </span>
        )}
      </label>
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

      <details className="card-surface">
        <summary className="cursor-pointer px-6 py-4 text-lg font-semibold">
          Importa catalogo o immagini
        </summary>
        <div className="flex flex-col gap-6 px-6 pb-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg">Importa il catalogo</h2>
        <p className="text-base text-muted-foreground">
          Solo file CSV, con le colonne: numero, nome, gruppo_muscolare, attrezzatura, tipo,
          unita_misura, descrizione_esecuzione, errori_comuni, attivo. Gli esercizi con lo stesso
          numero vengono aggiornati.
        </p>
        <input
          className="field"
          type="file"
          accept=".csv,text/csv"
          aria-label="File del catalogo esercizi"
          disabled={leggi.isPending || importa.isPending}
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            ev.target.value = "";
            if (!f) return;
            const nome = f.name.toLowerCase();
            if (nome.endsWith(".xlsx") || nome.endsWith(".xls")) {
              setDaImportare(null);
              setAvviso(null);
              setErrore(MESSAGGIO_FORMATO_NON_SUPPORTATO);
              return;
            }
            leggi.mutate(f);
          }}
        />
        {leggi.isPending && <p className="text-base text-muted-foreground">Lettura in corso…</p>}
        {importa.isPending && <p className="text-base text-muted-foreground">Importazione in corso…</p>}

        {daImportare && (
          <div className="flex flex-col gap-3 rounded-[10px] border border-[#00A8E8] p-4">
            <h3 className="text-base text-accent">Anteprima di {daImportare.nomeFile}</h3>
            <p className="text-base text-muted-foreground">
              Righe lette correttamente: {daImportare.righe.length}
              {daImportare.errori.length > 0 ? ` · righe con problemi: ${daImportare.errori.length}` : ""}
            </p>
            {daImportare.righe.slice(0, 3).map((r) => (
              <p key={r.ordine} className="text-base text-muted-foreground">
                {String(r.ordine).padStart(3, "0")} · {r.nome} · {r.gruppo_muscolare}
                {r.unita_misura ? ` · ${etichettaUnita[r.unita_misura]}` : ""}
              </p>
            ))}
            {daImportare.errori.slice(0, 5).map((m) => (
              <p key={m} className="text-base text-warning">
                {m}
              </p>
            ))}
            <button
              type="button"
              className="btn-primary"
              disabled={importa.isPending || daImportare.righe.length === 0}
              onClick={() => importa.mutate(daImportare.righe)}
            >
              Conferma importazione
            </button>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => setDaImportare(null)}
            >
              Annulla
            </button>
          </div>
        )}
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
        </div>
      </details>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Gruppi muscolari">
          <button
            type="button"
            className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold ${
              filtro === "" ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}
            onClick={() => {
              setFiltro("");
              setRicerca("");
              setQuanti(24);
            }}
          >
            Tutti
          </button>
          {GRUPPI_MUSCOLARI.map((g) => (
            <button
              key={g}
              type="button"
              className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold ${
                filtro === g ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
              onClick={() => {
                setFiltro(g);
                setRicerca("");
                setQuanti(24);
              }}
            >
              {etichettaGruppo(g)}
              <span className="ml-1 opacity-70">{conteggi.get(g) ?? 0}</span>
            </button>
          ))}
        </div>
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
      <p className="text-sm text-muted-foreground">
        Il catalogo di base arriva da wger, con licenza Creative Commons. Nome in italiano quando
        c&apos;è, altrimenti in inglese, come si usa in sala.
      </p>

      {!elenco.isLoading && filtrati.length === 0 && (
        <p className="text-base text-muted-foreground">Nessun esercizio trovato.</p>
      )}

      {!elenco.isLoading && !ricerca && !filtro &&
        GRUPPI_MUSCOLARI.map((gruppo) => {
          const delGruppo = esercizi.filter((e) => e.gruppo_muscolare === gruppo);
          if (delGruppo.length === 0) return null;
          return (
            <section key={gruppo} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg">{etichettaGruppo(gruppo)}</h2>
                <button
                  type="button"
                  className="text-base font-semibold text-accent underline"
                  onClick={() => {
                    setFiltro(gruppo);
                    setRicerca("");
                    setQuanti(24);
                  }}
                >
                  Vedi tutti ({delGruppo.length})
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {delGruppo.slice(0, 8).map((e) => (
                  <CartaEsercizio
                    key={e.id}
                    esercizio={e}
                    statoInCorso={cambiaStato.isPending}
                    onModifica={() => apriModifica(e)}
                    onStato={() => cambiaStato.mutate(e)}
                  />
                ))}
              </div>
            </section>
          );
        })}

      {!elenco.isLoading && (ricerca || filtro) && (
        <>
          <p className="text-base text-muted-foreground">
            {filtrati.length} {filtrati.length === 1 ? "esercizio" : "esercizi"}
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {visibili.map((e) => (
              <CartaEsercizio
                key={e.id}
                esercizio={e}
                statoInCorso={cambiaStato.isPending}
                onModifica={() => apriModifica(e)}
                onStato={() => cambiaStato.mutate(e)}
              />
            ))}
          </div>
          {filtrati.length > visibili.length && (
            <button type="button" className="btn-secondary w-full" onClick={() => setQuanti((n) => n + 24)}>
              Mostra altri
            </button>
          )}
        </>
      )}

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

function CartaEsercizio({
  esercizio,
  statoInCorso,
  onModifica,
  onStato,
}: {
  esercizio: Esercizio;
  statoInCorso: boolean;
  onModifica: () => void;
  onStato: () => void;
}) {
  const foto = urlMedia(esercizio.immagine_url);
  const [rotta, setRotta] = useState(false);
  return (
    <article className="card-surface flex flex-col gap-2 p-3">
      <div className="flex h-32 items-center justify-center rounded-[10px] bg-white">
        {foto && !rotta ? (
          <img
            src={foto}
            alt=""
            className="max-h-28 w-full object-contain"
            loading="lazy"
            onError={() => setRotta(true)}
          />
        ) : (
          <span className="px-2 text-center text-sm text-[#003459]">Senza foto</span>
        )}
      </div>
      <h3 className="text-base font-semibold leading-snug">{esercizio.nome}</h3>
      <p className="text-sm text-muted-foreground">
        {etichettaGruppo(esercizio.gruppo_muscolare)}
        {esercizio.attrezzatura ? ` · ${esercizio.attrezzatura}` : ""}
      </p>
      {(esercizio.descrizione_esecuzione || esercizio.video_url) && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer text-accent">Dettagli</summary>
          {esercizio.descrizione_esecuzione && <p className="mt-2">{esercizio.descrizione_esecuzione}</p>}
          {esercizio.video_url && (
            <a href={esercizio.video_url} target="_blank" rel="noreferrer" className="mt-2 block font-semibold text-accent underline">
              Guarda il video
            </a>
          )}
          {(esercizio.autore || esercizio.licenza) && (
            <p className="mt-2">
              Fonte: {[esercizio.autore, esercizio.licenza, "wger.de"].filter(Boolean).join(" · ")}
            </p>
          )}
        </details>
      )}
      <p className={`text-sm ${esercizio.attivo ? "text-success" : "text-warning"}`}>
        {esercizio.attivo ? "Attivo" : "Non attivo"} · {etichettaUnita[esercizio.unita_misura]}
      </p>
      <button type="button" className="btn-secondary w-full" onClick={onModifica}>
        Modifica
      </button>
      <button type="button" className="text-sm font-semibold text-accent underline" disabled={statoInCorso} onClick={onStato}>
        {esercizio.attivo ? "Disattiva" : "Riattiva"}
      </button>
    </article>
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
