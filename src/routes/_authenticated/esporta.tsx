import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { caricaSessioneApp } from "@/lib/profilo";
import { esportaTutto } from "@/lib/esportazione";
import { avvisoErrore, avvisoOk, testoErrore } from "@/lib/avvisi";
import { CaricamentoCard } from "@/components/Stati";

export const Route = createFileRoute("/_authenticated/esporta")({
  head: () => ({
    meta: [
      { title: "Esporta dati | Body Strong Fitness Club" },
      {
        name: "description",
        content:
          "Scarica in un unico file compresso clienti, schede, allenamenti e catalogo esercizi.",
      },
      { property: "og:title", content: "Esporta dati | Body Strong Fitness Club" },
      {
        property: "og:description",
        content:
          "Scarica in un unico file compresso clienti, schede, allenamenti e catalogo esercizi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Esporta,
});

const AVVISO =
  "Il file conterrà dati personali dei clienti. Conservalo in un luogo sicuro e non inviarlo per email o messaggistica.";

function Esporta() {
  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const [conferma, setConferma] = useState(false);
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function avvia() {
    setAttesa(true);
    setErrore(null);
    try {
      const nome = await esportaTutto();
      avvisoOk(`Esportazione pronta: ${nome}`);
      setConferma(false);
    } catch (e) {
      const testo = testoErrore(e, "Non riesco a preparare l'esportazione. Controlla la connessione.");
      setErrore(testo);
      avvisoErrore(testo);
    } finally {
      setAttesa(false);
    }
  }

  if (sessione.isLoading) {
    return (
      <Pagina titolo="Esporta dati">
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

  return (
    <Pagina titolo="Esporta dati">
      <section className="card-surface flex flex-col gap-3 p-6">
        <h2 className="text-lg">Che cosa contiene</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-base text-muted-foreground">
          <li>Clienti, con obiettivi e consensi</li>
          <li>Schede e relativi esercizi</li>
          <li>Allenamenti e dettaglio degli esercizi svolti</li>
          <li>Catalogo esercizi, riutilizzabile per l&apos;importazione</li>
        </ul>
        <p className="text-base text-muted-foreground">
          Sei file in formato CSV, già pronti per Excel in italiano, dentro un unico file compresso.
        </p>
      </section>

      {errore && (
        <section className="card-surface flex flex-col gap-3 border-destructive p-6">
          <p className="text-base text-destructive">{errore}</p>
          <button type="button" className="btn-secondary" onClick={() => void avvia()}>
            Riprova
          </button>
        </section>
      )}

      {!conferma ? (
        <button type="button" className="btn-primary" onClick={() => setConferma(true)}>
          Esporta tutti i dati
        </button>
      ) : (
        <section className="card-surface flex flex-col gap-3 border-[#F2A93B] p-6">
          <p className="text-base text-warning">{AVVISO}</p>
          <button
            type="button"
            className="btn-primary"
            disabled={attesa}
            onClick={() => void avvia()}
          >
            {attesa ? "Preparazione in corso…" : "Ho capito, prepara il file"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={attesa}
            onClick={() => setConferma(false)}
          >
            Annulla
          </button>
          {attesa && <CaricamentoCard />}
        </section>
      )}

      <Link to="/area" className="btn-secondary w-full">
        Torna alla mia area
      </Link>
    </Pagina>
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
