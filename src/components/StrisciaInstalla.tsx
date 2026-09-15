import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const CHIAVE = "striscia-installa-chiusa";

/** Invito discreto a installare l'app: una volta chiuso non ricompare. */
export function StrisciaInstalla() {
  const [visibile, setVisibile] = useState(false);

  useEffect(() => {
    const giaChiusa = window.localStorage.getItem(CHIAVE) === "1";
    const installata = window.matchMedia("(display-mode: standalone)").matches;
    setVisibile(!giaChiusa && !installata);
  }, []);

  if (!visibile) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 py-3">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        <Link to="/installa" className="flex-1 text-base text-accent underline">
          Aggiungi Body Strong alla schermata del telefono
        </Link>
        <button
          type="button"
          aria-label="Chiudi l'invito"
          className="shrink-0 rounded-[10px] p-2 text-muted-foreground"
          onClick={() => {
            window.localStorage.setItem(CHIAVE, "1");
            setVisibile(false);
          }}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
