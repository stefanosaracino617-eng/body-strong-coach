import { useQuery } from "@tanstack/react-query";
import { BloccoErrore, CaricamentoCard, StatoVuoto } from "@/components/Stati";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { urlImmagini } from "@/lib/esercizi";
import { formattaData, isoAData } from "@/lib/date";
import {
  caricaEserciziScheda,
  nomeRiga,
  percorsiImmagini,
  schedaScaduta,
  unitaRiga,
  type Scheda,
  type SchedaEsercizio,
} from "@/lib/schede";

export function giorniAllaScadenza(dataScadenza: string): number {
  const scadenza = isoAData(dataScadenza);
  if (!scadenza) return 0;
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((scadenza.getTime() - oggi.getTime()) / 86_400_000));
}

export function VistaSchedaCliente({
  scheda,
  conAvvio = false,
  avvisoScaduta = false,
}: {
  scheda: Scheda;
  conAvvio?: boolean;
  /** Mostra in cima il riquadro ambra quando la scheda ha superato la scadenza. */
  avvisoScaduta?: boolean;
}) {
  const righe = useQuery({
    queryKey: ["scheda-esercizi", scheda.id],
    queryFn: () => caricaEserciziScheda(scheda.id),
  });
  const percorsi = percorsiImmagini(righe.data ?? []);
  const immagini = useQuery({
    queryKey: ["immagini-scheda", scheda.id, percorsi.join("|")],
    enabled: percorsi.length > 0,
    queryFn: () => urlImmagini(percorsi),
  });

  const sessioni = useMemo(() => {
    const gruppi = new Map<string, SchedaEsercizio[]>();
    for (const riga of righe.data ?? []) {
      const voci = gruppi.get(riga.sessione) ?? [];
      voci.push(riga);
      gruppi.set(riga.sessione, voci);
    }
    return Array.from(gruppi.entries());
  }, [righe.data]);

  const scaduta = schedaScaduta(scheda);
  const giorni = giorniAllaScadenza(scheda.data_scadenza);
  const testoGiorni = giorni === 0 ? "Scade oggi" : `${giorni} ${giorni === 1 ? "giorno" : "giorni"} rimanenti`;
  const coloreScadenza =
    giorni <= 3 ? "text-destructive" : giorni <= 14 ? "text-warning" : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-6">
      {avvisoScaduta && scaduta && (
        <div className="rounded-[10px] border border-[#F2A93B] px-4 py-4 text-lg text-warning">
          La tua scheda è scaduta il {formattaData(scheda.data_scadenza)}. Chiedi all&apos;istruttore
          di aggiornarla.
        </div>
      )}
      <section className="card-surface flex flex-col gap-3 p-6">
        <h2 className="text-2xl">{scheda.titolo}</h2>
        <p className={`text-lg font-semibold ${coloreScadenza}`}>
          {scaduta
            ? `Scaduta il ${formattaData(scheda.data_scadenza)}`
            : `Scadenza: ${formattaData(scheda.data_scadenza)} · ${testoGiorni}`}
        </p>
        {scheda.note_gestore && (
          <div className="border-t border-border pt-4">
            <h3 className="mb-2 text-base text-accent">Note del gestore</h3>
            <p className="whitespace-pre-line text-lg leading-relaxed">{scheda.note_gestore}</p>
          </div>
        )}
      </section>

      {righe.isLoading && <CaricamentoCard quante={2} />}
      {righe.isError && <BloccoErrore onRiprova={() => righe.refetch()} />}
      {!righe.isLoading && sessioni.length === 0 && (
        <p className="card-surface p-6 text-lg text-muted-foreground">La scheda non contiene ancora esercizi.</p>
      )}
      {sessioni.map(([etichetta, esercizi]) => (
        <SessioneCliente
          key={etichetta}
          etichetta={etichetta}
          righe={esercizi}
          immagini={immagini.data ?? {}}
          conAvvio={conAvvio}
        />
      ))}
      <p className="text-base text-muted-foreground">
        I programmi di allenamento non costituiscono prescrizione medica.
      </p>
    </div>
  );
}

function SessioneCliente({
  etichetta,
  righe,
  immagini,
  conAvvio = false,
}: {
  etichetta: string;
  righe: SchedaEsercizio[];
  immagini: Record<string, string>;
  conAvvio?: boolean;
}) {
  const [aperta, setAperta] = useState(false);
  return (
    <section className="card-surface overflow-hidden">
      <button
        type="button"
        className="flex min-h-16 w-full items-center justify-between gap-4 p-5 text-left"
        aria-expanded={aperta}
        onClick={() => setAperta((valore) => !valore)}
      >
        <span>
          <span className="block font-display text-xl font-bold">{etichetta}</span>
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
        <div className="flex flex-col gap-6 border-t border-border p-5">
          {conAvvio && (
            <Link to="/allenamento" search={{ sessione: etichetta }} className="btn-primary text-center">
              Avvia allenamento
            </Link>
          )}
          {righe.map((riga) => (
            <EsercizioCliente key={riga.id} riga={riga} immagini={immagini} />
          ))}
        </div>
      )}
    </section>
  );
}

function EsercizioCliente({ riga, immagini }: { riga: SchedaEsercizio; immagini: Record<string, string> }) {
  const percorso = riga.esercizi?.immagine_url ?? riga.immagine_libera_url;
  const immagine = percorso ? (immagini[percorso] ?? percorso) : null;
  const descrizione = riga.esercizi?.descrizione_esecuzione ?? riga.descrizione_libera;
  const errori = riga.esercizi?.errori_comuni;
  const aMinuti = unitaRiga(riga) === "minuti";
  const haPrescrizione = aMinuti
    ? riga.durata_minuti !== null
    : riga.serie !== null || Boolean(riga.ripetizioni);
  const haParametri =
    haPrescrizione ||
    riga.recupero_secondi !== null ||
    Boolean(riga.carico_indicativo) ||
    Boolean(riga.note);

  return (
    <article className="border-b border-border pb-6 last:border-b-0 last:pb-0">
      <h3 className="mb-4 text-xl">{nomeRiga(riga)}</h3>
      {immagine && (
        <div className="immagine-esercizio mb-4">
          <img src={immagine} alt={`Esecuzione di ${nomeRiga(riga)}`} />
        </div>
      )}
      {descrizione && <p className="whitespace-pre-line text-lg leading-relaxed">{descrizione}</p>}
      {errori && (
        <div className="mt-4 border-l-4 border-warning pl-4">
          <h4 className="text-base text-warning">Errori comuni</h4>
          <p className="mt-1 whitespace-pre-line text-lg leading-relaxed">{errori}</p>
        </div>
      )}
      {haParametri && (
        <dl className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-lg">
          {aMinuti ? (
            riga.durata_minuti !== null && <Parametro etichetta="Durata" valore={`${riga.durata_minuti} minuti`} />
          ) : (
            haPrescrizione && (
              <Parametro
                etichetta="Serie × ripetizioni"
                valore={[riga.serie, riga.ripetizioni]
                  .filter((valore) => valore !== null && valore !== "")
                  .join(" × ")}
              />
            )
          )}
          {riga.recupero_secondi !== null && <Parametro etichetta="Recupero" valore={`${riga.recupero_secondi} secondi`} />}
          {riga.carico_indicativo && <Parametro etichetta="Carico indicativo" valore={riga.carico_indicativo} />}
          {riga.note && <Parametro etichetta="Note del gestore" valore={riga.note} />}
        </dl>
      )}
    </article>
  );
}

function Parametro({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div>
      <dt className="font-semibold text-accent">{etichetta}</dt>
      <dd className="mt-1 whitespace-pre-line leading-relaxed">{valore}</dd>
    </div>
  );
}