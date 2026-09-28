import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { CaricamentoCard } from "@/components/Stati";
import { urlMedia } from "@/lib/profilo";
import {
  aggiornaRigaSchedaFn,
  eliminaRigaSchedaFn,
  inserisciRigaSchedaFn,
} from "@/lib/fn";
import {
  GRUPPI_MUSCOLARI,
  caricaEsercizi,
  esercizioCoincide,
  etichettaGruppo,
  type Esercizio,
  type GruppoMuscolare,
} from "@/lib/esercizi";
import {
  caricaEserciziScheda,
  caricaImmagineLibera,
  etichettaMetodo,
  GRUPPI_BLOCCO,
  METODI_SCHEDA,
  metodoScheda,
  nomeRiga,
  numeroOppureNull,
  salvaOrdine,
  testoOppureNull,
  unitaRiga,
  valoriIniziali,
  type MetodoScheda,
  type Scheda,
  type SchedaEsercizio,
} from "@/lib/schede";

function prossimaGiornata(nomi: string[]): string {
  for (const lettera of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const nome = `Giorno ${lettera}`;
    if (!nomi.includes(nome)) return nome;
  }
  return `Giorno ${nomi.length + 1}`;
}

export function CostruttoreScheda({
  scheda,
  onErrore,
}: {
  scheda: Scheda;
  onErrore: (m: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [extra, setExtra] = useState<string[]>([]);
  const [attiva, setAttiva] = useState("Giorno A");
  const [pronta, setPronta] = useState(false);

  const righe = useQuery({
    queryKey: ["scheda-esercizi", scheda.id],
    queryFn: () => caricaEserciziScheda(scheda.id),
  });

  const elenco = righe.data ?? [];
  const dalDb = useMemo(
    () => Array.from(new Set(elenco.map((r) => r.sessione))).filter((s) => s !== ""),
    [elenco],
  );
  const giornate = useMemo(() => Array.from(new Set([...dalDb, ...extra])), [dalDb, extra]);

  useEffect(() => {
    if (!righe.isSuccess || pronta) return;
    const prima = dalDb[0] ?? "Giorno A";
    if (dalDb.length === 0) setExtra(["Giorno A"]);
    setAttiva(prima);
    setPronta(true);
  }, [righe.isSuccess, pronta, dalDb]);

  const dellaGiornata = elenco
    .filter((r) => r.sessione === attiva)
    .sort((a, b) => a.ordine - b.ordine);

  const invalida = () => queryClient.invalidateQueries({ queryKey: ["scheda-esercizi", scheda.id] });

  const aggiungi = useMutation({
    mutationFn: async (esercizio: Esercizio) => {
      const iniziali = valoriIniziali(esercizio);
      const ordine = elenco.reduce((massimo, riga) => Math.max(massimo, riga.ordine), 0) + 1;
      await inserisciRigaSchedaFn({
        data: {
          scheda_id: scheda.id,
          esercizio_id: esercizio.id,
          nome_libero: null,
          descrizione_libera: null,
          immagine_libera_url: null,
          sessione: attiva,
          ordine,
          serie: iniziali.serie,
          ripetizioni: iniziali.ripetizioni,
          durata_minuti: iniziali.durata_minuti,
          recupero_secondi: null,
          carico_indicativo: null,
          note: null,
        },
      });
    },
    onError: (e) => onErrore(e instanceof Error ? e.message : "Aggiunta non riuscita."),
    onSuccess: () => {
      onErrore(null);
      invalida();
    },
  });

  const riordina = useMutation({
    mutationFn: (lista: SchedaEsercizio[]) =>
      salvaOrdine(lista.map((r) => ({ id: r.id, ordine: r.ordine }))),
    onError: (e) => onErrore(e instanceof Error ? e.message : "Riordino non riuscito."),
    onSuccess: () => {
      onErrore(null);
      invalida();
    },
  });

  function sposta(da: number, a: number) {
    if (a < 0 || a >= dellaGiornata.length || da === a) return;
    const copia = [...dellaGiornata];
    const [voce] = copia.splice(da, 1);
    if (!voce) return;
    copia.splice(a, 0, voce);
    riordina.mutate(copia);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg">Giornate</h2>
          <button
            type="button"
            className="inline-flex min-h-12 items-center gap-2 rounded-[12px] border border-border px-3 font-semibold"
            onClick={() => {
              const nome = prossimaGiornata(giornate);
              setExtra((lista) => (lista.includes(nome) ? lista : [...lista, nome]));
              setAttiva(nome);
            }}
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
            Giornata
          </button>
        </div>

        <div className="scorri-chip flex gap-2" role="tablist" aria-label="Giornate della scheda">
          {giornate.map((nome) => {
            const quanti = elenco.filter((r) => r.sessione === nome).length;
            const selezionata = nome === attiva;
            return (
              <button
                key={nome}
                type="button"
                role="tab"
                aria-selected={selezionata}
                className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-base font-semibold ${
                  selezionata ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
                onClick={() => setAttiva(nome)}
              >
                {nome}
                <span className="ml-2 text-sm opacity-80">{quanti}</span>
              </button>
            );
          })}
        </div>

        {righe.isLoading && <CaricamentoCard />}

        {!righe.isLoading && dellaGiornata.length === 0 && (
          <p className="rounded-[14px] border border-dashed border-border px-4 py-6 text-base text-muted-foreground">
            {attiva} è vuota. Scegli un gruppo muscolare e tocca un esercizio: parte con 3 serie da
            8-10. Poi cambi serie e ripetizioni direttamente qui.
          </p>
        )}

        <ol className="flex flex-col gap-3">
          {dellaGiornata.map((riga, indice) => (
            <RigaCompatta
              key={riga.id}
              riga={riga}
              indice={indice}
              puoSu={indice > 0}
              puoGiu={indice < dellaGiornata.length - 1}
              spostamento={riordina.isPending}
              onSposta={sposta}
              onErrore={onErrore}
              onAggiornato={invalida}
            />
          ))}
        </ol>

        <EsercizioManuale
          schedaId={scheda.id}
          sessione={attiva}
          ordine={elenco.reduce((massimo, riga) => Math.max(massimo, riga.ordine), 0) + 1}
          onErrore={onErrore}
          onAggiunto={invalida}
        />

        <a href="#catalogo-scheda" className="btn-primary lg:hidden">
          Scegli dal catalogo
        </a>
      </section>

      <CatalogoScheda
        inAttesa={aggiungi.isPending}
        onAggiungi={(esercizio) => aggiungi.mutate(esercizio)}
      />
    </div>
  );
}

function RigaCompatta({
  riga,
  indice,
  puoSu,
  puoGiu,
  spostamento,
  onSposta,
  onErrore,
  onAggiornato,
}: {
  riga: SchedaEsercizio;
  indice: number;
  puoSu: boolean;
  puoGiu: boolean;
  spostamento: boolean;
  onSposta: (da: number, a: number) => void;
  onErrore: (m: string | null) => void;
  onAggiornato: () => void;
}) {
  const aMinuti = unitaRiga(riga) === "minuti";
  const nome = nomeRiga(riga);
  const foto = urlMedia(riga.esercizi?.immagine_url ?? riga.immagine_libera_url);
  const [serie, setSerie] = useState(riga.serie === null ? "" : String(riga.serie));
  const [ripetizioni, setRipetizioni] = useState(riga.ripetizioni ?? "");
  const [durata, setDurata] = useState(riga.durata_minuti === null ? "" : String(riga.durata_minuti));
  const [recupero, setRecupero] = useState(
    riga.recupero_secondi === null ? "" : String(riga.recupero_secondi),
  );
  const [carico, setCarico] = useState(riga.carico_indicativo ?? "");
  const [note, setNote] = useState(riga.note ?? "");
  const [metodo, setMetodo] = useState<MetodoScheda>(riga.metodo ?? "normale");
  const [gruppo, setGruppo] = useState(riga.gruppo ?? "A");
  const [tempo, setTempo] = useState(riga.tempo ?? "");

  const salva = useMutation({
    mutationFn: async (valori: {
      serie: number | null;
      ripetizioni: string | null;
      durata_minuti: number | null;
      recupero_secondi: number | null;
      carico_indicativo: string | null;
      note: string | null;
      metodo: MetodoScheda;
      gruppo: string | null;
      tempo: string | null;
    }) => {
      await aggiornaRigaSchedaFn({ data: { id: riga.id, ...valori } });
    },
    onError: (e) => onErrore(e instanceof Error ? e.message : "Salvataggio non riuscito."),
    onSuccess: () => {
      onErrore(null);
      onAggiornato();
    },
  });

  const rimuovi = useMutation({
    mutationFn: () => eliminaRigaSchedaFn({ data: { id: riga.id } }),
    onError: (e) => onErrore(e instanceof Error ? e.message : "Rimozione non riuscita."),
    onSuccess: () => {
      onErrore(null);
      onAggiornato();
    },
  });

  function salvaSeDiverso(override?: { metodo?: MetodoScheda; gruppo?: string }) {
    const metodoAttuale = override?.metodo ?? metodo;
    const gruppoAttuale = override?.gruppo ?? gruppo;
    const valori = {
      ...(aMinuti
        ? { serie: null, ripetizioni: null, durata_minuti: numeroOppureNull(durata) }
        : {
            serie: numeroOppureNull(serie),
            ripetizioni: testoOppureNull(ripetizioni),
            durata_minuti: null,
          }),
      recupero_secondi: numeroOppureNull(recupero),
      carico_indicativo: testoOppureNull(carico),
      note: testoOppureNull(note),
      metodo: metodoScheda(metodoAttuale),
      gruppo: metodoAttuale === "normale" ? null : gruppoAttuale,
      tempo: testoOppureNull(tempo),
    };
    const uguale =
      valori.serie === riga.serie &&
      valori.ripetizioni === riga.ripetizioni &&
      valori.durata_minuti === riga.durata_minuti &&
      valori.recupero_secondi === riga.recupero_secondi &&
      valori.carico_indicativo === riga.carico_indicativo &&
      valori.note === riga.note &&
      valori.metodo === (riga.metodo ?? "normale") &&
      valori.gruppo === riga.gruppo &&
      valori.tempo === riga.tempo;
    if (!uguale) salva.mutate(valori);
  }

  return (
    <li className="card-surface flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <Miniatura src={foto} nome={nome} />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{nome}</p>
          <p className="text-sm text-muted-foreground">
            {indice + 1}
            {riga.esercizi?.gruppo_muscolare
              ? ` · ${etichettaGruppo(riga.esercizi.gruppo_muscolare)}`
              : ""}
            {salva.isPending ? " · salvo…" : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-border"
            aria-label={`Sposta ${nome} in su`}
            disabled={!puoSu || spostamento}
            onClick={() => onSposta(indice, indice - 1)}
          >
            <ArrowUp aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-border"
            aria-label={`Sposta ${nome} in giù`}
            disabled={!puoGiu || spostamento}
            onClick={() => onSposta(indice, indice + 1)}
          >
            <ArrowDown aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-destructive text-destructive"
            aria-label={`Rimuovi ${nome}`}
            disabled={rimuovi.isPending}
            onClick={() => rimuovi.mutate()}
          >
            <Trash2 aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>

      {aMinuti ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-accent">Minuti</span>
          <input
            className="field"
            inputMode="numeric"
            value={durata}
            onChange={(e) => setDurata(e.target.value)}
            onBlur={() => salvaSeDiverso()}
          />
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-accent">Serie</span>
            <input
              className="field"
              inputMode="numeric"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              onBlur={() => salvaSeDiverso()}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-accent">Ripetizioni</span>
            <input
              className="field"
              value={ripetizioni}
              placeholder="8-10"
              onChange={(e) => setRipetizioni(e.target.value)}
              onBlur={() => salvaSeDiverso()}
            />
          </label>
        </div>
      )}

      <details className="text-base">
        <summary className="cursor-pointer text-accent">Recupero, carico, superset</summary>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-accent">Metodo</span>
            <select
              className="field"
              value={metodo}
              onChange={(e) => {
                const prossimo = metodoScheda(e.target.value);
                setMetodo(prossimo);
                salvaSeDiverso({ metodo: prossimo });
              }}
            >
              {METODI_SCHEDA.map((voce) => (
                <option key={voce} value={voce}>
                  {etichettaMetodo[voce]}
                </option>
              ))}
            </select>
          </label>
          {metodo !== "normale" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-accent">Stesso gruppo = di seguito</span>
              <select
                className="field"
                value={gruppo}
                onChange={(e) => {
                  setGruppo(e.target.value);
                  salvaSeDiverso({ gruppo: e.target.value });
                }}
              >
                {GRUPPI_BLOCCO.map((lettera) => (
                  <option key={lettera} value={lettera}>
                    Gruppo {lettera}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!aMinuti && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-accent">Tempo, facoltativo</span>
              <input
                className="field"
                value={tempo}
                placeholder="3-0-1-0"
                onChange={(e) => setTempo(e.target.value)}
                onBlur={() => salvaSeDiverso()}
              />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-accent">Recupero (secondi)</span>
              <input
                className="field"
                inputMode="numeric"
                value={recupero}
                onChange={(e) => setRecupero(e.target.value)}
                onBlur={() => salvaSeDiverso()}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-accent">Carico</span>
              <input
                className="field"
                value={carico}
                onChange={(e) => setCarico(e.target.value)}
                onBlur={() => salvaSeDiverso()}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-accent">Note</span>
            <textarea
              className="field min-h-[72px] py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => salvaSeDiverso()}
            />
          </label>
        </div>
      </details>
    </li>
  );
}

function CatalogoScheda({
  inAttesa,
  onAggiungi,
}: {
  inAttesa: boolean;
  onAggiungi: (esercizio: Esercizio) => void;
}) {
  const [gruppo, setGruppo] = useState<GruppoMuscolare>("pettorali");
  const [ricerca, setRicerca] = useState("");
  const [limite, setLimite] = useState(24);

  const catalogo = useQuery({
    queryKey: ["catalogo-esercizi"],
    queryFn: caricaEsercizi,
  });

  const attivi = useMemo(
    () => (catalogo.data ?? []).filter((e) => e.attivo),
    [catalogo.data],
  );

  const conteggi = useMemo(() => {
    const mappa = new Map<string, number>();
    for (const esercizio of attivi) {
      mappa.set(esercizio.gruppo_muscolare, (mappa.get(esercizio.gruppo_muscolare) ?? 0) + 1);
    }
    return mappa;
  }, [attivi]);

  const filtrati = useMemo(() => {
    const testo = ricerca.trim();
    return attivi.filter((e) => {
      if (testo) return esercizioCoincide(e, testo);
      return e.gruppo_muscolare === gruppo;
    });
  }, [attivi, gruppo, ricerca]);

  const visibili = filtrati.slice(0, limite);

  return (
    <aside id="catalogo-scheda" className="card-surface flex max-h-[min(42rem,calc(100vh-6rem))] flex-col gap-3 overflow-hidden p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
      <h2 className="shrink-0 text-lg">Aggiungi esercizio</h2>
      <label className="flex shrink-0 flex-col gap-1 text-sm">
        <span className="text-accent">Cerca nel catalogo</span>
        <input
          className="field"
          value={ricerca}
          placeholder="Nome o attrezzo, es. panca manubri"
          aria-label="Cerca esercizio"
          onChange={(e) => {
            setRicerca(e.target.value);
            setLimite(24);
          }}
        />
      </label>
      {ricerca.trim() && (
        <p className="shrink-0 text-sm text-muted-foreground">
          {filtrati.length} {filtrati.length === 1 ? "risultato" : "risultati"}
        </p>
      )}
      <div className="flex shrink-0 flex-wrap gap-2" aria-label="Gruppi muscolari">
        {GRUPPI_MUSCOLARI.map((voce) => {
          const selezionato = !ricerca && voce === gruppo;
          return (
            <button
              key={voce}
              type="button"
              className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold ${
                selezionato ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
              onClick={() => {
                setGruppo(voce);
                setRicerca("");
                setLimite(24);
              }}
            >
              {etichettaGruppo(voce)}
              <span className="ml-1 opacity-70">{conteggi.get(voce) ?? 0}</span>
            </button>
          );
        })}
      </div>

      {catalogo.isLoading && <CaricamentoCard />}
      {!catalogo.isLoading && visibili.length === 0 && (
        <p className="text-base text-muted-foreground">Nessun esercizio in questo gruppo.</p>
      )}

      <ul className="scorri-y flex min-h-0 flex-1 flex-col gap-2">
        {visibili.map((esercizio) => (
          <li key={esercizio.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-[12px] border border-border p-2 text-left"
              disabled={inAttesa}
              onClick={() => onAggiungi(esercizio)}
            >
              <Miniatura src={urlMedia(esercizio.immagine_url)} nome={esercizio.nome} />
              <span className="min-w-0">
                <span className="block font-semibold">{esercizio.nome}</span>
                <span className="block text-sm text-muted-foreground">
                  {etichettaGruppo(esercizio.gruppo_muscolare)}
                  {esercizio.attrezzatura ? ` · ${esercizio.attrezzatura}` : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {filtrati.length > visibili.length && (
        <button type="button" className="btn-secondary w-full shrink-0" onClick={() => setLimite((n) => n + 24)}>
          Altri {Math.min(24, filtrati.length - visibili.length)} di {filtrati.length}
        </button>
      )}
    </aside>
  );
}

function EsercizioManuale({
  schedaId,
  sessione,
  ordine,
  onErrore,
  onAggiunto,
}: {
  schedaId: string;
  sessione: string;
  ordine: number;
  onErrore: (m: string | null) => void;
  onAggiunto: () => void;
}) {
  const [aperto, setAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [serie, setSerie] = useState("3");
  const [ripetizioni, setRipetizioni] = useState("8-10");
  const [file, setFile] = useState<File | null>(null);

  const crea = useMutation({
    mutationFn: async () => {
      const nomePulito = nome.trim();
      if (!nomePulito) throw new Error("Scrivi il nome dell'esercizio.");
      const percorso = file ? await caricaImmagineLibera(schedaId, file) : null;
      await inserisciRigaSchedaFn({
        data: {
          scheda_id: schedaId,
          esercizio_id: null,
          nome_libero: nomePulito,
          descrizione_libera: null,
          immagine_libera_url: percorso,
          sessione,
          ordine,
          serie: numeroOppureNull(serie),
          ripetizioni: testoOppureNull(ripetizioni),
          durata_minuti: null,
          recupero_secondi: null,
          carico_indicativo: null,
          note: null,
        },
      });
    },
    onError: (e) => onErrore(e instanceof Error ? e.message : "Aggiunta non riuscita."),
    onSuccess: () => {
      onErrore(null);
      setNome("");
      setFile(null);
      setAperto(false);
      onAggiunto();
    },
  });

  if (!aperto) {
    return (
      <button type="button" className="text-left text-base font-semibold text-accent underline" onClick={() => setAperto(true)}>
        L&apos;esercizio non è nel catalogo
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-accent">Nome</span>
        <input className="field" value={nome} onChange={(e) => setNome(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-accent">Serie</span>
          <input className="field" inputMode="numeric" value={serie} onChange={(e) => setSerie(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-accent">Ripetizioni</span>
          <input className="field" value={ripetizioni} onChange={(e) => setRipetizioni(e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-accent">Foto, facoltativa</span>
        <input className="field" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <button type="button" className="btn-primary" disabled={crea.isPending} onClick={() => crea.mutate()}>
        Aggiungi a {sessione}
      </button>
      <button type="button" className="btn-secondary w-full" onClick={() => setAperto(false)}>
        Annulla
      </button>
    </div>
  );
}

function Miniatura({ src, nome }: { src: string | null; nome: string }) {
  const [rotta, setRotta] = useState(false);
  if (!src || rotta) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-white/10 text-xs font-semibold">
        {nome.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="h-14 w-14 shrink-0 rounded-[10px] bg-white object-contain p-1"
      loading="lazy"
      onError={() => setRotta(true)}
    />
  );
}
