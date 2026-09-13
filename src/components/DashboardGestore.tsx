import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { caricaNumeriDashboard } from "@/lib/dashboard";
import { BloccoErrore, CaricamentoRiquadri } from "@/components/Stati";

type Tono = "normale" | "ambra" | "rosso";

function Riquadro({
  numero,
  testo,
  tono = "normale",
  children,
}: {
  numero: number;
  testo: string;
  tono?: Tono;
  children?: never;
}) {
  const bordo =
    tono === "rosso"
      ? "border-destructive"
      : tono === "ambra"
        ? "border-[#F2A93B]"
        : "border-border";
  const colore =
    tono === "rosso" ? "text-destructive" : tono === "ambra" ? "text-warning" : "text-foreground";
  return (
    <div className={`card-surface flex h-full flex-col gap-1 p-5 ${bordo}`}>
      <span className={`text-3xl font-bold ${colore}`}>{numero}</span>
      <span className="text-base text-muted-foreground">{testo}</span>
    </div>
  );
}

export function DashboardGestore() {
  const numeri = useQuery({ queryKey: ["numeri-dashboard"], queryFn: caricaNumeriDashboard });

  if (numeri.isLoading) return <CaricamentoRiquadri />;
  if (numeri.isError) return <BloccoErrore onRiprova={() => numeri.refetch()} />;

  const n = numeri.data!;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Link to="/registrazioni">
          <Riquadro
            numero={n.inAttesa}
            testo="In attesa di approvazione"
            tono={n.inAttesa > 0 ? "ambra" : "normale"}
          />
        </Link>
        <Link to="/clienti" search={{ filtro: "tutti" as const }}>
          <Riquadro numero={n.clientiAttivi} testo="Clienti attivi" />
        </Link>
        <Link to="/clienti" search={{ filtro: "in-scadenza" as const }}>
          <Riquadro
            numero={n.inScadenza}
            testo="Schede in scadenza"
            tono={n.inScadenza > 0 ? "ambra" : "normale"}
          />
        </Link>
        <Link to="/clienti" search={{ filtro: "senza-scheda" as const }}>
          <Riquadro
            numero={n.senzaScheda}
            testo="Senza scheda attiva"
            tono={n.senzaScheda > 0 ? "rosso" : "normale"}
          />
        </Link>
        <Link to="/allenamenti-recenti">
          <Riquadro numero={n.allenamenti7} testo="Allenamenti negli ultimi 7 giorni" />
        </Link>
        <Link to="/esercizi">
          <Riquadro numero={n.eserciziAttivi} testo="Catalogo esercizi" />
        </Link>
      </div>

      <Link to="/clienti" search={{ filtro: "tutti" as const }} className="btn-primary">
        Tutti i clienti
      </Link>
    </div>
  );
}
