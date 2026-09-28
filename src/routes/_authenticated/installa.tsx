import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/installa")({
  head: () => ({
    meta: [
      { title: "Installa l'app | Body Strong Fitness Club" },
      {
        name: "description",
        content:
          "Come aggiungere Body Strong alla schermata home di Android e iPhone, senza passare dagli store.",
      },
      { property: "og:title", content: "Installa l'app | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Istruzioni per aggiungere Body Strong alla schermata del telefono.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Installa,
});

function Installa() {
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
