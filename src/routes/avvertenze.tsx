import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/avvertenze")({
  head: () => ({
    meta: [
      { title: "Avvertenze | Body Strong Fitness Club" },
      {
        name: "description",
        content:
          "Avvertenze sull'attività fisica e sul certificato medico per i soci del Body Strong Fitness Club.",
      },
      { property: "og:title", content: "Avvertenze | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Avvertenze sull'attività fisica e sul certificato medico non agonistico.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Avvertenze,
});

function Avvertenze() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl">Avvertenze</h1>
        <div className="card-surface flex flex-col gap-4 p-6 text-lg leading-relaxed">
          <p>
            I programmi di allenamento proposti in questa applicazione sono predisposti
            dall&apos;istruttore sulla base degli obiettivi dichiarati e non costituiscono
            prescrizione medica né consulenza sanitaria.
          </p>
          <p>
            L&apos;iscrizione alla palestra e lo svolgimento dell&apos;attività richiedono il
            certificato medico per attività sportiva non agonistica in corso di validità, che deve
            essere consegnato alla palestra.
          </p>
          <p>
            In caso di dolore, malessere o condizioni di salute particolari, interrompere
            l&apos;allenamento e rivolgersi al proprio medico prima di riprendere.
          </p>
        </div>
        <Link to="/" className="btn-secondary w-full text-center">
          Torna indietro
        </Link>
      </div>
    </main>
  );
}
