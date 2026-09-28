import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { caricaSessioneApp } from "@/lib/profilo";
import { caricaObiettiviCliente } from "@/lib/obiettivi";
import { DashboardCliente } from "@/components/DashboardCliente";
import { DashboardGestore } from "@/components/DashboardGestore";
import { CaricamentoCard } from "@/components/Stati";
import { StrisciaInstalla } from "@/components/StrisciaInstalla";
import { caricaRegole, regoleNonVuote } from "@/lib/regole";
import { statoCertificato } from "@/lib/certificato";
import { abbonamentoSospeso, statoAbbonamento } from "@/lib/abbonamento";
import { formattaData } from "@/lib/date";

export const Route = createFileRoute("/_authenticated/area")({
  head: () => ({
    meta: [
      { title: "La mia area | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Area personale dei soci della palestra Body Strong Fitness Club.",
      },
      { property: "og:title", content: "La mia area | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Area personale dei soci della palestra Body Strong Fitness Club.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Area,
});

function Area() {
  const { data, isLoading } = useQuery({
    queryKey: ["sessione-app"],
    queryFn: caricaSessioneApp,
  });

  const profilo0 = data?.profilo;
  const puoScegliereObiettivi = !!profilo0 && !data?.isGestore && profilo0.stato === "approvato";

  const miei = useQuery({
    queryKey: ["obiettivi-cliente", profilo0?.id],
    enabled: puoScegliereObiettivi,
    queryFn: () => {
      if (!profilo0) return Promise.resolve([]);
      return caricaObiettiviCliente(profilo0.id);
    },
  });

  const regole = useQuery({ queryKey: ["regole-palestra"], queryFn: caricaRegole });
  const regoleVisibili = regoleNonVuote(regole.data?.contenuto);

  const nessunObiettivo = puoScegliereObiettivi && miei.isSuccess && miei.data.length === 0;

  if (isLoading) {
    return (
      <Schermo titolo="La mia area" contenutoLibero>
        <CaricamentoCard quante={2} />
      </Schermo>
    );
  }

  if (!data) {
    return (
      <Schermo titolo="Profilo non disponibile">
        <p className="text-base text-muted-foreground">
          Non riusciamo a trovare i tuoi dati. Prova a uscire e ad accedere di nuovo.
        </p>
      </Schermo>
    );
  }

  const { profilo, isGestore } = data;

  if (isGestore) {
    return (
      <Schermo titolo={`Ciao ${profilo.nome || "gestore"}`} contenutoLibero>
        <DashboardGestore />
        <div className="flex flex-col gap-3 lg:hidden">
          <Link to="/abbonamenti" className="btn-secondary w-full">
            Tipi di abbonamento
          </Link>
          <Link to="/catalogo-obiettivi" className="btn-secondary w-full">
            Catalogo obiettivi
          </Link>
          <Link to="/accessi" className="btn-secondary w-full">
            Gestione accessi
          </Link>
          <Link to="/regole" className="btn-secondary w-full">
            Regole della palestra
          </Link>
          <Link to="/installa" className="btn-secondary w-full">
            Installa l&apos;app
          </Link>
        </div>
      </Schermo>
    );
  }

  if (profilo.stato === "in_attesa") {
    return (
      <Schermo titolo="Registrazione in attesa">
        <p className="text-base text-muted-foreground">
          Grazie {profilo.nome}, la tua registrazione è stata ricevuta. Il gestore la verificherà al
          più presto: riceverai accesso alla tua scheda di allenamento non appena sarà approvata.
        </p>
        <div className="rounded-[10px] border border-[#F2A93B] px-3 py-3 text-base text-warning">
          Stato attuale: in attesa di approvazione
        </div>
      </Schermo>
    );
  }

  if (profilo.stato === "sospeso") {
    return (
      <Schermo titolo="Account sospeso">
        <p className="text-base text-muted-foreground">
          Il tuo account è sospeso. Rivolgiti al gestore della palestra per riattivarlo.
        </p>
      </Schermo>
    );
  }

  const sospeso = abbonamentoSospeso(profilo.abbonamento_scadenza);

  return (
    <Schermo titolo={`Ciao ${profilo.nome}`} contenutoLibero>
      <AvvisoCertificato scadenza={profilo.certificato_scadenza} />
      <AvvisoAbbonamento scadenza={profilo.abbonamento_scadenza} />
      {nessunObiettivo && (
        <div className="rounded-[10px] border border-[#F2A93B] px-4 py-4 text-base text-warning">
          Non hai ancora scelto gli obiettivi. Puoi farlo quando vuoi: la scheda e il registro
          degli allenamenti restano disponibili.{" "}
          <Link to="/obiettivi" className="font-semibold text-accent underline">
            Scegli gli obiettivi
          </Link>
        </div>
      )}
      <DashboardCliente profilo={profilo} allenamentoBloccato={sospeso} />
      <div className="flex flex-col gap-3 lg:hidden">
        {regoleVisibili && (
          <Link to="/regole" className="btn-secondary w-full">
            Regole della palestra
          </Link>
        )}
        <Link to="/avvertenze" className="btn-secondary w-full">
          Avvertenze
        </Link>
        <Link to="/installa" className="btn-secondary w-full">
          Installa l&apos;app
        </Link>
      </div>
      <StrisciaInstalla />
      <div className="h-14" aria-hidden="true" />
    </Schermo>
  );
}

/** Riquadro con la scadenza dell'abbonamento del cliente. */
function AvvisoAbbonamento({ scadenza }: { scadenza: string | null }) {
  if (!scadenza) return null;
  const stato = statoAbbonamento(scadenza);
  if (stato.stato === "valido") {
    return (
      <p className="text-base text-muted-foreground">
        Abbonamento valido fino al {formattaData(scadenza)}.
      </p>
    );
  }
  const scaduto = stato.stato === "scaduto";
  return (
    <div
      className={`rounded-[10px] border px-4 py-4 text-base ${
        scaduto ? "border-destructive text-destructive" : "border-[#F2A93B] text-warning"
      }`}
    >
      {scaduto
        ? `Il tuo abbonamento è scaduto il ${formattaData(scadenza)}. Rivolgiti in palestra per il rinnovo.`
        : `Il tuo abbonamento scade il ${formattaData(scadenza)}. Ricordati di rinnovarlo in palestra.`}
    </div>
  );
}

/** Riquadro con la scadenza del certificato medico del cliente. */
function AvvisoCertificato({ scadenza }: { scadenza: string | null }) {
  if (!scadenza) return null;
  const stato = statoCertificato(scadenza);
  if (stato.stato === "valido") {
    return (
      <p className="text-base text-muted-foreground">
        Certificato medico valido fino al {formattaData(scadenza)}.
      </p>
    );
  }
  const scaduto = stato.stato === "scaduto";
  return (
    <div
      className={`rounded-[10px] border px-4 py-4 text-base ${
        scaduto ? "border-destructive text-destructive" : "border-[#F2A93B] text-warning"
      }`}
    >
      {scaduto
        ? `Il tuo certificato medico è scaduto il ${formattaData(scadenza)}. Consegna il rinnovo in palestra.`
        : `Il tuo certificato medico scade il ${formattaData(scadenza)}. Ricordati di consegnare il rinnovo in palestra.`}
    </div>
  );
}

function Schermo({
  titolo,
  children,
  contenutoLibero = false,
}: {
  titolo: string;
  children?: React.ReactNode;
  contenutoLibero?: boolean;
}) {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <h1 className="text-2xl">{titolo}</h1>
        <div className={contenutoLibero ? "flex flex-col gap-4" : "card-surface flex flex-col gap-4 p-6"}>
          {children}
        </div>
      </div>
    </main>
  );
}
