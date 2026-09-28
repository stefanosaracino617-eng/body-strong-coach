import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FotoProfilo } from "@/components/FotoProfilo";
import { VistaSchedaCliente } from "@/components/VistaSchedaCliente";
import { BloccoErrore, CaricamentoCard } from "@/components/Stati";
import { statoAbbonamento } from "@/lib/abbonamento";
import { riepilogoCliente } from "@/lib/allenamenti";
import { statoCertificato } from "@/lib/certificato";
import { formattaData } from "@/lib/date";
import { caricaCatalogo, caricaObiettiviCliente } from "@/lib/obiettivi";
import type { Profilo } from "@/lib/profilo";
import { caricaSchedaClienteAttiva, schedaScaduta } from "@/lib/schede";

type Tono = "ok" | "attenzione" | "problema" | "neutro";

function tonoDa(stato: string): Tono {
  if (stato === "valido") return "ok";
  if (stato === "in-scadenza") return "attenzione";
  if (stato === "scaduto") return "problema";
  return "neutro";
}

const bordo: Record<Tono, string> = {
  ok: "border-success",
  attenzione: "border-warning",
  problema: "border-destructive",
  neutro: "border-border",
};

function Tessera({
  etichetta,
  titolo,
  dettaglio,
  tono,
}: {
  etichetta: string;
  titolo: string;
  dettaglio: string;
  tono: Tono;
}) {
  return (
    <article className={`card-surface flex flex-col gap-1 p-4 ${bordo[tono]}`}>
      <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {etichetta}
      </span>
      <span className="text-lg font-bold leading-snug">{titolo}</span>
      <span className="text-sm text-muted-foreground">{dettaglio}</span>
    </article>
  );
}

export function DashboardCliente({
  profilo,
  allenamentoBloccato = false,
}: {
  profilo: Profilo;
  allenamentoBloccato?: boolean;
}) {
  const scheda = useQuery({
    queryKey: ["mia-scheda-attiva", profilo.id],
    queryFn: () => caricaSchedaClienteAttiva(profilo.id),
  });
  const riepilogo = useQuery({
    queryKey: ["riepilogo-cliente", profilo.id],
    queryFn: () => riepilogoCliente(profilo.id),
  });
  const catalogo = useQuery({
    queryKey: ["catalogo-obiettivi"],
    queryFn: () => caricaCatalogo(true),
  });
  const selezionati = useQuery({
    queryKey: ["obiettivi-cliente", profilo.id],
    queryFn: () => caricaObiettiviCliente(profilo.id),
  });

  const abbonamento = statoAbbonamento(profilo.abbonamento_scadenza);
  const certificato = statoCertificato(profilo.certificato_scadenza);
  const nomiObiettivi = (catalogo.data ?? [])
    .filter((o) => (selezionati.data ?? []).includes(o.id))
    .map((o) => o.nome);

  const schedaTono: Tono = !scheda.data
    ? "problema"
    : schedaScaduta(scheda.data)
      ? "attenzione"
      : "ok";
  const schedaTitolo = !scheda.data
    ? "Nessuna scheda"
    : scheda.data.titolo || "Scheda attiva";
  const schedaDettaglio = !scheda.data
    ? "Chiedi la scheda all'istruttore"
    : schedaScaduta(scheda.data)
      ? `Scaduta il ${formattaData(scheda.data.data_scadenza)}`
      : `Valida fino al ${formattaData(scheda.data.data_scadenza)}`;

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-4">
        <section className="card-surface flex flex-col gap-4 p-5">
          <FotoProfilo
            nome={profilo.nome}
            cognome={profilo.cognome}
            fotoUrl={profilo.foto_url}
            modificabile
          />
          <div>
            <h2 className="text-2xl">
              {profilo.nome} {profilo.cognome}
            </h2>
            <p className="text-base text-muted-foreground">{profilo.email}</p>
            {profilo.tipo_abbonamento && (
              <p className="mt-1 text-base text-accent">{profilo.tipo_abbonamento}</p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3">
          <Tessera
            etichetta="Abbonamento"
            titolo={
              abbonamento.stato === "valido"
                ? "In regola"
                : abbonamento.stato === "in-scadenza"
                  ? "In scadenza"
                  : abbonamento.stato === "scaduto"
                    ? "Scaduto"
                    : "Non registrato"
            }
            dettaglio={abbonamento.testo}
            tono={tonoDa(abbonamento.stato)}
          />
          <Tessera
            etichetta="Certificato medico"
            titolo={
              certificato.stato === "valido"
                ? "Valido"
                : certificato.stato === "in-scadenza"
                  ? "In scadenza"
                  : certificato.stato === "scaduto"
                    ? "Scaduto"
                    : "Non registrato"
            }
            dettaglio={certificato.testo}
            tono={tonoDa(certificato.stato)}
          />
          <Tessera
            etichetta="Scheda"
            titolo={schedaTitolo}
            dettaglio={scheda.isLoading ? "Caricamento…" : schedaDettaglio}
            tono={scheda.isLoading ? "neutro" : schedaTono}
          />
        </div>

        <section className="card-surface grid grid-cols-2 gap-3 p-5">
          <div>
            <p className="text-3xl font-bold">{riepilogo.data?.ultimi30 ?? "—"}</p>
            <p className="text-sm text-muted-foreground">Allenamenti negli ultimi 30 giorni</p>
          </div>
          <div>
            <p className="text-lg font-bold leading-snug">
              {riepilogo.data?.ultimo ? formattaData(riepilogo.data.ultimo) : "—"}
            </p>
            <p className="text-sm text-muted-foreground">Ultimo allenamento</p>
          </div>
        </section>

        <section className="card-surface flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg">Obiettivi</h3>
            <Link to="/obiettivi" className="text-sm font-semibold text-accent">
              Modifica
            </Link>
          </div>
          {nomiObiettivi.length === 0 ? (
            <p className="text-base text-muted-foreground">Nessun obiettivo selezionato.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {nomiObiettivi.map((nome) => (
                <li
                  key={nome}
                  className="rounded-full border border-border px-3 py-1 text-sm text-foreground"
                >
                  {nome}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-4">
        {scheda.isLoading && <CaricamentoCard quante={2} />}
        {scheda.isError && <BloccoErrore onRiprova={() => scheda.refetch()} />}
        {!scheda.isLoading && !scheda.isError && !scheda.data && (
          <div className="card-surface flex flex-col items-center gap-2 p-6 text-center">
            <p className="text-xl font-semibold">Non hai ancora una scheda di allenamento.</p>
            <p className="text-base text-muted-foreground">
              Rivolgiti all&apos;istruttore per riceverla.
            </p>
          </div>
        )}
        {allenamentoBloccato && (
          <div className="rounded-[10px] border border-destructive px-4 py-6 text-center text-lg text-destructive">
            Il tuo abbonamento è scaduto. Rivolgiti in palestra per il rinnovo: fino ad allora non
            puoi avviare un allenamento.
          </div>
        )}
        {scheda.data && (
          <VistaSchedaCliente
            scheda={scheda.data}
            conAvvio={!allenamentoBloccato}
            avvisoScaduta
          />
        )}
      </div>
    </div>
  );
}
