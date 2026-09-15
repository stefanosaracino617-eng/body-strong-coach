import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CampoData } from "@/components/CampoData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Accedi | Body Strong Fitness Club" },
      {
        name: "description",
        content:
          "Accedi o registrati per consultare la tua scheda di allenamento della palestra Body Strong Fitness Club.",
      },
      { property: "og:title", content: "Accedi | Body Strong Fitness Club" },
      {
        property: "og:description",
        content: "Accedi o registrati alla palestra Body Strong Fitness Club.",
      },
    ],
  }),
  component: PaginaAccesso,
});

type Modalita = "accesso" | "registrazione";

function PaginaAccesso() {
  const navigate = useNavigate();
  const [modalita, setModalita] = useState<Modalita>("accesso");
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dataNascita, setDataNascita] = useState("");
  const [sesso, setSesso] = useState("");
  const [consenso, setConsenso] = useState(false);
  const [consensoAvvertenze, setConsensoAvvertenze] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/area", replace: true });
    });
  }, [navigate]);

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setMessaggio(null);

    if (modalita === "registrazione" && !consenso) {
      setErrore("Devi accettare l'informativa sulla privacy per registrarti.");
      return;
    }

    if (modalita === "registrazione" && !consensoAvvertenze) {
      setErrore("Devi confermare di aver letto le avvertenze e di avere il certificato medico.");
      return;
    }

    setCaricamento(true);
    try {
      if (modalita === "accesso") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/area", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              nome,
              cognome,
              telefono,
              data_nascita: dataNascita,
              sesso,
              consenso_privacy: true,
              consenso_avvertenze: true,
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/area", replace: true });
        } else {
          setMessaggio(
            "Registrazione inviata. Controlla la tua email per confermare l'indirizzo, poi attendi l'approvazione del gestore.",
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Si è verificato un errore.";
      setErrore(
        msg.includes("Invalid login credentials")
          ? "Email o password non corretti."
          : msg.includes("already registered")
            ? "Esiste già un account con questa email."
            : msg,
      );
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-2xl leading-tight">BODY STRONG</h1>
          <p className="mt-2 text-base text-muted-foreground">Fitness Club</p>
        </header>

        <div className="card-surface p-6">
          <div className="mb-6 flex gap-2">
            {(["accesso", "registrazione"] as Modalita[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setModalita(m);
                  setErrore(null);
                  setMessaggio(null);
                }}
                className={
                  modalita === m
                    ? "btn-primary flex-1"
                    : "btn-secondary flex-1 text-muted-foreground"
                }
              >
                {m === "accesso" ? "Accedi" : "Registrati"}
              </button>
            ))}
          </div>

          <form onSubmit={invia} className="flex flex-col gap-4">
            {modalita === "registrazione" && (
              <>
                <Campo label="Nome" value={nome} onChange={setNome} required />
                <Campo label="Cognome" value={cognome} onChange={setCognome} required />
                <Campo label="Telefono" value={telefono} onChange={setTelefono} type="tel" />
                <CampoData
                  label="Data di nascita"
                  value={dataNascita}
                  onChange={setDataNascita}
                />
                <label className="flex flex-col gap-2">
                  <span className="text-base font-semibold text-accent">Sesso</span>
                  <select
                    className="field"
                    value={sesso}
                    onChange={(e) => setSesso(e.target.value)}
                  >
                    <option value="">Preferisco non indicarlo</option>
                    <option value="maschio">Maschio</option>
                    <option value="femmina">Femmina</option>
                    <option value="altro">Altro</option>
                  </select>
                </label>
              </>
            )}

            <Campo label="Email" value={email} onChange={setEmail} type="email" required />
            <Campo
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              required
            />

            {modalita === "registrazione" && (
              <label className="flex items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={consenso}
                  onChange={(e) => setConsenso(e.target.checked)}
                  className="mt-1 size-6 shrink-0 rounded-[6px] accent-[#1080CC]"
                />
                <span className="text-base text-muted-foreground">
                  Ho letto e accetto l&apos;informativa sulla privacy e il trattamento dei miei dati
                  personali. <span className="text-destructive">*</span>
                </span>
              </label>
            )}

            {modalita === "registrazione" && (
              <label className="flex items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={consensoAvvertenze}
                  onChange={(e) => setConsensoAvvertenze(e.target.checked)}
                  className="mt-1 size-6 shrink-0 rounded-[6px] accent-[#1080CC]"
                />
                <span className="text-base text-muted-foreground">
                  Dichiaro di aver letto le{" "}
                  <Link to="/avvertenze" className="text-accent underline">
                    avvertenze
                  </Link>{" "}
                  e di essere in possesso di certificato medico per attività sportiva non agonistica
                  in corso di validità. <span className="text-destructive">*</span>
                </span>
              </label>
            )}

            {errore && (
              <p className="rounded-[10px] border border-destructive px-3 py-3 text-base text-destructive">
                {errore}
              </p>
            )}
            {messaggio && (
              <p className="rounded-[10px] border border-[#2FBF71] px-3 py-3 text-base text-success">
                {messaggio}
              </p>
            )}

            <button type="submit" className="btn-primary mt-2" disabled={caricamento}>
              {caricamento
                ? "Attendi…"
                : modalita === "accesso"
                  ? "Accedi"
                  : "Crea il mio account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-base text-muted-foreground">
          Dopo la registrazione il gestore deve approvare il tuo account.
        </p>
      </div>
    </main>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-base font-semibold text-accent">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <input
        className="field"
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
