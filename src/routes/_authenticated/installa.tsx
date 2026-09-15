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
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl">Installa l&apos;app</h1>

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

        <Link to="/area" className="btn-secondary w-full text-center">
          Torna alla mia area
        </Link>
      </div>
    </main>
  );
}
