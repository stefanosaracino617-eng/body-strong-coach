import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { caricaSessioneApp } from "@/lib/profilo";
import { caricaObiettiviCliente } from "@/lib/obiettivi";

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
    queryFn: () => caricaObiettiviCliente(profilo0!.id),
  });

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
    return <Schermo titolo="Caricamento…" />;
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
      <Schermo titolo={`Ciao ${profilo.nome || "gestore"}`} esci={esci}>
        <p className="text-base text-muted-foreground">Pannello del gestore.</p>
        <Link to="/registrazioni" className="btn-primary mt-2">
          Registrazioni da approvare
        </Link>
        <Link to="/clienti" className="btn-secondary w-full">
          Clienti
        </Link>
        <Link to="/catalogo-obiettivi" className="btn-secondary w-full">
          Catalogo obiettivi
        </Link>
        <Link to="/esercizi" className="btn-secondary w-full">
          Catalogo esercizi
        </Link>
        <Link to="/accessi" className="btn-secondary w-full">
          Gestione accessi
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
    <Schermo titolo={`Ciao ${profilo.nome}`} esci={esci}>
      <div className="rounded-[10px] border border-[#2FBF71] px-3 py-3 text-base text-success">
        Account approvato
      </div>
      <p className="text-base text-muted-foreground">
        La tua scheda di allenamento sarà disponibile qui appena il gestore l&apos;avrà preparata.
      </p>
      <Link to="/obiettivi" className="btn-secondary w-full">
        I miei obiettivi ({miei.data?.length ?? 0})
      </Link>
    </Schermo>
  );
}

function Schermo({
  titolo,
  children,
  esci,
}: {
  titolo: string;
  children?: React.ReactNode;
  esci?: () => void;
}) {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl">{titolo}</h1>
        <div className="card-surface flex flex-col gap-4 p-6">{children}</div>
        {esci && (
          <button type="button" className="btn-secondary w-full" onClick={esci}>
            Esci
          </button>
        )}
      </div>
    </main>
  );
}
