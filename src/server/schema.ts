export const SCHEMA_SQL = `
DO $$ BEGIN CREATE TYPE ruolo_app AS ENUM ('gestore', 'cliente'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE stato_profilo AS ENUM ('in_attesa', 'approvato', 'sospeso'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sesso_tipo AS ENUM ('maschio', 'femmina', 'altro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gruppo_muscolare AS ENUM ('cardio','pettorali','spalle e trapezio','bicipiti e brachiale','tricipiti','dorsali','gambe e glutei','polpacci','addominali'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_esercizio AS ENUM ('forza','cardio'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE unita_misura_esercizio AS ENUM ('serie_ripetizioni','minuti'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE stato_scheda AS ENUM ('attiva', 'archiviata'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS utenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profili (
  id uuid PRIMARY KEY REFERENCES utenti(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  cognome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telefono text,
  data_nascita date,
  sesso sesso_tipo,
  stato stato_profilo NOT NULL DEFAULT 'in_attesa',
  consenso_privacy boolean NOT NULL DEFAULT false,
  data_consenso timestamptz,
  note_gestore text,
  certificato_scadenza date,
  consenso_avvertenze boolean NOT NULL DEFAULT false,
  data_consenso_avvertenze timestamptz,
  tipo_abbonamento text,
  abbonamento_inizio date,
  abbonamento_scadenza date,
  data_approvazione timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ruoli_utente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  ruolo ruolo_app NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ruolo)
);

CREATE TABLE IF NOT EXISTS obiettivi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descrizione text,
  gruppo text NOT NULL DEFAULT 'generale',
  ordine integer NOT NULL DEFAULT 0,
  attivo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cliente_obiettivi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  obiettivo_id uuid NOT NULL REFERENCES obiettivi(id) ON DELETE CASCADE,
  data_selezione timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, obiettivo_id)
);

CREATE TABLE IF NOT EXISTS regole_palestra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contenuto text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esercizi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  gruppo_muscolare gruppo_muscolare NOT NULL,
  attrezzatura text,
  tipo tipo_esercizio NOT NULL DEFAULT 'forza',
  unita_misura unita_misura_esercizio NOT NULL DEFAULT 'serie_ripetizioni',
  descrizione_esecuzione text,
  errori_comuni text,
  immagine_url text,
  attivo boolean NOT NULL DEFAULT true,
  ordine integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT esercizi_ordine_unico UNIQUE (ordine)
);

CREATE TABLE IF NOT EXISTS schede (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  titolo text NOT NULL DEFAULT '',
  data_inizio date NOT NULL DEFAULT CURRENT_DATE,
  data_scadenza date NOT NULL,
  stato stato_scheda NOT NULL DEFAULT 'attiva',
  note_gestore text,
  archiviata_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS schede_una_attiva_per_cliente
  ON schede (cliente_id) WHERE stato = 'attiva';

CREATE TABLE IF NOT EXISTS scheda_esercizi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheda_id uuid NOT NULL REFERENCES schede(id) ON DELETE CASCADE,
  esercizio_id uuid REFERENCES esercizi(id) ON DELETE SET NULL,
  nome_libero text,
  descrizione_libera text,
  immagine_libera_url text,
  sessione text NOT NULL DEFAULT '',
  ordine integer NOT NULL DEFAULT 0,
  serie integer,
  ripetizioni text,
  durata_minuti integer,
  recupero_secondi integer,
  carico_indicativo text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS allenamenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  scheda_id uuid REFERENCES schede(id) ON DELETE SET NULL,
  sessione text NOT NULL DEFAULT '',
  data date NOT NULL DEFAULT CURRENT_DATE,
  completato_at timestamptz,
  note_cliente text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS allenamento_esercizi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allenamento_id uuid NOT NULL REFERENCES allenamenti(id) ON DELETE CASCADE,
  scheda_esercizio_id uuid REFERENCES scheda_esercizi(id) ON DELETE SET NULL,
  completato boolean NOT NULL DEFAULT false,
  peso_kg numeric,
  ripetizioni_effettive text,
  durata_minuti integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (allenamento_id, scheda_esercizio_id)
);

CREATE TABLE IF NOT EXISTS media (
  path text PRIMARY KEY,
  content_type text NOT NULL,
  bytes bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION aggiorna_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_obiettivi_updated_at ON obiettivi;
CREATE TRIGGER update_obiettivi_updated_at BEFORE UPDATE ON obiettivi
FOR EACH ROW EXECUTE FUNCTION aggiorna_updated_at();
DROP TRIGGER IF EXISTS update_regole_updated_at ON regole_palestra;
CREATE TRIGGER update_regole_updated_at BEFORE UPDATE ON regole_palestra
FOR EACH ROW EXECUTE FUNCTION aggiorna_updated_at();
DROP TRIGGER IF EXISTS update_esercizi_updated_at ON esercizi;
CREATE TRIGGER update_esercizi_updated_at BEFORE UPDATE ON esercizi
FOR EACH ROW EXECUTE FUNCTION aggiorna_updated_at();
DROP TRIGGER IF EXISTS update_schede_updated_at ON schede;
CREATE TRIGGER update_schede_updated_at BEFORE UPDATE ON schede
FOR EACH ROW EXECUTE FUNCTION aggiorna_updated_at();
DROP TRIGGER IF EXISTS update_scheda_esercizi_updated_at ON scheda_esercizi;
CREATE TRIGGER update_scheda_esercizi_updated_at BEFORE UPDATE ON scheda_esercizi
FOR EACH ROW EXECUTE FUNCTION aggiorna_updated_at();
DROP TRIGGER IF EXISTS update_allenamenti_updated_at ON allenamenti;
CREATE TRIGGER update_allenamenti_updated_at BEFORE UPDATE ON allenamenti
FOR EACH ROW EXECUTE FUNCTION aggiorna_updated_at();
DROP TRIGGER IF EXISTS update_allenamento_esercizi_updated_at ON allenamento_esercizi;
CREATE TRIGGER update_allenamento_esercizi_updated_at BEFORE UPDATE ON allenamento_esercizi
FOR EACH ROW EXECUTE FUNCTION aggiorna_updated_at();

CREATE OR REPLACE FUNCTION registra_data_approvazione()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stato = 'approvato'::stato_profilo
     AND OLD.stato IS DISTINCT FROM 'approvato'::stato_profilo
     AND NEW.data_approvazione IS NULL THEN
    NEW.data_approvazione := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registra_data_approvazione ON profili;
CREATE TRIGGER registra_data_approvazione BEFORE UPDATE ON profili
FOR EACH ROW EXECUTE FUNCTION registra_data_approvazione();

CREATE OR REPLACE FUNCTION archivia_schede_precedenti()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stato = 'attiva'::stato_scheda THEN
    UPDATE schede
       SET stato = 'archiviata'::stato_scheda,
           archiviata_at = now()
     WHERE cliente_id = NEW.cliente_id
       AND stato = 'attiva'::stato_scheda
       AND id IS DISTINCT FROM NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS archivia_schede_precedenti_ins ON schede;
CREATE TRIGGER archivia_schede_precedenti_ins
BEFORE INSERT ON schede
FOR EACH ROW EXECUTE FUNCTION archivia_schede_precedenti();

DROP TRIGGER IF EXISTS archivia_schede_precedenti_upd ON schede;
CREATE TRIGGER archivia_schede_precedenti_upd
BEFORE UPDATE OF stato ON schede
FOR EACH ROW
WHEN (NEW.stato = 'attiva'::stato_scheda AND OLD.stato IS DISTINCT FROM NEW.stato)
EXECUTE FUNCTION archivia_schede_precedenti();

CREATE INDEX IF NOT EXISTS ruoli_utente_ruolo_idx ON ruoli_utente (ruolo);
CREATE INDEX IF NOT EXISTS profili_stato_idx ON profili (stato);
CREATE INDEX IF NOT EXISTS schede_cliente_idx ON schede (cliente_id);
CREATE INDEX IF NOT EXISTS scheda_esercizi_scheda_idx ON scheda_esercizi (scheda_id, ordine);
CREATE INDEX IF NOT EXISTS allenamenti_cliente_idx ON allenamenti (cliente_id, data);
CREATE INDEX IF NOT EXISTS cliente_obiettivi_cliente_idx ON cliente_obiettivi (cliente_id);

INSERT INTO obiettivi (nome, descrizione, gruppo, ordine) VALUES
  ('Aumento massa muscolare', 'Crescita del volume muscolare complessivo', 'generale', 10),
  ('Forza', 'Incremento della forza massimale', 'generale', 20),
  ('Definizione', 'Riduzione del grasso mantenendo la massa muscolare', 'generale', 30),
  ('Dimagrimento', 'Perdita di peso e riduzione del grasso corporeo', 'generale', 40),
  ('Tonificazione generale', 'Tono muscolare e benessere generale', 'generale', 50),
  ('Pettorali', 'Sviluppo dei muscoli pettorali', 'zona', 60),
  ('Dorsali', 'Sviluppo della schiena', 'zona', 70),
  ('Spalle', 'Sviluppo di spalle e trapezio', 'zona', 80),
  ('Braccia', 'Sviluppo di bicipiti e tricipiti', 'zona', 90),
  ('Gambe e glutei', 'Sviluppo di gambe e glutei', 'zona', 100),
  ('Addominali', 'Rinforzo della fascia addominale', 'zona', 110),
  ('Postura e mobilita', 'Miglioramento di postura e mobilita articolare', 'benessere', 120)
ON CONFLICT (nome) DO NOTHING;
`.trim();
