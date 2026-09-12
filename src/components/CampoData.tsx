import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  aIso,
  dataAIso,
  formattaData,
  isoAData,
  localeIt,
  mascheraData,
  PRIMO_GIORNO_SETTIMANA,
} from "@/lib/date";

type Props = {
  label: string;
  /** valore in formato ISO aaaa-mm-gg (o stringa vuota) */
  value: string;
  onChange: (isoOppureVuoto: string) => void;
  required?: boolean;
};

/**
 * Campo data unico dell'app: si digita e si legge sempre in gg/mm/aaaa,
 * il valore restituito è in formato ISO per il database.
 */
export function CampoData({ label, value, onChange, required }: Props) {
  const [testo, setTesto] = useState(value ? formattaData(value) : "");
  const [aperto, setAperto] = useState(false);
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    setTesto(value ? formattaData(value) : "");
  }, [value]);

  function scriviTesto(v: string) {
    const mascherato = mascheraData(v);
    setTesto(mascherato);
    if (mascherato === "") {
      setErrore(false);
      onChange("");
      return;
    }
    const iso = aIso(mascherato);
    if (iso) {
      setErrore(false);
      onChange(iso);
    } else {
      setErrore(mascherato.length === 10);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-base font-semibold text-accent">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <div className="relative">
        <input
          className="field pr-12"
          inputMode="numeric"
          placeholder="gg/mm/aaaa"
          value={testo}
          required={required}
          aria-label={label}
          onChange={(e) => scriviTesto(e.target.value)}
        />
        <Popover open={aperto} onOpenChange={setAperto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Apri calendario"
              className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-[10px] text-accent"
            >
              <CalendarIcon className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto border-border bg-card p-0" align="end">
            <Calendar
              mode="single"
              locale={localeIt}
              weekStartsOn={PRIMO_GIORNO_SETTIMANA}
              captionLayout="dropdown"
              startMonth={new Date(1930, 0)}
              endMonth={new Date(new Date().getFullYear(), 11)}
              defaultMonth={isoAData(value) ?? new Date(1995, 0)}
              selected={isoAData(value)}
              onSelect={(d) => {
                if (d) {
                  onChange(dataAIso(d));
                  setErrore(false);
                  setAperto(false);
                }
              }}
              className="pointer-events-auto bg-card p-3"
            />
          </PopoverContent>
        </Popover>
      </div>
      {errore && <span className="text-base text-destructive">Data non valida (gg/mm/aaaa).</span>}
    </div>
  );
}
