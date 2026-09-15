import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Bold, List } from "lucide-react";
import { caricaSessioneApp } from "@/lib/profilo";
import { caricaRegole, regoleNonVuote, ripuliscHtml, salvaRegole } from "@/lib/regole";
import { formattaData } from "@/lib/date";
import { avvisoErrore, avvisoOk, testoErrore } from "@/lib/avvisi";
import { BloccoErrore, CaricamentoCard, StatoVuoto } from "@/components/Stati";

export const Route = createFileRoute("/_authenticated/regole")({
  head: () => ({
    meta: [
      { title: "Regole della palestra | Body Strong Fitness Club" },
      {
        name: "description",
        content: "Regole della palestra Body Strong Fitness Club, aggiornate dal gestore.",
      },
      { property: "og:title", content: "Regole della palestra | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Regole della palestra Body Strong Fitness Club.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Regole,
});

function Regole() {
  const queryClient = useQueryClient();
  const sessione = useQuery({ queryKey: ["sessione-app"], queryFn: caricaSessioneApp });
  const regole = useQuery({ queryKey: ["regole-palestra"], queryFn: caricaRegole });
  const [modifica, setModifica] = useState(false);
  const [salvataggio, setSalvataggio] = useState(false);
  const editor = useRef<HTMLDivElement | null>(null);

  const isGestore = sessione.data?.isGestore === true;
  const contenuto = regole.data?.contenuto ?? "";

  useEffect(() => {
    if (modifica && editor.current) editor.current.innerHTML = contenuto || "<p></p>";
  }, [modifica, contenuto]);

  async function salva() {
    if (!editor.current) return;
    setSalvataggio(true);
    try {
      const html = ripuliscHtml(editor.current.innerHTML);
      await salvaRegole(regole.data?.id ?? null, html);
      await queryClient.invalidateQueries({ queryKey: ["regole-palestra"] });
      setModifica(false);
      avvisoOk("Regole della palestra salvate.");
    } catch (e) {
      avvisoErrore(testoErrore(e, "Non riesco a salvare le regole."));
    } finally {
      setSalvataggio(false);
    }
  }

  function comando(nome: "bold" | "insertUnorderedList") {
    editor.current?.focus();
    document.execCommand(nome);
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl">Regole della palestra</h1>

        {(regole.isLoading || sessione.isLoading) && <CaricamentoCard quante={1} />}
        {regole.isError && <BloccoErrore onRiprova={() => regole.refetch()} />}

        {!regole.isLoading && !regole.isError && !modifica && (
          <>
            {regoleNonVuote(contenuto) ? (
              <div className="card-surface p-6">
                <div
                  className="testo-regole text-lg leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: ripuliscHtml(contenuto) }}
                />
                <p className="mt-6 border-t border-border pt-4 text-base text-muted-foreground">
                  Ultimo aggiornamento: {formattaData(regole.data?.updated_at?.slice(0, 10) ?? null)}
                </p>
              </div>
            ) : (
              <StatoVuoto
                testo={
                  isGestore
                    ? "Non hai ancora scritto le regole della palestra."
                    : "Le regole della palestra non sono ancora disponibili."
                }
              />
            )}
            {isGestore && (
              <button type="button" className="btn-primary" onClick={() => setModifica(true)}>
                Modifica le regole
              </button>
            )}
          </>
        )}

        {modifica && isGestore && (
          <div className="card-surface flex flex-col gap-4 p-6">
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary flex items-center gap-2"
                onClick={() => comando("bold")}
              >
                <Bold className="h-5 w-5" aria-hidden="true" /> Grassetto
              </button>
              <button
                type="button"
                className="btn-secondary flex items-center gap-2"
                onClick={() => comando("insertUnorderedList")}
              >
                <List className="h-5 w-5" aria-hidden="true" /> Elenco
              </button>
            </div>
            <div
              ref={editor}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Testo delle regole"
              className="testo-regole field min-h-60 whitespace-pre-wrap text-lg leading-relaxed"
            />
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1" disabled={salvataggio} onClick={salva}>
                {salvataggio ? "Attendi…" : "Salva"}
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setModifica(false)}>
                Annulla
              </button>
            </div>
          </div>
        )}

        <Link to="/area" className="btn-secondary w-full text-center">
          Torna alla mia area
        </Link>
      </div>
    </main>
  );
}
