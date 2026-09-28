import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { caricaNumeriDashboard } from "@/lib/dashboard";
import { BloccoErrore, CaricamentoRiquadri } from "@/components/Stati";

type Tono = "normale" | "ambra" | "rosso";

function Riquadro({
  numero,
  testo,
  tono = "normale",
}: {
  numero: number;
  testo: string;
  tono?: Tono;
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
    <div className={`card-surface flex h-full flex-col justify-between gap-3 p-5 transition-colors hover:border-accent ${bordo}`}>
      <span className={`text-4xl font-bold leading-none ${colore}`}>{numero}</span>
      <span className="text-base leading-snug text-muted-foreground">{testo}</span>
      <span className="text-sm font-semibold text-accent">Apri</span>
    </div>
  );
}

export function DashboardGestore() {
  const numeri = useQuery({ queryKey: ["numeri-dashboard"], queryFn: caricaNumeriDashboard });

  if (numeri.isLoading) return <CaricamentoRiquadri />;
  if (numeri.isError) return <BloccoErrore onRiprova={() => numeri.refetch()} />;

  const n = numeri.data!;
  const daFare = [
    n.inAttesa > 0
      ? { chiave: "attesa", testo: `${n.inAttesa} registrazion${n.inAttesa === 1 ? "e" : "i"} da approvare`, href: "/registrazioni" as const }
      : null,
    n.inScadenza > 0
      ? { chiave: "schede", testo: `${n.inScadenza} sched${n.inScadenza === 1 ? "a" : "e"} scadut${n.inScadenza === 1 ? "a" : "e"} o in scadenza`, href: "/clienti" as const, filtro: "in-scadenza" as const }
      : null,
    n.senzaScheda > 0
      ? { chiave: "vuote", testo: `${n.senzaScheda} client${n.senzaScheda === 1 ? "e" : "i"} senza scheda`, href: "/clienti" as const, filtro: "senza-scheda" as const }
      : null,
    n.certificati > 0
      ? { chiave: "cert", testo: `${n.certificati} certificat${n.certificati === 1 ? "o" : "i"} da rinnovare`, href: "/certificati" as const }
      : null,
    n.abbonamenti > 0
      ? { chiave: "abb", testo: `${n.abbonamenti} abbonament${n.abbonamenti === 1 ? "o" : "i"} da rinnovare`, href: "/clienti" as const, filtro: "abbonamento" as const }
      : null,
  ].filter((voce) => voce !== null);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Link to="/registrazioni">
          <Riquadro numero={n.inAttesa} testo="In attesa di approvazione" tono={n.inAttesa > 0 ? "ambra" : "normale"} />
        </Link>
        <Link to="/clienti" search={{ filtro: "tutti" }}>
          <Riquadro numero={n.clientiAttivi} testo="Clienti attivi" />
        </Link>
        <Link to="/clienti" search={{ filtro: "in-scadenza" }}>
          <Riquadro numero={n.inScadenza} testo="Schede scadute o in scadenza" tono={n.inScadenza > 0 ? "ambra" : "normale"} />
        </Link>
        <Link to="/clienti" search={{ filtro: "senza-scheda" }}>
          <Riquadro numero={n.senzaScheda} testo="Senza scheda attiva" tono={n.senzaScheda > 0 ? "rosso" : "normale"} />
        </Link>
        <Link to="/certificati">
          <Riquadro numero={n.certificati} testo="Certificati da rinnovare" tono={n.certificati > 0 ? "rosso" : "normale"} />
        </Link>
        <Link to="/clienti" search={{ filtro: "abbonamento" }}>
          <Riquadro numero={n.abbonamenti} testo="Abbonamenti da rinnovare" tono={n.abbonamenti > 0 ? "rosso" : "normale"} />
        </Link>
        <Link to="/allenamenti-recenti">
          <Riquadro numero={n.allenamenti7} testo="Allenamenti negli ultimi 7 giorni" />
        </Link>
        <Link to="/esercizi">
          <Riquadro numero={n.eserciziAttivi} testo="Esercizi nel catalogo" />
        </Link>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <section className="card-surface flex flex-col gap-3 p-5">
          <h2 className="text-lg">Da controllare</h2>
          {daFare.length === 0 ? (
            <p className="text-base text-muted-foreground">
              Niente in sospeso. Registrazioni, schede, abbonamenti e certificati sono in regola.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {daFare.map((voce) =>
                voce.href === "/clienti" ? (
                  <li key={voce.chiave}>
                    <Link
                      to="/clienti"
                      search={{ filtro: voce.filtro ?? "tutti" }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-base font-semibold hover:border-accent"
                    >
                      {voce.testo}
                      <span className="text-sm text-accent">Apri</span>
                    </Link>
                  </li>
                ) : (
                  <li key={voce.chiave}>
                    <Link
                      to={voce.href}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-base font-semibold hover:border-accent"
                    >
                      {voce.testo}
                      <span className="text-sm text-accent">Apri</span>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg">Sezioni</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <Voce to="/clienti" search={{ filtro: "tutti" }} titolo="Clienti" testo="Schede e scadenze" />
            <Voce to="/registrazioni" titolo="Registrazioni" testo="Nuovi soci da approvare" />
            <Voce to="/esercizi" titolo="Esercizi" testo="Catalogo per le schede" />
            <Voce to="/abbonamenti" titolo="Abbonamenti" testo="Durate e tipi" />
            <Voce to="/esporta" titolo="Esporta" testo="Copia dei dati" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Voce({
  to,
  titolo,
  testo,
  search,
}: {
  to: "/clienti" | "/registrazioni" | "/esercizi" | "/abbonamenti" | "/esporta";
  titolo: string;
  testo: string;
  search?: { filtro: "tutti" };
}) {
  return (
    <Link
      to={to}
      {...(search ? { search } : {})}
      className="card-surface flex flex-col gap-0.5 px-4 py-3 hover:border-accent"
    >
      <span className="font-semibold">{titolo}</span>
      <span className="text-sm text-muted-foreground">{testo}</span>
    </Link>
  );
}
