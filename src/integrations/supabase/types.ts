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
      clinical_notes: {
        Row: {
          assessment: string
          chief_complaint: string
          clinical_impression: string
          consultation_id: string | null
          created_at: string
          doctor_id: string
          examination: string
          follow_up: string
          history: string
          id: string
          lifestyle_advice: string
          medicines: string
          other_observations: string
          patient_id: string
          plan: string
          recommended_tests: string
          updated_at: string
          vitals: string
        }
        Insert: {
          assessment?: string
          chief_complaint?: string
          clinical_impression?: string
          consultation_id?: string | null
          created_at?: string
          doctor_id: string
          examination?: string
          follow_up?: string
          history?: string
          id?: string
          lifestyle_advice?: string
          medicines?: string
          other_observations?: string
          patient_id: string
          plan?: string
          recommended_tests?: string
          updated_at?: string
          vitals?: string
        }
        Update: {
          assessment?: string
          chief_complaint?: string
          clinical_impression?: string
          consultation_id?: string | null
          created_at?: string
          doctor_id?: string
          examination?: string
          follow_up?: string
          history?: string
          id?: string
          lifestyle_advice?: string
          medicines?: string
          other_observations?: string
          patient_id?: string
          plan?: string
          recommended_tests?: string
          updated_at?: string
          vitals?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          approved_at: string | null
          audio_url: string | null
          created_at: string
          doctor_id: string
          duration_seconds: number
          english_translation: string | null
          id: string
          original_language: string
          original_transcript: string | null
          patient_id: string
          status: string
          transcript: string | null
          transcription_status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          audio_url?: string | null
          created_at?: string
          doctor_id: string
          duration_seconds?: number
          english_translation?: string | null
          id?: string
          original_language?: string
          original_transcript?: string | null
          patient_id: string
          status?: string
          transcript?: string | null
          transcription_status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          audio_url?: string | null
          created_at?: string
          doctor_id?: string
          duration_seconds?: number
          english_translation?: string | null
          id?: string
          original_language?: string
          original_transcript?: string | null
          patient_id?: string
          status?: string
          transcript?: string | null
          transcription_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_reports: {
        Row: {
          created_at: string
          description: string
          file_path: string
          file_size: number
          file_type: string
          hospital_lab: string
          id: string
          patient_id: string
          report_date: string | null
          report_name: string
          report_type: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          file_path: string
          file_size?: number
          file_type?: string
          hospital_lab?: string
          id?: string
          patient_id: string
          report_date?: string | null
          report_name: string
          report_type?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          file_path?: string
          file_size?: number
          file_type?: string
          hospital_lab?: string
          id?: string
          patient_id?: string
          report_date?: string | null
          report_name?: string
          report_type?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          age: number | null
          allergies: string | null
          blood_group: string | null
          city: string | null
          created_at: string
          current_medications: string | null
          date_of_birth: string | null
          doctor_id: string | null
          email: string | null
          emergency_contact: string | null
          emergency_contact_name: string | null
          emergency_phone: string | null
          emergency_relationship: string | null
          full_name: string
          gender: string | null
          id: string
          marital_status: string | null
          medical_conditions: string | null
          medical_history: string | null
          occupation: string | null
          phone: string | null
          pincode: string | null
          preferred_language: string
          registered_by: string | null
          state: string | null
          status: string
          surgeries: string | null
          uhid: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          allergies?: string | null
          blood_group?: string | null
          city?: string | null
          created_at?: string
          current_medications?: string | null
          date_of_birth?: string | null
          doctor_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_contact_name?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          full_name: string
          gender?: string | null
          id?: string
          marital_status?: string | null
          medical_conditions?: string | null
          medical_history?: string | null
          occupation?: string | null
          phone?: string | null
          pincode?: string | null
          preferred_language?: string
          registered_by?: string | null
          state?: string | null
          status?: string
          surgeries?: string | null
          uhid?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          age?: number | null
          allergies?: string | null
          blood_group?: string | null
          city?: string | null
          created_at?: string
          current_medications?: string | null
          date_of_birth?: string | null
          doctor_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_contact_name?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          marital_status?: string | null
          medical_conditions?: string | null
          medical_history?: string | null
          occupation?: string | null
          phone?: string | null
          pincode?: string | null
          preferred_language?: string
          registered_by?: string | null
          state?: string | null
          status?: string
          surgeries?: string | null
          uhid?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          advice: string
          consultation_id: string | null
          created_at: string
          diagnosis: string
          doctor_id: string
          follow_up_date: string | null
          follow_up_note: string
          id: string
          medicines: Json
          patient_id: string
          tests: string
          updated_at: string
        }
        Insert: {
          advice?: string
          consultation_id?: string | null
          created_at?: string
          diagnosis?: string
          doctor_id: string
          follow_up_date?: string | null
          follow_up_note?: string
          id?: string
          medicines?: Json
          patient_id: string
          tests?: string
          updated_at?: string
        }
        Update: {
          advice?: string
          consultation_id?: string | null
          created_at?: string
          diagnosis?: string
          doctor_id?: string
          follow_up_date?: string | null
          follow_up_note?: string
          id?: string
          medicines?: Json
          patient_id?: string
          tests?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          branch: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string
          employee_id: string | null
          experience_years: number | null
          full_name: string
          gender: string | null
          hospital: string | null
          id: string
          joining_date: string | null
          phone: string | null
          qualification: string | null
          registration_number: string | null
          shift: string | null
          specialty: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string
          employee_id?: string | null
          experience_years?: number | null
          full_name?: string
          gender?: string | null
          hospital?: string | null
          id: string
          joining_date?: string | null
          phone?: string | null
          qualification?: string | null
          registration_number?: string | null
          shift?: string | null
          specialty?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string
          employee_id?: string | null
          experience_years?: number | null
          full_name?: string
          gender?: string | null
          hospital?: string | null
          id?: string
          joining_date?: string | null
          phone?: string | null
          qualification?: string | null
          registration_number?: string | null
          shift?: string | null
          specialty?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role: "admin" | "doctor" | "receptionist"
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
      app_role: ["admin", "doctor", "receptionist"],
    },
  },
} as const
