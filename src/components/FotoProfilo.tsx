import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { fileToBase64 } from "@/lib/esercizi";
import { rimuoviFotoProfiloFn, salvaFotoProfiloFn } from "@/lib/fn";
import { iniziali, urlMedia } from "@/lib/profilo";
import { avvisoErrore, avvisoOk, testoErrore } from "@/lib/avvisi";

const MISURE = {
  sm: "size-12 text-base",
  lg: "size-24 text-2xl",
} as const;

export function FotoProfilo({
  nome,
  cognome,
  fotoUrl,
  modificabile = false,
  misura = "lg",
}: {
  nome: string;
  cognome: string;
  fotoUrl: string | null;
  modificabile?: boolean;
  misura?: keyof typeof MISURE;
}) {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [caricamento, setCaricamento] = useState(false);
  const src = urlMedia(fotoUrl);

  async function aggiornaCache() {
    await queryClient.invalidateQueries({ queryKey: ["sessione-app"] });
    await queryClient.invalidateQueries({ queryKey: ["clienti-approvati"] });
    await queryClient.invalidateQueries({ queryKey: ["profili-approvati"] });
  }

  async function scegli(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      avvisoErrore("Usa una foto JPG, PNG o WebP.");
      return;
    }
    if (file.size > 2_500_000) {
      avvisoErrore("La foto deve pesare meno di 2,5 MB.");
      return;
    }
    setCaricamento(true);
    try {
      const payload = await fileToBase64(file);
      await salvaFotoProfiloFn({
        data: { contentType: payload.contentType, base64: payload.base64 },
      });
      await aggiornaCache();
      avvisoOk("Foto aggiornata.");
    } catch (err) {
      avvisoErrore(testoErrore(err, "Non è stato possibile salvare la foto."));
    } finally {
      setCaricamento(false);
      if (input.current) input.current.value = "";
    }
  }

  async function rimuovi() {
    setCaricamento(true);
    try {
      await rimuoviFotoProfiloFn();
      await aggiornaCache();
      avvisoOk("Foto rimossa.");
    } catch (err) {
      avvisoErrore(testoErrore(err, "Non è stato possibile rimuovere la foto."));
    } finally {
      setCaricamento(false);
    }
  }

  const ritratto = src ? (
    <img src={src} alt="" className={`${MISURE[misura]} rounded-full object-cover`} />
  ) : (
    <span
      className={`${MISURE[misura]} inline-flex items-center justify-center rounded-full bg-primary font-bold text-primary-foreground`}
      aria-hidden="true"
    >
      {iniziali(nome, cognome)}
    </span>
  );

  if (!modificabile) return <span className="inline-flex shrink-0">{ritratto}</span>;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        className="relative shrink-0 rounded-full"
        onClick={() => input.current?.click()}
        disabled={caricamento}
        aria-label="Carica o cambia la foto profilo"
      >
        {ritratto}
        <span className="absolute bottom-0 right-0 inline-flex size-8 items-center justify-center rounded-full border border-border bg-card text-accent">
          <Camera className="size-4" aria-hidden="true" />
        </span>
      </button>
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          className="text-base font-semibold text-accent"
          onClick={() => input.current?.click()}
          disabled={caricamento}
        >
          {caricamento ? "Salvataggio…" : fotoUrl ? "Cambia foto" : "Aggiungi foto"}
        </button>
        {fotoUrl && (
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={rimuovi}
            disabled={caricamento}
          >
            Rimuovi
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => scegli(e.target.files?.[0])}
      />
    </div>
  );
}
