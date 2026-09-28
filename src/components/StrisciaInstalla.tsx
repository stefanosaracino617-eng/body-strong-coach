import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useInstallazioneApp } from "@/lib/prompt-installa";

const CHIAVE = "striscia-installa-chiusa";

/** Invito discreto a installare l'app: una volta chiuso non ricompare. */
export function StrisciaInstalla() {
  const { disponibile, installata, chiediInstallazione } = useInstallazioneApp();
  const [chiusa, setChiusa] = useState(true);

  useEffect(() => {
    setChiusa(window.localStorage.getItem(CHIAVE) === "1");
  }, []);

  if (chiusa || installata) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-card px-4 py-3 lg:bottom-0">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        {disponibile ? (
          <button
            type="button"
            className="flex-1 text-left text-base text-accent underline"
            onClick={() => void chiediInstallazione()}
          >
            Installa Body Strong sul computer
          </button>
        ) : (
          <Link to="/installa" className="flex-1 text-base text-accent underline">
            Installa Body Strong sul computer o sul telefono
          </Link>
        )}
        <button
          type="button"
          aria-label="Chiudi l'invito"
          className="shrink-0 rounded-[10px] p-2 text-muted-foreground"
          onClick={() => {
            window.localStorage.setItem(CHIAVE, "1");
            setChiusa(true);
          }}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
