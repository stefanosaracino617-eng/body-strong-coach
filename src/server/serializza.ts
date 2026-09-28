export function isoData(valore: unknown): string | null {
  if (valore == null || valore === "") return null;
  if (valore instanceof Date) {
    if (Number.isNaN(valore.getTime())) return null;
    const y = valore.getUTCFullYear();
    const m = String(valore.getUTCMonth() + 1).padStart(2, "0");
    const d = String(valore.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const testo = String(valore);
  return testo.length >= 10 ? testo.slice(0, 10) : testo;
}

export function isoIstante(valore: unknown): string | null {
  if (valore == null || valore === "") return null;
  if (valore instanceof Date) return valore.toISOString();
  return String(valore);
}

export function testo(valore: unknown, predefinito = ""): string {
  return valore == null ? predefinito : String(valore);
}

export function booleano(valore: unknown, predefinito = false): boolean {
  if (valore == null) return predefinito;
  return Boolean(valore);
}

export function numeroONull(valore: unknown): number | null {
  if (valore == null || valore === "") return null;
  const n = Number(valore);
  return Number.isFinite(n) ? n : null;
}
