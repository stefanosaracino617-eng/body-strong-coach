/**
 * Stati comuni di caricamento, errore ed elenco vuoto.
 * Regola: mai una pagina bianca, mai un messaggio tecnico in inglese.
 */

/** Segnaposto grigio della stessa forma del contenuto in arrivo. */
export function Segnaposto({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[10px] bg-muted-foreground/20 ${className}`} />;
}

/** Gruppo di card segnaposto. */
export function CaricamentoCard({ quante = 3 }: { quante?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: quante }).map((_, i) => (
        <div key={i} className="card-surface flex flex-col gap-3 p-6">
          <Segnaposto className="h-5 w-1/2" />
          <Segnaposto className="h-4 w-3/4" />
          <Segnaposto className="h-4 w-2/5" />
        </div>
      ))}
    </div>
  );
}

/** Segnaposto dei riquadri della dashboard. */
export function CaricamentoRiquadri({ quanti = 6 }: { quanti?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3" aria-hidden="true">
      {Array.from({ length: quanti }).map((_, i) => (
        <div key={i} className="card-surface flex flex-col gap-3 p-5">
          <Segnaposto className="h-8 w-12" />
          <Segnaposto className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Riquadro di errore con possibilità di ritentare. */
export function BloccoErrore({ onRiprova }: { onRiprova: () => void }) {
  return (
    <div className="card-surface flex flex-col gap-3 border-destructive p-6" role="alert">
      <p className="text-base text-destructive">
        Non riesco a caricare i dati. Controlla la connessione.
      </p>
      <button type="button" className="btn-primary" onClick={onRiprova}>
        Riprova
      </button>
    </div>
  );
}

/** Messaggio per un elenco vuoto. */
export function StatoVuoto({ testo }: { testo: string }) {
  return <div className="card-surface p-6 text-base text-muted-foreground">{testo}</div>;
}
