import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { caricaSessioneApp } from "@/lib/profilo";
import { caricaObiettiviCliente } from "@/lib/obiettivi";
import { caricaSchedaClienteAttiva } from "@/lib/schede";
import { VistaSchedaCliente } from "@/components/VistaSchedaCliente";
import { DashboardGestore } from "@/components/DashboardGestore";
import { BloccoErrore, CaricamentoCard } from "@/components/Stati";
import { StrisciaInstalla } from "@/components/StrisciaInstalla";
import { caricaRegole, regoleNonVuote } from "@/lib/regole";
import { statoCertificato } from "@/lib/certificato";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["sessione-app"],
    queryFn: caricaSessioneApp,
  });

  const profilo0 = data?.profilo;
  const deveSceglierne = !!profilo0 && !data?.isGestore && profilo0.stato === "approvato";

  const miei = useQuery({
    queryKey: ["obiettivi-cliente", profilo0?.id],
    enabled: deveSceglierne,
    queryFn: () => {
      if (!profilo0) return Promise.resolve([]);
      return caricaObiettiviCliente(profilo0.id);
    },
  });

  const scheda = useQuery({
    queryKey: ["mia-scheda-attiva", profilo0?.id],
    enabled: deveSceglierne,
    queryFn: () => {
      if (!profilo0) return Promise.resolve(null);
      return caricaSchedaClienteAttiva(profilo0.id);
    },
  });

  const regole = useQuery({ queryKey: ["regole-palestra"], queryFn: caricaRegole });
  const regoleVisibili = regoleNonVuote(regole.data?.contenuto);

  const nessunObiettivo = deveSceglierne && miei.isSuccess && miei.data.length === 0;

  useEffect(() => {
    if (nessunObiettivo) navigate({ to: "/obiettivi", replace: true });
  }, [nessunObiettivo, navigate]);

  async function esci() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }


  if (isLoading) {
    return (
      <Schermo titolo="La mia area" contenutoLibero>
        <CaricamentoCard quante={2} />
      </Schermo>
    );
  }

  if (!data) {
    return (
      <Schermo titolo="Profilo non disponibile" esci={esci}>
        <p className="text-base text-muted-foreground">
          Non riusciamo a trovare i tuoi dati. Prova a uscire e ad accedere di nuovo.
        </p>
      </Schermo>
    );
  }

  const { profilo, isGestore } = data;

  if (isGestore) {
    return (
      <Schermo titolo={`Ciao ${profilo.nome || "gestore"}`} esci={esci} contenutoLibero>
        <DashboardGestore />
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
      </Schermo>
    );
  }

  if (profilo.stato === "in_attesa") {
    return (
      <Schermo titolo="Registrazione in attesa" esci={esci}>
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
      <Schermo titolo="Account sospeso" esci={esci}>
        <p className="text-base text-muted-foreground">
          Il tuo account è sospeso. Rivolgiti al gestore della palestra per riattivarlo.
        </p>
      </Schermo>
    );
  }

  return (
    <Schermo titolo={`Ciao ${profilo.nome}`} esci={esci} contenutoLibero>
      <AvvisoCertificato scadenza={profilo.certificato_scadenza} />
      {scheda.isLoading && <CaricamentoCard quante={2} />}
      {scheda.isError && <BloccoErrore onRiprova={() => scheda.refetch()} />}
      {!scheda.isLoading && !scheda.isError && !scheda.data && (
        <div className="card-surface flex flex-col items-center gap-2 p-6 text-center">
          <p className="text-xl font-semibold">La tua scheda di allenamento è scaduta.</p>
          <p className="text-base text-muted-foreground">
            Rivolgiti all&apos;istruttore per il rinnovo.
          </p>
        </div>
      )}
      {scheda.data && <VistaSchedaCliente scheda={scheda.data} conAvvio />}
      <Link to="/storico" className="btn-secondary w-full">
        Storico allenamenti
      </Link>
      <Link to="/obiettivi" className="btn-secondary w-full">
        I miei obiettivi ({miei.data?.length ?? 0})
      </Link>
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
      <StrisciaInstalla />
      <div className="h-14" aria-hidden="true" />
    </Schermo>
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
  esci,
  contenutoLibero = false,
}: {
  titolo: string;
  children?: React.ReactNode;
  esci?: () => void;
  contenutoLibero?: boolean;
}) {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl">{titolo}</h1>
        <div className={contenutoLibero ? "flex flex-col gap-4" : "card-surface flex flex-col gap-4 p-6"}>
          {children}
        </div>
        {esci && (
          <button type="button" className="btn-secondary w-full" onClick={esci}>
            Esci
          </button>
        )}
      </div>
    </main>
  );
}
