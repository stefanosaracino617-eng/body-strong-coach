export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      allenamenti: {
        Row: {
          cliente_id: string
          completato_at: string | null
          created_at: string
          data: string
          id: string
          note_cliente: string | null
          scheda_id: string | null
          sessione: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          completato_at?: string | null
          created_at?: string
          data?: string
          id?: string
          note_cliente?: string | null
          scheda_id?: string | null
          sessione?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          completato_at?: string | null
          created_at?: string
          data?: string
          id?: string
          note_cliente?: string | null
          scheda_id?: string | null
          sessione?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allenamenti_scheda_id_fkey"
            columns: ["scheda_id"]
            isOneToOne: false
            referencedRelation: "schede"
            referencedColumns: ["id"]
          },
        ]
      }
      allenamento_esercizi: {
        Row: {
          allenamento_id: string
          completato: boolean
          created_at: string
          durata_minuti: number | null
          id: string
          note: string | null
          peso_kg: number | null
          ripetizioni_effettive: string | null
          scheda_esercizio_id: string | null
          updated_at: string
        }
        Insert: {
          allenamento_id: string
          completato?: boolean
          created_at?: string
          durata_minuti?: number | null
          id?: string
          note?: string | null
          peso_kg?: number | null
          ripetizioni_effettive?: string | null
          scheda_esercizio_id?: string | null
          updated_at?: string
        }
        Update: {
          allenamento_id?: string
          completato?: boolean
          created_at?: string
          durata_minuti?: number | null
          id?: string
          note?: string | null
          peso_kg?: number | null
          ripetizioni_effettive?: string | null
          scheda_esercizio_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allenamento_esercizi_allenamento_id_fkey"
            columns: ["allenamento_id"]
            isOneToOne: false
            referencedRelation: "allenamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allenamento_esercizi_scheda_esercizio_id_fkey"
            columns: ["scheda_esercizio_id"]
            isOneToOne: false
            referencedRelation: "scheda_esercizi"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_obiettivi: {
        Row: {
          cliente_id: string
          created_at: string
          data_selezione: string
          id: string
          obiettivo_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_selezione?: string
          id?: string
          obiettivo_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_selezione?: string
          id?: string
          obiettivo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_obiettivi_obiettivo_id_fkey"
            columns: ["obiettivo_id"]
            isOneToOne: false
            referencedRelation: "obiettivi"
            referencedColumns: ["id"]
          },
        ]
      }
      esercizi: {
        Row: {
          attivo: boolean
          attrezzatura: string | null
          created_at: string
          descrizione_esecuzione: string | null
          errori_comuni: string | null
          gruppo_muscolare: Database["public"]["Enums"]["gruppo_muscolare"]
          id: string
          immagine_url: string | null
          nome: string
          ordine: number
          tipo: Database["public"]["Enums"]["tipo_esercizio"]
          unita_misura: Database["public"]["Enums"]["unita_misura_esercizio"]
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          attrezzatura?: string | null
          created_at?: string
          descrizione_esecuzione?: string | null
          errori_comuni?: string | null
          gruppo_muscolare: Database["public"]["Enums"]["gruppo_muscolare"]
          id?: string
          immagine_url?: string | null
          nome: string
          ordine: number
          tipo?: Database["public"]["Enums"]["tipo_esercizio"]
          unita_misura?: Database["public"]["Enums"]["unita_misura_esercizio"]
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          attrezzatura?: string | null
          created_at?: string
          descrizione_esecuzione?: string | null
          errori_comuni?: string | null
          gruppo_muscolare?: Database["public"]["Enums"]["gruppo_muscolare"]
          id?: string
          immagine_url?: string | null
          nome?: string
          ordine?: number
          tipo?: Database["public"]["Enums"]["tipo_esercizio"]
          unita_misura?: Database["public"]["Enums"]["unita_misura_esercizio"]
          updated_at?: string
        }
        Relationships: []
      }
      obiettivi: {
        Row: {
          attivo: boolean
          created_at: string
          descrizione: string | null
          gruppo: string
          id: string
          nome: string
          ordine: number
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          gruppo?: string
          id?: string
          nome: string
          ordine?: number
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          gruppo?: string
          id?: string
          nome?: string
          ordine?: number
          updated_at?: string
        }
        Relationships: []
      }
      profili: {
        Row: {
          cognome: string
          consenso_privacy: boolean
          created_at: string
          data_consenso: string | null
          data_nascita: string | null
          email: string
          id: string
          nome: string
          note_gestore: string | null
          sesso: Database["public"]["Enums"]["sesso_tipo"] | null
          stato: Database["public"]["Enums"]["stato_profilo"]
          telefono: string | null
        }
        Insert: {
          cognome?: string
          consenso_privacy?: boolean
          created_at?: string
          data_consenso?: string | null
          data_nascita?: string | null
          email?: string
          id: string
          nome?: string
          note_gestore?: string | null
          sesso?: Database["public"]["Enums"]["sesso_tipo"] | null
          stato?: Database["public"]["Enums"]["stato_profilo"]
          telefono?: string | null
        }
        Update: {
          cognome?: string
          consenso_privacy?: boolean
          created_at?: string
          data_consenso?: string | null
          data_nascita?: string | null
          email?: string
          id?: string
          nome?: string
          note_gestore?: string | null
          sesso?: Database["public"]["Enums"]["sesso_tipo"] | null
          stato?: Database["public"]["Enums"]["stato_profilo"]
          telefono?: string | null
        }
        Relationships: []
      }
      ruoli_utente: {
        Row: {
          created_at: string
          id: string
          ruolo: Database["public"]["Enums"]["ruolo_app"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ruolo: Database["public"]["Enums"]["ruolo_app"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ruolo?: Database["public"]["Enums"]["ruolo_app"]
          user_id?: string
        }
        Relationships: []
      }
      scheda_esercizi: {
        Row: {
          carico_indicativo: string | null
          created_at: string
          descrizione_libera: string | null
          durata_minuti: number | null
          esercizio_id: string | null
          id: string
          immagine_libera_url: string | null
          nome_libero: string | null
          note: string | null
          ordine: number
          recupero_secondi: number | null
          ripetizioni: string | null
          scheda_id: string
          serie: number | null
          sessione: string
          updated_at: string
        }
        Insert: {
          carico_indicativo?: string | null
          created_at?: string
          descrizione_libera?: string | null
          durata_minuti?: number | null
          esercizio_id?: string | null
          id?: string
          immagine_libera_url?: string | null
          nome_libero?: string | null
          note?: string | null
          ordine?: number
          recupero_secondi?: number | null
          ripetizioni?: string | null
          scheda_id: string
          serie?: number | null
          sessione?: string
          updated_at?: string
        }
        Update: {
          carico_indicativo?: string | null
          created_at?: string
          descrizione_libera?: string | null
          durata_minuti?: number | null
          esercizio_id?: string | null
          id?: string
          immagine_libera_url?: string | null
          nome_libero?: string | null
          note?: string | null
          ordine?: number
          recupero_secondi?: number | null
          ripetizioni?: string | null
          scheda_id?: string
          serie?: number | null
          sessione?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheda_esercizi_esercizio_id_fkey"
            columns: ["esercizio_id"]
            isOneToOne: false
            referencedRelation: "esercizi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheda_esercizi_scheda_id_fkey"
            columns: ["scheda_id"]
            isOneToOne: false
            referencedRelation: "schede"
            referencedColumns: ["id"]
          },
        ]
      }
      schede: {
        Row: {
          archiviata_at: string | null
          cliente_id: string
          created_at: string
          data_inizio: string
          data_scadenza: string
          id: string
          note_gestore: string | null
          stato: Database["public"]["Enums"]["stato_scheda"]
          titolo: string
          updated_at: string
        }
        Insert: {
          archiviata_at?: string | null
          cliente_id: string
          created_at?: string
          data_inizio?: string
          data_scadenza: string
          id?: string
          note_gestore?: string | null
          stato?: Database["public"]["Enums"]["stato_scheda"]
          titolo?: string
          updated_at?: string
        }
        Update: {
          archiviata_at?: string | null
          cliente_id?: string
          created_at?: string
          data_inizio?: string
          data_scadenza?: string
          id?: string
          note_gestore?: string | null
          stato?: Database["public"]["Enums"]["stato_scheda"]
          titolo?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      gruppo_muscolare:
        | "cardio"
        | "pettorali"
        | "spalle e trapezio"
        | "bicipiti e brachiale"
        | "tricipiti"
        | "dorsali"
        | "gambe e glutei"
        | "polpacci"
        | "addominali"
      ruolo_app: "gestore" | "cliente"
      sesso_tipo: "maschio" | "femmina" | "altro"
      stato_profilo: "in_attesa" | "approvato" | "sospeso"
      stato_scheda: "attiva" | "archiviata"
      tipo_esercizio: "forza" | "cardio"
      unita_misura_esercizio: "serie_ripetizioni" | "minuti"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      gruppo_muscolare: [
        "cardio",
        "pettorali",
        "spalle e trapezio",
        "bicipiti e brachiale",
        "tricipiti",
        "dorsali",
        "gambe e glutei",
        "polpacci",
        "addominali",
      ],
      ruolo_app: ["gestore", "cliente"],
      sesso_tipo: ["maschio", "femmina", "altro"],
      stato_profilo: ["in_attesa", "approvato", "sospeso"],
      stato_scheda: ["attiva", "archiviata"],
      tipo_esercizio: ["forza", "cardio"],
      unita_misura_esercizio: ["serie_ripetizioni", "minuti"],
    },
  },
} as const
