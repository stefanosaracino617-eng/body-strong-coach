import { useEffect, useState } from "react";

/**
 * Se il telefono perde la connessione mostra una pagina dedicata:
 * i dati di schede e allenamenti non vengono mai tenuti in copia locale.
 */
export function SenzaConnessione() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const aggiorna = () => setOffline(!navigator.onLine);
    aggiorna();
    window.addEventListener("online", aggiorna);
    window.addEventListener("offline", aggiorna);
    return () => {
      window.removeEventListener("online", aggiorna);
      window.removeEventListener("offline", aggiorna);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-6 text-center">
      <p className="text-xl">Sei senza connessione. Riprova quando torni online.</p>
    </div>
  );
}
