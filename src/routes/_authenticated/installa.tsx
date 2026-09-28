import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useInstallazioneApp } from "@/lib/prompt-installa";

export const Route = createFileRoute("/_authenticated/installa")({
  head: () => ({
    meta: [
      { title: "Installa l'app | Body Strong Fitness Club" },
      {
        name: "description",
        content:
          "Installa Body Strong sul computer da Google Chrome, oppure aggiungila alla schermata home di Android e iPhone.",
      },
      { property: "og:title", content: "Installa l'app | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Installa Body Strong sul computer o sul telefono, senza passare dagli store.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Installa,
});

function Installa() {
  const { disponibile, installata, chiediInstallazione } = useInstallazioneApp();
  const [esito, setEsito] = useState<"accepted" | "dismissed" | null>(null);

  async function installa() {
    const scelta = await chiediInstallazione();
    if (scelta === "accepted" || scelta === "dismissed") setEsito(scelta);
  }

  return (
    <main className="pagina">
      <div className="pagina-contenuto">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl">Installa l&apos;app</h1>
          <Link to="/area" className="text-sm font-semibold text-accent">
            Torna all&apos;area
          </Link>
        </header>

        <div className="griglia-voci">
          <section className="card-surface flex flex-col gap-3 p-6">
            <h2 className="text-xl">Computer</h2>
            {installata || esito === "accepted" ? (
              <p className="text-lg leading-relaxed">
                Body Strong è installata. Si apre in una finestra propria, come un programma.
              </p>
            ) : (
              <>
                <p className="text-lg leading-relaxed">
                  Apri il sito in Google Chrome. L&apos;app si installa sul computer e si apre senza
                  la barra del browser.
                </p>
                {disponibile ? (
                  <button type="button" className="btn-primary" onClick={() => void installa()}>
                    Installa sul computer
                  </button>
                ) : (
                  <ol className="list-decimal space-y-2 pl-5 text-lg leading-relaxed">
                    <li>
                      Nella barra degli indirizzi, clicca l&apos;icona Installa (un monitor con una
                      freccia).
                    </li>
                    <li>
                      Se non la vedi, apri il menu ⋮ in alto a destra, poi Salva e condividi, e
                      scegli Installa Body Strong.
                    </li>
                  </ol>
                )}
                {esito === "dismissed" && (
                  <p className="text-base text-muted-foreground">
                    Installazione annullata. Puoi ripeterla dal menu di Chrome.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="card-surface flex flex-col gap-2 p-6">
            <h2 className="text-xl">Android</h2>
            <p className="text-lg leading-relaxed">
              Apri il menu del browser e tocca Installa app (oppure Aggiungi a schermata Home).
            </p>
          </section>

          <section className="card-surface flex flex-col gap-2 p-6">
            <h2 className="text-xl">iPhone</h2>
            <p className="text-lg leading-relaxed">
              Apri l&apos;app in Safari, tocca il pulsante Condividi in basso, poi Aggiungi alla
              schermata Home.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
