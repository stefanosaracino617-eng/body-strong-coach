import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { caricaSessioneApp, type Profilo } from "@/lib/profilo";
import { CampoData } from "@/components/CampoData";
import { GRUPPI_MUSCOLARI, caricaEsercizi, type GruppoMuscolare } from "@/lib/esercizi";
import {
  caricaEserciziScheda,
  caricaImmagineLibera,
  caricaSchedaAttiva,
  caricaSchedeCliente,
  duplicaScheda,
  nomeRiga,
  numeroOppureNull,
  salvaOrdine,
  testoOppureNull,
  unitaRiga,
  valoriIniziali,
  type Scheda,
  type SchedaEsercizio,
} from "@/lib/schede";

export const Route = createFileRoute("/_authenticated/scheda")({
  validateSearch: (search: Record<string, unknown>) => ({
    cliente: typeof search["cliente"] === "string" ? (search["cliente"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Editor scheda | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Crea e modifica la scheda di allenamento del cliente con sessioni ed esercizi.",
      },
      { property: "og:title", content: "Editor scheda | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Crea e modifica la scheda di allenamento del cliente con sessioni ed esercizi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaScheda,
});

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

function PaginaScheda() {
  const { cliente } = Route.useSearch();
  const queryClient = useQueryClient();
  const [errore, setErrore] = useState<string | null>(null);

  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const gestore = sessione.data?.isGestore === true;

  const profilo = useQuery({
    queryKey: ["profilo-cliente", cliente],
    enabled: gestore && cliente !== "",
    queryFn: async () => {
      const { data, error } = await supabase.from("profili").select("*").eq("id", cliente).maybeSingle();
      if (error) throw error;
      return data as Profilo | null;
    },
  });

  const scheda = useQuery({
    queryKey: ["scheda-attiva", cliente],
    enabled: gestore && cliente !== "",
    queryFn: () => caricaSchedaAttiva(cliente),
  });

  if (sessione.isLoading) return <Pagina titolo="Caricamento…" />;

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

  if (!cliente) {
    return (
      <Pagina titolo="Scheda">
        <p className="text-base text-muted-foreground">Scegli un cliente dall&apos;elenco.</p>
        <Link to="/clienti" className="btn-primary">
          Vai ai clienti
        </Link>
      </Pagina>
    );
  }

  const nomeCliente = profilo.data ? `${profilo.data.nome} ${profilo.data.cognome}` : "Cliente";

  return (
    <Pagina titolo={`Scheda di ${nomeCliente}`}>
      {errore && (
        <p className="rounded-[10px] border border-destructive px-3 py-3 text-base text-destructive">
          {errore}
        </p>
      )}

      {scheda.isLoading && <p className="text-base text-muted-foreground">Caricamento…</p>}

      {!scheda.isLoading && !scheda.data && (
        <DatiScheda
          clienteId={cliente}
          scheda={null}
          onErrore={setErrore}
          onFatto={() => queryClient.invalidateQueries({ queryKey: ["scheda-attiva", cliente] })}
        />
      )}

      {scheda.data && (
        <>
          <DatiScheda
            clienteId={cliente}
            scheda={scheda.data}
            onErrore={setErrore}
            onFatto={() => queryClient.invalidateQueries({ queryKey: ["scheda-attiva", cliente] })}
          />
          <Sessioni scheda={scheda.data} onErrore={setErrore} />
        </>
      )}

      <Link to="/clienti" className="btn-secondary w-full">
        Torna ai clienti
      </Link>
    </Pagina>
  );
}

function DatiScheda({
  clienteId,
  scheda,
  onErrore,
  onFatto,
}: {
  clienteId: string;
  scheda: Scheda | null;
  onErrore: (m: string | null) => void;
  onFatto: () => void;
}) {
  const [titolo, setTitolo] = useState(scheda?.titolo ?? "");
  const [inizio, setInizio] = useState(scheda?.data_inizio ?? "");
  const [scadenza, setScadenza] = useState(scheda?.data_scadenza ?? "");
  const [note, setNote] = useState(scheda?.note_gestore ?? "");

  const salva = useMutation({
    mutationFn: async () => {
      if (!scadenza) throw new Error("La data di scadenza è obbligatoria.");
      const valori = {
        titolo: titolo.trim() || "Scheda di allenamento",
        data_inizio: inizio || new Date().toISOString().slice(0, 10),
        data_scadenza: scadenza,
        note_gestore: testoOppureNull(note),
      };
      if (scheda) {
        const { error } = await supabase.from("schede").update(valori).eq("id", scheda.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("schede")
          .insert({ ...valori, cliente_id: clienteId, stato: "attiva" as const });
        if (error) throw error;
      }
    },
    onError: (e) => onErrore(e instanceof Error ? e.message : "Salvataggio non riuscito."),
    onSuccess: () => {
      onErrore(null);
      onFatto();
    },
  });

  return (
    <section className="card-surface flex flex-col gap-4 p-6">
      <h2 className="text-lg">{scheda ? "Dati della scheda" : "Nuova scheda"}</h2>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Titolo</span>
        <input
          className="field"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          placeholder="Es. Scheda ottobre"
        />
      </label>
      <CampoData label="Data di inizio" value={inizio} onChange={setInizio} />
      <CampoData label="Data di scadenza" value={scadenza} onChange={setScadenza} required />
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Note del gestore</span>
        <textarea
          className="field min-h-[96px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="btn-primary"
        disabled={salva.isPending}
        onClick={() => salva.mutate()}
      >
        {scheda ? "Salva dati scheda" : "Crea scheda"}
      </button>
    </section>
  );
}

function Sessioni({ scheda, onErrore }: { scheda: Scheda; onErrore: (m: string | null) => void }) {
  const queryClient = useQueryClient();
  const [nuovaSessione, setNuovaSessione] = useState("");
  const [aggiunte, setAggiunte] = useState<string[]>([]);

  const righe = useQuery({
    queryKey: ["scheda-esercizi", scheda.id],
    queryFn: () => caricaEserciziScheda(scheda.id),
  });

  const elenco = righe.data ?? [];

  const sessioni = useMemo(() => {
    const daDb = elenco.map((r) => r.sessione);
    return Array.from(new Set([...daDb, ...aggiunte])).filter((s) => s !== "");
  }, [elenco, aggiunte]);

  const invalida = () => queryClient.invalidateQueries({ queryKey: ["scheda-esercizi", scheda.id] });

  return (
    <section className="flex flex-col gap-6">
      <div className="card-surface flex flex-col gap-4 p-6">
        <h2 className="text-lg">Sessioni</h2>
        <p className="text-base text-muted-foreground">
          Dai un&apos;etichetta libera a ogni sessione, ad esempio «Giorno A - Petto e tricipiti»
          oppure «Parte A».
        </p>
        <label className="flex flex-col gap-2 text-base">
          <span className="text-accent">Etichetta della sessione</span>
          <input
            className="field"
            value={nuovaSessione}
            onChange={(e) => setNuovaSessione(e.target.value)}
            placeholder="Es. Giorno A - Petto e tricipiti"
          />
        </label>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            const etichetta = nuovaSessione.trim();
            if (!etichetta) return;
            setAggiunte((a) => (a.includes(etichetta) ? a : [...a, etichetta]));
            setNuovaSessione("");
          }}
        >
          Aggiungi sessione
        </button>
      </div>

      {righe.isLoading && <p className="text-base text-muted-foreground">Caricamento…</p>}

      {sessioni.length === 0 && !righe.isLoading && (
        <p className="text-base text-muted-foreground">Nessuna sessione: aggiungine una.</p>
      )}

      {sessioni.map((s) => (
        <SessioneScheda
          key={s}
          schedaId={scheda.id}
          etichetta={s}
          righe={elenco.filter((r) => r.sessione === s)}
          totaleRighe={elenco.length}
          onErrore={onErrore}
          onAggiornato={invalida}
        />
      ))}
    </section>
  );
}

function SessioneScheda({
  schedaId,
  etichetta,
  righe,
  totaleRighe,
  onErrore,
  onAggiornato,
}: {
  schedaId: string;
  etichetta: string;
  righe: SchedaEsercizio[];
  totaleRighe: number;
  onErrore: (m: string | null) => void;
  onAggiornato: () => void;
}) {
  const [aperta, setAperta] = useState(false);
  const [apriCatalogo, setApriCatalogo] = useState(false);
  const [apriLibero, setApriLibero] = useState(false);
  const [ricerca, setRicerca] = useState("");
  const [filtro, setFiltro] = useState<"" | GruppoMuscolare>("");
  const [trascinato, setTrascinato] = useState<number | null>(null);
  const [ordinate, setOrdinate] = useState<SchedaEsercizio[]>(righe);

  const chiaveRighe = righe.map((r) => r.id).join("|");
  useEffect(() => {
    setOrdinate(righe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiaveRighe]);

  const catalogo = useQuery({
    queryKey: ["catalogo-esercizi"],
    enabled: apriCatalogo,
    queryFn: caricaEsercizi,
  });

  const disponibili = useMemo(() => {
    const testo = ricerca.trim().toLowerCase();
    return (catalogo.data ?? [])
      .filter((e) => e.attivo)
      .filter(
        (e) =>
          (!testo || e.nome.toLowerCase().includes(testo)) &&
          (!filtro || e.gruppo_muscolare === filtro),
      )
      .slice(0, 40);
  }, [catalogo.data, ricerca, filtro]);

  const aggiungi = useMutation({
    mutationFn: async (esercizioId: string) => {
      const e = (catalogo.data ?? []).find((x) => x.id === esercizioId);
      if (!e) throw new Error("Esercizio non trovato.");
      const { error } = await supabase.from("scheda_esercizi").insert({
        scheda_id: schedaId,
        esercizio_id: e.id,
        sessione: etichetta,
        ordine: totaleRighe + 1,
        ...valoriIniziali(e),
      });
      if (error) throw error;
    },
    onError: (e) => onErrore(e instanceof Error ? e.message : "Aggiunta non riuscita."),
    onSuccess: () => {
      onErrore(null);
      onAggiornato();
    },
  });

  const riordina = useMutation({
    mutationFn: (elenco: SchedaEsercizio[]) => salvaOrdine(elenco.map((r) => r.id)),
    onError: (e) => onErrore(e instanceof Error ? e.message : "Riordino non riuscito."),
    onSuccess: () => {
      onErrore(null);
      onAggiornato();
    },
  });

  const spostaA = (da: number, a: number) => {
    if (a < 0 || a >= ordinate.length || da === a) return;
    const copia = [...ordinate];
    const [voce] = copia.splice(da, 1);
    if (!voce) return;
    copia.splice(a, 0, voce);
    setOrdinate(copia);
    riordina.mutate(copia);
  };

  return (
    <article className="card-surface overflow-hidden">
      <button
        type="button"
        className="flex min-h-16 w-full items-center justify-between gap-4 p-5 text-left"
        aria-expanded={aperta}
        onClick={() => setAperta((valore) => !valore)}
      >
        <span>
          <span className="block font-display text-lg font-bold">{etichetta}</span>
          <span className="mt-1 block text-base text-muted-foreground">
            {righe.length} {righe.length === 1 ? "esercizio" : "esercizi"}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-7 w-7 shrink-0 text-accent transition-transform ${aperta ? "rotate-180" : ""}`}
        />
      </button>

      {aperta && (
        <div className="flex flex-col gap-4 border-t border-border p-6">
          {ordinate.length === 0 && (
            <p className="text-base text-muted-foreground">Nessun esercizio in questa sessione.</p>
          )}

          {ordinate.length > 1 && (
            <p className="text-base text-muted-foreground">
              Trascina un esercizio per cambiarne la posizione, oppure usa le frecce. Il nuovo ordine
              viene salvato subito.
            </p>
          )}

          {ordinate.map((r, indice) => (
            <div
              key={r.id}
              draggable
              onDragStart={() => setTrascinato(indice)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (trascinato !== null) spostaA(trascinato, indice);
                setTrascinato(null);
              }}
              onDragEnd={() => setTrascinato(null)}
              className={trascinato === indice ? "opacity-60" : undefined}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-base text-muted-foreground">
                  <GripVertical aria-hidden="true" className="h-6 w-6 text-accent" />
                  Posizione {indice + 1}
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary min-h-12 px-4"
                    aria-label={`Sposta ${nomeRiga(r)} in su`}
                    disabled={indice === 0 || riordina.isPending}
                    onClick={() => spostaA(indice, indice - 1)}
                  >
                    <ArrowUp aria-hidden="true" className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary min-h-12 px-4"
                    aria-label={`Sposta ${nomeRiga(r)} in giù`}
                    disabled={indice === ordinate.length - 1 || riordina.isPending}
                    onClick={() => spostaA(indice, indice + 1)}
                  >
                    <ArrowDown aria-hidden="true" className="h-5 w-5" />
                  </button>
                </span>
              </div>
              <RigaEsercizio riga={r} onErrore={onErrore} onAggiornato={onAggiornato} />
            </div>
          ))}

          {!apriCatalogo ? (
            <button type="button" className="btn-primary" onClick={() => setApriCatalogo(true)}>
              Aggiungi esercizio dal catalogo
            </button>
          ) : (
            <div className="flex flex-col gap-4 rounded-[10px] border border-border p-4">
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

          {catalogo.isLoading && <p className="text-base text-muted-foreground">Caricamento…</p>}
          {!catalogo.isLoading && disponibili.length === 0 && (
            <p className="text-base text-muted-foreground">Nessun esercizio trovato.</p>
          )}

          {disponibili.map((e) => (
            <button
              key={e.id}
              type="button"
              className="btn-secondary w-full text-left"
              disabled={aggiungi.isPending}
              onClick={() => aggiungi.mutate(e.id)}
            >
              {e.nome} · <span className="text-accent">{e.gruppo_muscolare}</span>
            </button>
          ))}

              <button type="button" className="btn-secondary w-full" onClick={() => setApriCatalogo(false)}>
                Chiudi catalogo
              </button>
            </div>
          )}

          {!apriLibero ? (
            <button type="button" className="btn-secondary w-full" onClick={() => setApriLibero(true)}>
              Aggiungi esercizio libero
            </button>
          ) : (
            <EsercizioLibero
              schedaId={schedaId}
              etichetta={etichetta}
              ordine={totaleRighe + 1}
              onErrore={onErrore}
              onChiudi={() => setApriLibero(false)}
              onAggiunto={onAggiornato}
            />
          )}
        </div>
      )}
    </article>
  );
}

function EsercizioLibero({
  schedaId,
  etichetta,
  ordine,
  onErrore,
  onChiudi,
  onAggiunto,
}: {
  schedaId: string;
  etichetta: string;
  ordine: number;
  onErrore: (m: string | null) => void;
  onChiudi: () => void;
  onAggiunto: () => void;
}) {
  const [nome, setNome] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [aMinuti, setAMinuti] = useState(false);
  const [serie, setSerie] = useState("3");
  const [ripetizioni, setRipetizioni] = useState("8-10");
  const [durata, setDurata] = useState("10");
  const [recupero, setRecupero] = useState("");
  const [carico, setCarico] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const crea = useMutation({
    mutationFn: async () => {
      const nomePulito = nome.trim();
      if (!nomePulito) throw new Error("Il nome dell'esercizio libero è obbligatorio.");
      const percorso = file ? await caricaImmagineLibera(schedaId, file) : null;
      const prescrizione = aMinuti
        ? { serie: null, ripetizioni: null, durata_minuti: numeroOppureNull(durata) }
        : {
            serie: numeroOppureNull(serie),
            ripetizioni: testoOppureNull(ripetizioni),
            durata_minuti: null,
          };
      const { error } = await supabase.from("scheda_esercizi").insert({
        scheda_id: schedaId,
        esercizio_id: null,
        nome_libero: nomePulito,
        descrizione_libera: testoOppureNull(descrizione),
        immagine_libera_url: percorso,
        sessione: etichetta,
        ordine,
        ...prescrizione,
        recupero_secondi: numeroOppureNull(recupero),
        carico_indicativo: testoOppureNull(carico),
        note: testoOppureNull(note),
      });
      if (error) throw error;
    },
    onError: (e) => onErrore(e instanceof Error ? e.message : "Aggiunta non riuscita."),
    onSuccess: () => {
      onErrore(null);
      onAggiunto();
      onChiudi();
    },
  });

  return (
    <div className="flex flex-col gap-4 rounded-[10px] border border-border p-4">
      <h3 className="text-lg">Esercizio libero fuori catalogo</h3>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Nome</span>
        <input
          className="field"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Es. Affondi con manubri"
        />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Descrizione</span>
        <textarea
          className="field min-h-[96px]"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Immagine (facoltativa)</span>
        <input
          className="field"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Misurazione</span>
        <select
          className="field"
          value={aMinuti ? "minuti" : "serie_ripetizioni"}
          onChange={(e) => setAMinuti(e.target.value === "minuti")}
        >
          <option value="serie_ripetizioni">Serie e ripetizioni</option>
          <option value="minuti">Minuti</option>
        </select>
      </label>

      {aMinuti ? (
        <label className="flex flex-col gap-2 text-base">
          <span className="text-accent">Durata (minuti)</span>
          <input
            className="field"
            inputMode="numeric"
            value={durata}
            onChange={(e) => setDurata(e.target.value)}
          />
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-2 text-base">
            <span className="text-accent">Serie</span>
            <input
              className="field"
              inputMode="numeric"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-base">
            <span className="text-accent">Ripetizioni</span>
            <input
              className="field"
              value={ripetizioni}
              onChange={(e) => setRipetizioni(e.target.value)}
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Recupero (secondi)</span>
        <input
          className="field"
          inputMode="numeric"
          value={recupero}
          onChange={(e) => setRecupero(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Carico indicativo</span>
        <input className="field" value={carico} onChange={(e) => setCarico(e.target.value)} />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Note</span>
        <textarea
          className="field min-h-[80px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <button
        type="button"
        className="btn-primary"
        disabled={crea.isPending}
        onClick={() => crea.mutate()}
      >
        Aggiungi esercizio libero
      </button>
      <button type="button" className="btn-secondary w-full" onClick={onChiudi}>
        Annulla
      </button>
    </div>
  );
}

function RigaEsercizio({
  riga,
  onErrore,
  onAggiornato,
}: {
  riga: SchedaEsercizio;
  onErrore: (m: string | null) => void;
  onAggiornato: () => void;
}) {
  const aMinuti = unitaRiga(riga) === "minuti";
  const [serie, setSerie] = useState(riga.serie === null ? "" : String(riga.serie));
  const [ripetizioni, setRipetizioni] = useState(riga.ripetizioni ?? "");
  const [durata, setDurata] = useState(riga.durata_minuti === null ? "" : String(riga.durata_minuti));
  const [recupero, setRecupero] = useState(
    riga.recupero_secondi === null ? "" : String(riga.recupero_secondi),
  );
  const [carico, setCarico] = useState(riga.carico_indicativo ?? "");
  const [note, setNote] = useState(riga.note ?? "");

  const salva = useMutation({
    mutationFn: async () => {
      const valori = aMinuti
        ? { serie: null, ripetizioni: null, durata_minuti: numeroOppureNull(durata) }
        : {
            serie: numeroOppureNull(serie),
            ripetizioni: testoOppureNull(ripetizioni),
            durata_minuti: null,
          };
      const { error } = await supabase
        .from("scheda_esercizi")
        .update({
          ...valori,
          recupero_secondi: numeroOppureNull(recupero),
          carico_indicativo: testoOppureNull(carico),
          note: testoOppureNull(note),
        })
        .eq("id", riga.id);
      if (error) throw error;
    },
    onError: (e) => onErrore(e instanceof Error ? e.message : "Salvataggio non riuscito."),
    onSuccess: () => {
      onErrore(null);
      onAggiornato();
    },
  });

  const rimuovi = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("scheda_esercizi").delete().eq("id", riga.id);
      if (error) throw error;
    },
    onError: (e) => onErrore(e instanceof Error ? e.message : "Rimozione non riuscita."),
    onSuccess: () => {
      onErrore(null);
      onAggiornato();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-border p-4">
      <p className="text-base font-semibold">{nomeRiga(riga)}</p>

      {aMinuti ? (
        <label className="flex flex-col gap-2 text-base">
          <span className="text-accent">Durata (minuti)</span>
          <input
            className="field"
            inputMode="numeric"
            value={durata}
            onChange={(e) => setDurata(e.target.value)}
          />
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-2 text-base">
            <span className="text-accent">Serie</span>
            <input
              className="field"
              inputMode="numeric"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-base">
            <span className="text-accent">Ripetizioni</span>
            <input
              className="field"
              value={ripetizioni}
              onChange={(e) => setRipetizioni(e.target.value)}
              placeholder="Es. 8-10"
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Recupero (secondi)</span>
        <input
          className="field"
          inputMode="numeric"
          value={recupero}
          onChange={(e) => setRecupero(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Carico indicativo</span>
        <input className="field" value={carico} onChange={(e) => setCarico(e.target.value)} />
      </label>
      <label className="flex flex-col gap-2 text-base">
        <span className="text-accent">Note</span>
        <textarea
          className="field min-h-[80px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <button
        type="button"
        className="btn-primary"
        disabled={salva.isPending}
        onClick={() => salva.mutate()}
      >
        Salva esercizio
      </button>
      <button
        type="button"
        className="btn-secondary w-full"
        disabled={rimuovi.isPending}
        onClick={() => rimuovi.mutate()}
      >
        Rimuovi
      </button>
    </div>
  );
}
