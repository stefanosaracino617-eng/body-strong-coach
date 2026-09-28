import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  CreditCard,
  Download,
  Dumbbell,
  History,
  House,
  KeyRound,
  LayoutDashboard,
  Library,
  LogOut,
  ScrollText,
  Shield,
  Smartphone,
  Target,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { esciFn } from "@/lib/fn";
import type { SessioneApp } from "@/lib/profilo";

type Voce = {
  to: string;
  label: string;
  icona: typeof House;
  search?: { filtro: "tutti" };
  esatto?: boolean;
};

const VOCI_GESTORE: Voce[] = [
  { to: "/area", label: "Panoramica", icona: LayoutDashboard, esatto: true },
  { to: "/clienti", label: "Clienti", icona: Users, search: { filtro: "tutti" } },
  { to: "/registrazioni", label: "Registrazioni", icona: ClipboardList },
  { to: "/certificati", label: "Certificati", icona: Shield },
  { to: "/abbonamenti", label: "Abbonamenti", icona: CreditCard },
  { to: "/allenamenti-recenti", label: "Allenamenti", icona: Dumbbell },
  { to: "/esercizi", label: "Esercizi", icona: Library },
  { to: "/catalogo-obiettivi", label: "Obiettivi", icona: Target },
  { to: "/accessi", label: "Ruoli", icona: KeyRound },
  { to: "/regole", label: "Regole", icona: ScrollText },
  { to: "/esporta", label: "Esporta", icona: Download },
  { to: "/installa", label: "Installa", icona: Smartphone },
];

const VOCI_CLIENTE: Voce[] = [
  { to: "/area", label: "Home", icona: House, esatto: true },
  { to: "/storico", label: "Storico", icona: History },
  { to: "/obiettivi", label: "Obiettivi", icona: Target },
  { to: "/regole", label: "Regole", icona: ScrollText },
  { to: "/avvertenze", label: "Avvertenze", icona: TriangleAlert },
];

function voceAttiva(voce: Voce, pathname: string): boolean {
  if (voce.esatto) return pathname === voce.to;
  return pathname === voce.to || pathname.startsWith(`${voce.to}/`);
}

function Elenco({ voci, pathname, compatto = false }: { voci: Voce[]; pathname: string; compatto?: boolean }) {
  return (
    <>
      {voci.map((voce) => {
        const attiva = voceAttiva(voce, pathname);
        const Icona = voce.icona;
        return (
          <Link
            key={voce.to}
            to={voce.to}
            {...(voce.search ? { search: voce.search } : {})}
            className={
              compatto
                ? `flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-center text-[11px] font-semibold leading-tight ${
                    attiva ? "text-accent" : "text-muted-foreground"
                  }`
                : `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                    attiva ? "bg-primary text-white" : "text-muted-foreground hover:bg-card"
                  }`
            }
          >
            <Icona className={compatto ? "size-5" : "size-4"} aria-hidden="true" />
            {voce.label}
          </Link>
        );
      })}
    </>
  );
}

export function GuscioApp({ sessione, children }: { sessione: SessioneApp; children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (stato) => stato.location.pathname });
  const voci = sessione.isGestore ? VOCI_GESTORE : VOCI_CLIENTE;
  const vociMobile = sessione.isGestore
    ? VOCI_GESTORE.slice(0, 4)
    : VOCI_CLIENTE.slice(0, 3);

  async function esci() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await esciFn();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="guscio min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-[#002844] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:p-4">
        <div className="px-3 pb-4 pt-2">
          <p className="font-display text-lg font-bold tracking-wide">BODY STRONG</p>
          <p className="text-sm text-muted-foreground">
            {sessione.isGestore ? "Gestionale" : "La mia area"}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <Elenco voci={voci} pathname={pathname} />
        </nav>
        <button type="button" className="btn-secondary mt-4 w-full" onClick={esci}>
          Esci
        </button>
      </aside>

      <div className="min-w-0 [&_main]:pb-24 lg:[&_main]:pb-8">
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-[#002844] px-1 py-1 lg:hidden">
        <Elenco voci={vociMobile} pathname={pathname} compatto />
        <button
          type="button"
          className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-center text-[11px] font-semibold leading-tight text-muted-foreground"
          onClick={esci}
        >
          <LogOut className="size-5" aria-hidden="true" />
          Esci
        </button>
      </nav>
    </div>
  );
}
