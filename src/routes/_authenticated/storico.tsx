import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { caricaSessioneApp } from "@/lib/profilo";
import {
  caricaStoricoDettagliato,
  chiaveEsercizio,
  type AllenamentoConDettaglio,
  type EsercizioDettaglio,
} from "@/lib/allenamenti";
import { formattaData, formattaDataOra } from "@/lib/date";

export const Route = createFileRoute("/_authenticated/storico")({
  head: () => ({
    meta: [
      { title: "Storico allenamenti | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Elenco degli allenamenti svolti con data e sessione della scheda.",
      },
      { property: "og:title", content: "Storico allenamenti | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Elenco degli allenamenti svolti con data e sessione della scheda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Storico,
});

function Storico() {
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const clienteId = sessione.data?.profilo.id;

  const storico = useQuery({
    queryKey: ["storico-allenamenti", clienteId],
    enabled: !!clienteId,
    queryFn: () => caricaStoricoDettagliato(clienteId!),
  });

  const conclusi = (storico.data ?? []).filter((a) => a.completato_at !== null);
  const corrente = selezionato ? conclusi.find((a) => a.id === selezionato) : null;

  if (corrente) {
    return (
      <DettaglioAllenamento
        allenamento={corrente}
        storico={conclusi}
        onChiudi={() => setSelezionato(null)}
      />
    );
  }

  const gruppi = gruppaPerMese(conclusi);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl">Storico allenamenti</h1>

        {storico.isLoading && <p className="text-lg text-muted-foreground">Caricamento…</p>}

        {!storico.isLoading && conclusi.length === 0 && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <p className="text-lg text-muted-foreground">
              Non hai ancora concluso nessun allenamento. Apri una sessione della tua scheda e
              premi Avvia allenamento.
            </p>
          </div>
        )}

        {gruppi.map(([chiave, voci]) => (
          <div key={chiave} className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg text-accent">{intestazioneMese(chiave)}</h2>
              <span className="text-base text-muted-foreground">
                {voci.length} allenament{voci.length === 1 ? "o" : "i"}
              </span>
            </div>
            {voci.map((a) => (
              <CardAllenamento key={a.id} allenamento={a} onApri={() => setSelezionato(a.id)} />
            ))}
          </div>
        ))}

        <Link to="/area" className="btn-secondary w-full">
          Torna alla mia area
        </Link>
      </div>
    </main>
  );
}

function CardAllenamento({
  allenamento,
  onApri,
}: {
  allenamento: AllenamentoConDettaglio;
  onApri: () => void;
}) {
  const esercizi = allenamento.allenamento_esercizi ?? [];
  const svoltiCount = esercizi.filter((e) => e.completato).length;
  const totale = esercizi.length;
  const durata = durataMinuti(allenamento.created_at, allenamento.completato_at!);

  return (
    <button
      type="button"
      className="card-surface flex w-full flex-col gap-2 p-5 text-left"
      onClick={onApri}
    >
      <h3 className="text-xl">{allenamento.sessione || "Allenamento"}</h3>
      <p className="text-base text-muted-foreground">{formattaData(allenamento.data)}</p>
      <p className="text-base text-muted-foreground">
        Concluso il {formattaDataOra(allenamento.completato_at)}
      </p>
      <div className="mt-1 flex flex-col gap-1 text-base">
        <p className="text-foreground">
          {svoltiCount} di {totale} esercizi
        </p>
        <DurataRiga minuti={durata} />
      </div>
      {allenamento.note_cliente && (
        <p className="mt-1 whitespace-pre-line text-base text-muted-foreground">
          {allenamento.note_cliente}
        </p>
      )}
    </button>
  );
}

function DettaglioAllenamento({
  allenamento,
  storico,
  onChiudi,
}: {
  allenamento: AllenamentoConDettaglio;
  storico: AllenamentoConDettaglio[];
  onChiudi: () => void;
}) {
  const esercizi = (allenamento.allenamento_esercizi ?? [])
    .slice()
    .sort(
      (a, b) =>
        (a.scheda_esercizi?.ordine ?? 0) - (b.scheda_esercizi?.ordine ?? 0),
    );
  const durata = durataMinuti(allenamento.created_at, allenamento.completato_at!);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl">{allenamento.sessione || "Allenamento"}</h1>
        {allenamento.schede?.titolo && (
          <p className="text-base text-muted-foreground">{allenamento.schede.titolo}</p>
        )}

        <section className="card-surface flex flex-col gap-2 p-5">
          <RigaDettaglio etichetta="Inizio" valore={formattaDataOra(allenamento.created_at)} />
          <RigaDettaglio etichetta="Fine" valore={formattaDataOra(allenamento.completato_at)} />
          <RigaDettaglio etichetta="Durata" valore={testoDurata(durata)} />
        </section>

        <h2 className="text-lg text-accent">Esercizi</h2>
        {esercizi.length === 0 && (
          <p className="card-surface p-5 text-base text-muted-foreground">
            Nessun esercizio registrato.
          </p>
        )}
        {esercizi.map((e) => (
          <EsercizioDettaglioRiga
            key={e.id}
            esercizio={e}
            confronto={confrontoPrecedente(e, allenamento, storico)}
          />
        ))}

        {allenamento.note_cliente && (
          <section className="card-surface p-5">
            <h3 className="text-base text-accent">Note</h3>
            <p className="mt-2 whitespace-pre-line text-base">{allenamento.note_cliente}</p>
          </section>
        )}

        <button type="button" className="btn-primary w-full" onClick={onChiudi}>
          Chiudi
        </button>
      </div>
    </main>
  );
}

function EsercizioDettaglioRiga({
  esercizio,
  confronto,
}: {
  esercizio: EsercizioDettaglio;
  confronto: Confronto | null;
}) {
  const nome =
    esercizio.scheda_esercizi?.esercizi?.nome ??
    esercizio.scheda_esercizi?.nome_libero ??
    "Esercizio";
  const cardio = esercizio.scheda_esercizi?.esercizi?.unita_misura === "minuti";

  return (
    <article className="card-surface flex items-start gap-3 p-5">
      {esercizio.completato ? (
        <Check className="mt-1 h-6 w-6 shrink-0 text-success" />
      ) : (
        <Minus className="mt-1 h-6 w-6 shrink-0 text-muted-foreground" />
      )}
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="text-lg">{nome}</h3>
        {esercizio.completato ? (
          <>
            <p className="text-base text-muted-foreground">
              {cardio
                ? `${esercizio.durata_minuti ?? "—"} min`
                : `${esercizio.peso_kg ?? "—"} kg · ${esercizio.ripetizioni_effettive ?? "—"} rip.`}
            </p>
            {confronto && <RigaConfronto confronto={confronto} />}
          </>
        ) : (
          <p className="text-base text-muted-foreground">non svolto</p>
        )}
      </div>
    </article>
  );
}

type Confronto =
  | { tipo: "aumento"; differenza: number; data: string; cardio: boolean }
  | { tipo: "calo"; differenza: number; data: string; cardio: boolean }
  | { tipo: "uguale"; data: string }
  | { tipo: "prima" };

function RigaConfronto({ confronto }: { confronto: Confronto }) {
  const unita = "cardio" in confronto && confronto.cardio ? " min" : " kg";
  if (confronto.tipo === "prima") {
    return <p className="text-base text-muted-foreground">prima volta</p>;
  }
  if (confronto.tipo === "uguale") {
    return (
      <p className="text-base text-muted-foreground">come il {formattaData(confronto.data)}</p>
    );
  }
  const segno = confronto.tipo === "aumento" ? "+" : "−";
  const testo = `${segno}${formattaNumero(confronto.differenza)}${unita} rispetto al ${formattaData(confronto.data)}`;
  return (
    <p
      className={`flex items-center gap-1 text-base ${
        confronto.tipo === "aumento" ? "text-success" : "text-warning"
      }`}
    >
      {confronto.tipo === "aumento" ? (
        <TrendingUp className="h-5 w-5 shrink-0" />
      ) : (
        <TrendingDown className="h-5 w-5 shrink-0" />
      )}
      {testo}
    </p>
  );
}

/** Cerca l'ultimo allenamento precedente in cui lo stesso esercizio risulta svolto. */
function confrontoPrecedente(
  esercizio: EsercizioDettaglio,
  corrente: AllenamentoConDettaglio,
  storico: AllenamentoConDettaglio[],
): Confronto | null {
  const se = esercizio.scheda_esercizi;
  if (!se) return null;
  const cardio = se.esercizi?.unita_misura === "minuti";
  const chiave = chiaveEsercizio({ esercizio_id: se.esercizio_id, nome_libero: se.nome_libero });
  const valoreCorrente = cardio ? esercizio.durata_minuti : esercizio.peso_kg;
  if (valoreCorrente === null) return null;

  for (const a of storico) {
    if (a.id === corrente.id) continue;
    if (a.created_at >= corrente.created_at) continue;
    for (const r of a.allenamento_esercizi ?? []) {
      const rs = r.scheda_esercizi;
      if (!rs || !r.completato) continue;
      if (chiaveEsercizio({ esercizio_id: rs.esercizio_id, nome_libero: rs.nome_libero }) !== chiave)
        continue;
      const valorePrecedente = cardio ? r.durata_minuti : r.peso_kg;
      if (valorePrecedente === null) return { tipo: "prima" };
      const diff = Math.round((valoreCorrente - valorePrecedente) * 100) / 100;
      if (diff > 0) return { tipo: "aumento", differenza: diff, data: a.data, cardio };
      if (diff < 0) return { tipo: "calo", differenza: -diff, data: a.data, cardio };
      return { tipo: "uguale", data: a.data };
    }
  }
  return { tipo: "prima" };
}

function DurataRiga({ minuti }: { minuti: number }) {
  if (minuti > 240) {
    return <p className="text-muted-foreground">durata non registrata</p>;
  }
  return <p className="text-foreground">Durata: {formattaDurata(minuti)}</p>;
}

function testoDurata(minuti: number): string {
  return minuti > 240 ? "durata non registrata" : formattaDurata(minuti);
}

function formattaNumero(n: number): string {
  return n.toLocaleString("it-IT", { maximumFractionDigits: 2 });
}

function RigaDettaglio({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-accent">{etichetta}</dt>
      <dd className="text-right text-foreground">{valore}</dd>
    </div>
  );
}

// --- Helper ---

function gruppaPerMese(
  voci: AllenamentoConDettaglio[],
): [string, AllenamentoConDettaglio[]][] {
  const gruppi = new Map<string, AllenamentoConDettaglio[]>();
  for (const a of voci) {
    const chiave = a.data.slice(0, 7);
    const lista = gruppi.get(chiave) ?? [];
    lista.push(a);
    gruppi.set(chiave, lista);
  }
  return Array.from(gruppi.entries());
}

function intestazioneMese(chiave: string): string {
  const [aStr, mStr] = chiave.split("-");
  const a = Number(aStr);
  const m = Number(mStr);
  const d = new Date(a, m - 1, 1);
  const testo = d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

function parseRipetizioni(testo: string | null): number {
  if (!testo) return 0;
  const numeri = testo.match(/\d+/g);
  if (!numeri || numeri.length === 0) return 0;
  return Number(numeri[0]);
}

function durataMinuti(inizioIso: string, fineIso: string): number {
  const inizio = new Date(inizioIso).getTime();
  const fine = new Date(fineIso).getTime();
  return Math.max(0, Math.round((fine - inizio) / 60000));
}

function formattaDurata(minuti: number): string {
  if (minuti < 60) return `${minuti} min`;
  const ore = Math.floor(minuti / 60);
  const resto = minuti % 60;
  return resto === 0 ? `${ore} h` : `${ore} h ${resto} min`;
}

function isCardio(e: EsercizioDettaglio): boolean {
  return e.scheda_esercizi?.esercizi?.unita_misura === "minuti";
}

function tuttiCardio(esercizi: EsercizioDettaglio[]): boolean {
  if (esercizi.length === 0) return false;
  return esercizi.every((e) => isCardio(e));
}

function pesoTotale(esercizi: EsercizioDettaglio[]): number {
  let totale = 0;
  for (const e of esercizi) {
    if (!e.completato || isCardio(e)) continue;
    const peso = e.peso_kg ?? 0;
    const reps = parseRipetizioni(e.ripetizioni_effettive);
    const serie = e.scheda_esercizi?.serie ?? 0;
    totale += peso * reps * serie;
  }
  return Math.round(totale);
}

function minutiTotali(esercizi: EsercizioDettaglio[]): number {
  return esercizi
    .filter((e) => e.completato && isCardio(e))
    .reduce((s, e) => s + (e.durata_minuti ?? 0), 0);
}
