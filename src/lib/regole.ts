import { supabase } from "@/integrations/supabase/client";

export type RegolePalestra = {
  id: string;
  contenuto: string;
  updated_at: string;
};

/** Testo delle regole della palestra: una sola riga in tutta l'app. */
export async function caricaRegole(): Promise<RegolePalestra | null> {
  const { data, error } = await supabase
    .from("regole_palestra")
    .select("id, contenuto, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as RegolePalestra | null) ?? null;
}

export async function salvaRegole(id: string | null, contenuto: string): Promise<void> {
  if (id) {
    const { error } = await supabase
      .from("regole_palestra")
      .update({ contenuto })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("regole_palestra").insert({ contenuto });
  if (error) throw error;
}

/** Vero se il gestore ha scritto qualcosa di visibile. */
export function regoleNonVuote(contenuto: string | null | undefined): boolean {
  if (!contenuto) return false;
  return contenuto.replace(/<[^>]*>/g, "").trim().length > 0;
}

const TAG_AMMESSI = new Set(["P", "BR", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "DIV"]);

/**
 * Tiene solo grassetto, corsivo, elenchi e paragrafi: tutto il resto viene
 * scartato prima di essere mostrato o salvato.
 */
export function ripuliscHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const contenitore = document.createElement("div");
  contenitore.innerHTML = html;

  const visita = (nodo: Element) => {
    for (const figlio of Array.from(nodo.children)) {
      visita(figlio);
      if (!TAG_AMMESSI.has(figlio.tagName)) {
        figlio.replaceWith(...Array.from(figlio.childNodes));
        continue;
      }
      for (const attributo of Array.from(figlio.attributes)) {
        figlio.removeAttribute(attributo.name);
      }
    }
  };
  visita(contenitore);
  return contenitore.innerHTML;
}
