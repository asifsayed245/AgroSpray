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
      audit_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          hash: string
          id: string
          payload: Json
          prev_hash: string | null
          source: Database["public"]["Enums"]["audit_source"]
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          hash: string
          id?: string
          payload?: Json
          prev_hash?: string | null
          source: Database["public"]["Enums"]["audit_source"]
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          hash?: string
          id?: string
          payload?: Json
          prev_hash?: string | null
          source?: Database["public"]["Enums"]["audit_source"]
          tenant_id?: string
        }
        Relationships: []
      }
      compliance_checks: {
        Row: {
          check_type: Database["public"]["Enums"]["compliance_check_type"]
          created_at: string
          id: string
          job_id: string
          overridden_by: string | null
          override_reason: string | null
          reason: string | null
          reference_data: Json | null
          status: Database["public"]["Enums"]["compliance_status"]
          tenant_id: string
        }
        Insert: {
          check_type: Database["public"]["Enums"]["compliance_check_type"]
          created_at?: string
          id?: string
          job_id: string
          overridden_by?: string | null
          override_reason?: string | null
          reason?: string | null
          reference_data?: Json | null
          status: Database["public"]["Enums"]["compliance_status"]
          tenant_id: string
        }
        Update: {
          check_type?: Database["public"]["Enums"]["compliance_check_type"]
          created_at?: string
          id?: string
          job_id?: string
          overridden_by?: string | null
          override_reason?: string | null
          reason?: string | null
          reference_data?: Json | null
          status?: Database["public"]["Enums"]["compliance_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checks_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_text: string
          delete_fulfilled_at: string | null
          delete_requested_at: string | null
          export_fulfilled_at: string | null
          export_requested_at: string | null
          farmer_id: string | null
          granted: boolean
          granted_at: string
          id: string
          notice_version: string
          profile_id: string | null
          revoked_at: string | null
          tenant_id: string
        }
        Insert: {
          consent_text: string
          delete_fulfilled_at?: string | null
          delete_requested_at?: string | null
          export_fulfilled_at?: string | null
          export_requested_at?: string | null
          farmer_id?: string | null
          granted?: boolean
          granted_at?: string
          id?: string
          notice_version: string
          profile_id?: string | null
          revoked_at?: string | null
          tenant_id: string
        }
        Update: {
          consent_text?: string
          delete_fulfilled_at?: string | null
          delete_requested_at?: string | null
          export_fulfilled_at?: string | null
          export_requested_at?: string | null
          farmer_id?: string | null
          granted?: boolean
          granted_at?: string
          id?: string
          notice_version?: string
          profile_id?: string | null
          revoked_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crops: {
        Row: {
          aliases: string[]
          default_volume_per_acre_l: number
          id: string
          name_en: string
          name_hi: string | null
          name_mr: string | null
        }
        Insert: {
          aliases?: string[]
          default_volume_per_acre_l?: number
          id: string
          name_en: string
          name_hi?: string | null
          name_mr?: string | null
        }
        Update: {
          aliases?: string[]
          default_volume_per_acre_l?: number
          id?: string
          name_en?: string
          name_hi?: string | null
          name_mr?: string | null
        }
        Relationships: []
      }
      drones: {
        Row: {
          battery_cycles: number
          battery_health: string | null
          created_at: string
          current_job_id: string | null
          display_id: string
          hours_flown: number
          hours_since_service: number
          id: string
          insurance_expiry: string | null
          insurance_ref: string | null
          last_calibration_at: string | null
          manufacturer: string | null
          model: string | null
          payload_l: number | null
          pesticide_compat: string[]
          service_threshold_hours: number
          status: Database["public"]["Enums"]["drone_status"]
          tenant_id: string
          uin: string
          updated_at: string
          version: number
          year: number | null
        }
        Insert: {
          battery_cycles?: number
          battery_health?: string | null
          created_at?: string
          current_job_id?: string | null
          display_id: string
          hours_flown?: number
          hours_since_service?: number
          id?: string
          insurance_expiry?: string | null
          insurance_ref?: string | null
          last_calibration_at?: string | null
          manufacturer?: string | null
          model?: string | null
          payload_l?: number | null
          pesticide_compat?: string[]
          service_threshold_hours?: number
          status?: Database["public"]["Enums"]["drone_status"]
          tenant_id: string
          uin: string
          updated_at?: string
          version?: number
          year?: number | null
        }
        Update: {
          battery_cycles?: number
          battery_health?: string | null
          created_at?: string
          current_job_id?: string | null
          display_id?: string
          hours_flown?: number
          hours_since_service?: number
          id?: string
          insurance_expiry?: string | null
          insurance_ref?: string | null
          last_calibration_at?: string | null
          manufacturer?: string | null
          model?: string | null
          payload_l?: number | null
          pesticide_compat?: string[]
          service_threshold_hours?: number
          status?: Database["public"]["Enums"]["drone_status"]
          tenant_id?: string
          uin?: string
          updated_at?: string
          version?: number
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drones_current_job_fk"
            columns: ["current_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_queries: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          context_state: string | null
          farmer_id: string | null
          id: string
          inbound_text: string
          language: string
          opened_at: string
          related_job_id: string | null
          replied_at: string | null
          replied_by: string | null
          reply_text: string | null
          sla_due_at: string
          source: string
          status: string
          telegram_chat_id: string
          telegram_user_id: string | null
          tenant_id: string
          username: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          context_state?: string | null
          farmer_id?: string | null
          id?: string
          inbound_text: string
          language?: string
          opened_at?: string
          related_job_id?: string | null
          replied_at?: string | null
          replied_by?: string | null
          reply_text?: string | null
          sla_due_at?: string
          source?: string
          status?: string
          telegram_chat_id: string
          telegram_user_id?: string | null
          tenant_id: string
          username?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          context_state?: string | null
          farmer_id?: string | null
          id?: string
          inbound_text?: string
          language?: string
          opened_at?: string
          related_job_id?: string | null
          replied_at?: string | null
          replied_by?: string | null
          reply_text?: string | null
          sla_due_at?: string
          source?: string
          status?: string
          telegram_chat_id?: string
          telegram_user_id?: string | null
          tenant_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_queries_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_queries_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_queries_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_queries_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_queries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_sessions: {
        Row: {
          consent_at: string | null
          created_at: string
          draft: Json
          farmer_id: string | null
          id: string
          language: string
          last_activity_at: string
          state: string
          telegram_chat_id: string
          telegram_user_id: string | null
          tenant_id: string
          username: string | null
        }
        Insert: {
          consent_at?: string | null
          created_at?: string
          draft?: Json
          farmer_id?: string | null
          id?: string
          language?: string
          last_activity_at?: string
          state?: string
          telegram_chat_id: string
          telegram_user_id?: string | null
          tenant_id: string
          username?: string | null
        }
        Update: {
          consent_at?: string | null
          created_at?: string
          draft?: Json
          farmer_id?: string | null
          id?: string
          language?: string
          last_activity_at?: string
          state?: string
          telegram_chat_id?: string
          telegram_user_id?: string | null
          tenant_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_sessions_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      farmers: {
        Row: {
          booking_count: number
          consent_id: string | null
          created_at: string
          default_language: string
          district: string | null
          id: string
          known_locations: Json
          last_booking_at: string | null
          name: string
          phone: string | null
          profile_id: string | null
          state: string | null
          telegram_id: string | null
          tenant_id: string
          updated_at: string
          version: number
          village: string | null
        }
        Insert: {
          booking_count?: number
          consent_id?: string | null
          created_at?: string
          default_language?: string
          district?: string | null
          id?: string
          known_locations?: Json
          last_booking_at?: string | null
          name: string
          phone?: string | null
          profile_id?: string | null
          state?: string | null
          telegram_id?: string | null
          tenant_id: string
          updated_at?: string
          version?: number
          village?: string | null
        }
        Update: {
          booking_count?: number
          consent_id?: string | null
          created_at?: string
          default_language?: string
          district?: string | null
          id?: string
          known_locations?: Json
          last_booking_at?: string | null
          name?: string
          phone?: string | null
          profile_id?: string | null
          state?: string | null
          telegram_id?: string | null
          tenant_id?: string
          updated_at?: string
          version?: number
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          description: string | null
          dgca_notification_ref: string | null
          dgca_notified_at: string | null
          dgca_reportable: boolean
          id: string
          linked_drone_id: string | null
          linked_job_id: string | null
          linked_pilot_id: string | null
          location_lat: number | null
          location_lng: number | null
          parties_involved: string[]
          photos: Json
          reported_by: string | null
          resolution_notes: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          tenant_id: string
          third_party_affected: string | null
          type: Database["public"]["Enums"]["incident_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dgca_notification_ref?: string | null
          dgca_notified_at?: string | null
          dgca_reportable?: boolean
          id?: string
          linked_drone_id?: string | null
          linked_job_id?: string | null
          linked_pilot_id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          parties_involved?: string[]
          photos?: Json
          reported_by?: string | null
          resolution_notes?: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          tenant_id: string
          third_party_affected?: string | null
          type: Database["public"]["Enums"]["incident_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dgca_notification_ref?: string | null
          dgca_notified_at?: string | null
          dgca_reportable?: boolean
          id?: string
          linked_drone_id?: string | null
          linked_job_id?: string | null
          linked_pilot_id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          parties_involved?: string[]
          photos?: Json
          reported_by?: string | null
          resolution_notes?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          tenant_id?: string
          third_party_affected?: string | null
          type?: Database["public"]["Enums"]["incident_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_linked_drone_id_fkey"
            columns: ["linked_drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_linked_job_id_fkey"
            columns: ["linked_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_linked_pilot_id_fkey"
            columns: ["linked_pilot_id"]
            isOneToOne: false
            referencedRelation: "pilots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          id: string
          job_id: string
          line_items: Json
          number: string
          paid_at: string | null
          paid_by_method: string | null
          paid_reference: string | null
          subtotal: number
          tax_total: number
          tenant_id: string
          total: number
          updated_at: string
          upi_qr_payload: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          line_items: Json
          number: string
          paid_at?: string | null
          paid_by_method?: string | null
          paid_reference?: string | null
          subtotal: number
          tax_total: number
          tenant_id: string
          total: number
          updated_at?: string
          upi_qr_payload?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          line_items?: Json
          number?: string
          paid_at?: string | null
          paid_by_method?: string | null
          paid_reference?: string | null
          subtotal?: number
          tax_total?: number
          tenant_id?: string
          total?: number
          updated_at?: string
          upi_qr_payload?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          area: number
          area_acres: number
          area_unit: Database["public"]["Enums"]["area_unit"]
          assigned_drone_id: string | null
          assigned_pilot_id: string | null
          cancel_reason: string | null
          created_at: string
          crop: string
          farmer_id: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_polygon: Json | null
          number: string
          override_reason: string | null
          pesticide_brand: string | null
          pesticide_name: string | null
          pricing_snapshot: Json | null
          reschedule_count: number
          scheduled_date: string
          scheduled_date_end: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          spray_type: string | null
          state: Database["public"]["Enums"]["job_state"]
          state_history: Json
          tenant_id: string
          updated_at: string
          version: number
          village: string | null
          weather_evaluated_at: string | null
          weather_last_notified_safety: string | null
          weather_safety: string | null
        }
        Insert: {
          area: number
          area_acres: number
          area_unit?: Database["public"]["Enums"]["area_unit"]
          assigned_drone_id?: string | null
          assigned_pilot_id?: string | null
          cancel_reason?: string | null
          created_at?: string
          crop: string
          farmer_id: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_polygon?: Json | null
          number: string
          override_reason?: string | null
          pesticide_brand?: string | null
          pesticide_name?: string | null
          pricing_snapshot?: Json | null
          reschedule_count?: number
          scheduled_date: string
          scheduled_date_end?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          spray_type?: string | null
          state?: Database["public"]["Enums"]["job_state"]
          state_history?: Json
          tenant_id: string
          updated_at?: string
          version?: number
          village?: string | null
          weather_evaluated_at?: string | null
          weather_last_notified_safety?: string | null
          weather_safety?: string | null
        }
        Update: {
          area?: number
          area_acres?: number
          area_unit?: Database["public"]["Enums"]["area_unit"]
          assigned_drone_id?: string | null
          assigned_pilot_id?: string | null
          cancel_reason?: string | null
          created_at?: string
          crop?: string
          farmer_id?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_polygon?: Json | null
          number?: string
          override_reason?: string | null
          pesticide_brand?: string | null
          pesticide_name?: string | null
          pricing_snapshot?: Json | null
          reschedule_count?: number
          scheduled_date?: string
          scheduled_date_end?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          spray_type?: string | null
          state?: Database["public"]["Enums"]["job_state"]
          state_history?: Json
          tenant_id?: string
          updated_at?: string
          version?: number
          village?: string | null
          weather_evaluated_at?: string | null
          weather_last_notified_safety?: string | null
          weather_safety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_assigned_drone_id_fkey"
            columns: ["assigned_drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_assigned_pilot_id_fkey"
            columns: ["assigned_pilot_id"]
            isOneToOne: false
            referencedRelation: "pilots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          delivered_at: string | null
          delivery_channel: string
          delivery_status: string
          error: string | null
          id: string
          payload: Json | null
          read_at: string | null
          recipient_farmer_id: string | null
          recipient_telegram_id: string | null
          recipient_user_id: string | null
          retries: number
          scheduled_at: string | null
          sent_at: string | null
          tenant_id: string
          title: string | null
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          delivered_at?: string | null
          delivery_channel?: string
          delivery_status?: string
          error?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          recipient_farmer_id?: string | null
          recipient_telegram_id?: string | null
          recipient_user_id?: string | null
          retries?: number
          scheduled_at?: string | null
          sent_at?: string | null
          tenant_id: string
          title?: string | null
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          delivered_at?: string | null
          delivery_channel?: string
          delivery_status?: string
          error?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          recipient_farmer_id?: string | null
          recipient_telegram_id?: string | null
          recipient_user_id?: string | null
          retries?: number
          scheduled_at?: string | null
          sent_at?: string | null
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_farmer_id_fkey"
            columns: ["recipient_farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pesticides_cib: {
        Row: {
          active_ingredient: string | null
          approved_crops: string[]
          brand: string | null
          drone_approved: boolean
          id: string
          name: string
          notes: string | null
          phi_days_by_crop: Json
        }
        Insert: {
          active_ingredient?: string | null
          approved_crops?: string[]
          brand?: string | null
          drone_approved?: boolean
          id?: string
          name: string
          notes?: string | null
          phi_days_by_crop?: Json
        }
        Update: {
          active_ingredient?: string | null
          approved_crops?: string[]
          brand?: string | null
          drone_approved?: boolean
          id?: string
          name?: string
          notes?: string | null
          phi_days_by_crop?: Json
        }
        Relationships: []
      }
      pilots: {
        Row: {
          alt_phone: string | null
          certified_drone_classes: string[]
          created_at: string
          employment_status: string
          id: string
          joined_date: string | null
          name: string
          phone: string | null
          profile_id: string | null
          rpc_expiry: string | null
          rpc_number: string
          telegram_id: string | null
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          alt_phone?: string | null
          certified_drone_classes?: string[]
          created_at?: string
          employment_status?: string
          id?: string
          joined_date?: string | null
          name: string
          phone?: string | null
          profile_id?: string | null
          rpc_expiry?: string | null
          rpc_number: string
          telegram_id?: string | null
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          alt_phone?: string | null
          certified_drone_classes?: string[]
          created_at?: string
          employment_status?: string
          id?: string
          joined_date?: string | null
          name?: string
          phone?: string | null
          profile_id?: string | null
          rpc_expiry?: string | null
          rpc_number?: string
          telegram_id?: string | null
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pilots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          telegram_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          telegram_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          telegram_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          categories: string[]
          created_at: string
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: string[]
          created_at?: string
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_blocks: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          drone_id: string | null
          id: string
          reason: string | null
          tenant_id: string
          time_end: string
          time_start: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          drone_id?: string | null
          id?: string
          reason?: string | null
          tenant_id: string
          time_end: string
          time_start: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          drone_id?: string | null
          id?: string
          reason?: string | null
          tenant_id?: string
          time_end?: string
          time_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_blocks_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          booked: number
          capacity: number
          created_at: string
          date: string
          id: string
          locked: number
          notes: string | null
          tenant_id: string
          unavailable: boolean
          updated_at: string
          version: number
        }
        Insert: {
          booked?: number
          capacity: number
          created_at?: string
          date: string
          id?: string
          locked?: number
          notes?: string | null
          tenant_id: string
          unavailable?: boolean
          updated_at?: string
          version?: number
        }
        Update: {
          booked?: number
          capacity?: number
          created_at?: string
          date?: string
          id?: string
          locked?: number
          notes?: string | null
          tenant_id?: string
          unavailable?: boolean
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sorties: {
        Row: {
          aborted_reason: string | null
          area_covered_acres: number | null
          created_at: string
          drone_id: string | null
          gps_centroid_lat: number | null
          gps_centroid_lng: number | null
          gps_track: Json | null
          id: string
          job_id: string
          landing_at: string | null
          npnt_permission_ref: string | null
          pilot_id: string | null
          sortie_number: number
          state: Database["public"]["Enums"]["sortie_state"]
          takeoff_at: string | null
          telemetry_blob_url: string | null
          tenant_id: string
          updated_at: string
          volume_sprayed_l: number | null
        }
        Insert: {
          aborted_reason?: string | null
          area_covered_acres?: number | null
          created_at?: string
          drone_id?: string | null
          gps_centroid_lat?: number | null
          gps_centroid_lng?: number | null
          gps_track?: Json | null
          id?: string
          job_id: string
          landing_at?: string | null
          npnt_permission_ref?: string | null
          pilot_id?: string | null
          sortie_number: number
          state?: Database["public"]["Enums"]["sortie_state"]
          takeoff_at?: string | null
          telemetry_blob_url?: string | null
          tenant_id: string
          updated_at?: string
          volume_sprayed_l?: number | null
        }
        Update: {
          aborted_reason?: string | null
          area_covered_acres?: number | null
          created_at?: string
          drone_id?: string | null
          gps_centroid_lat?: number | null
          gps_centroid_lng?: number | null
          gps_track?: Json | null
          id?: string
          job_id?: string
          landing_at?: string | null
          npnt_permission_ref?: string | null
          pilot_id?: string | null
          sortie_number?: number
          state?: Database["public"]["Enums"]["sortie_state"]
          takeoff_at?: string | null
          telemetry_blob_url?: string | null
          tenant_id?: string
          updated_at?: string
          volume_sprayed_l?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sorties_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sorties_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sorties_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "pilots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sorties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_messages: {
        Row: {
          body: string | null
          chat_id: string
          created_at: string
          direction: string
          error: string | null
          id: string
          message_id: string | null
          payload: Json
          state: string | null
          tenant_id: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          body?: string | null
          chat_id: string
          created_at?: string
          direction: string
          error?: string | null
          id?: string
          message_id?: string | null
          payload?: Json
          state?: string | null
          tenant_id: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          body?: string | null
          chat_id?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          message_id?: string | null
          payload?: Json
          state?: string | null
          tenant_id?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          activated_at: string | null
          bank_account: string | null
          cancellation_policy: Json
          created_at: string
          default_language: string
          dgca_operator_uin: string | null
          gstin: string | null
          id: string
          name: string
          notification_prefs: Json
          pan: string | null
          pricing_defaults: Json
          registered_address: string | null
          slug: string
          state: string | null
          telegram_bot_token: string | null
          telegram_ops_chat_id: string | null
          timezone: string
          updated_at: string
          upi_vpa: string | null
          version: number
          weather_policy: Json
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          activated_at?: string | null
          bank_account?: string | null
          cancellation_policy?: Json
          created_at?: string
          default_language?: string
          dgca_operator_uin?: string | null
          gstin?: string | null
          id?: string
          name: string
          notification_prefs?: Json
          pan?: string | null
          pricing_defaults?: Json
          registered_address?: string | null
          slug: string
          state?: string | null
          telegram_bot_token?: string | null
          telegram_ops_chat_id?: string | null
          timezone?: string
          updated_at?: string
          upi_vpa?: string | null
          version?: number
          weather_policy?: Json
          working_hours_end?: string
          working_hours_start?: string
        }
        Update: {
          activated_at?: string | null
          bank_account?: string | null
          cancellation_policy?: Json
          created_at?: string
          default_language?: string
          dgca_operator_uin?: string | null
          gstin?: string | null
          id?: string
          name?: string
          notification_prefs?: Json
          pan?: string | null
          pricing_defaults?: Json
          registered_address?: string | null
          slug?: string
          state?: string | null
          telegram_bot_token?: string | null
          telegram_ops_chat_id?: string | null
          timezone?: string
          updated_at?: string
          upi_vpa?: string | null
          version?: number
          weather_policy?: Json
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: []
      }
      weather_snapshots: {
        Row: {
          booking_date_safety: string
          daily: Json
          fetched_at: string
          hourly: Json | null
          id: string
          job_id: string
          lat: number
          lng: number
          source: string
          tenant_id: string
        }
        Insert: {
          booking_date_safety: string
          daily: Json
          fetched_at?: string
          hourly?: Json | null
          id?: string
          job_id: string
          lat: number
          lng: number
          source?: string
          tenant_id: string
        }
        Update: {
          booking_date_safety?: string
          daily?: Json
          fetched_at?: string
          hourly?: Json | null
          id?: string
          job_id?: string
          lat?: number
          lng?: number
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_entries: {
        Row: {
          area_acres: number | null
          confirmed_at: string | null
          created_at: string
          crop: string | null
          farmer_id: string
          id: string
          notified_at: string | null
          preferred_date: string
          status: Database["public"]["Enums"]["wishlist_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          area_acres?: number | null
          confirmed_at?: string | null
          created_at?: string
          crop?: string | null
          farmer_id: string
          id?: string
          notified_at?: string | null
          preferred_date: string
          status?: Database["public"]["Enums"]["wishlist_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          area_acres?: number | null
          confirmed_at?: string | null
          created_at?: string
          crop?: string | null
          farmer_id?: string
          id?: string
          notified_at?: string | null
          preferred_date?: string
          status?: Database["public"]["Enums"]["wishlist_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_entries_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      latest_weather_per_job: {
        Row: {
          booking_date_safety: string | null
          daily: Json | null
          fetched_at: string | null
          job_id: string | null
          lat: number | null
          lng: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      abort_sortie: {
        Args: { p_reason: string; p_sortie_id: string }
        Returns: {
          aborted_reason: string | null
          area_covered_acres: number | null
          created_at: string
          drone_id: string | null
          gps_centroid_lat: number | null
          gps_centroid_lng: number | null
          gps_track: Json | null
          id: string
          job_id: string
          landing_at: string | null
          npnt_permission_ref: string | null
          pilot_id: string | null
          sortie_number: number
          state: Database["public"]["Enums"]["sortie_state"]
          takeoff_at: string | null
          telemetry_blob_url: string | null
          tenant_id: string
          updated_at: string
          volume_sprayed_l: number | null
        }
        SetofOptions: {
          from: "*"
          to: "sorties"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_crew: {
        Args: { p_drone_id: string; p_job_id: string; p_pilot_id: string }
        Returns: {
          area: number
          area_acres: number
          area_unit: Database["public"]["Enums"]["area_unit"]
          assigned_drone_id: string | null
          assigned_pilot_id: string | null
          cancel_reason: string | null
          created_at: string
          crop: string
          farmer_id: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_polygon: Json | null
          number: string
          override_reason: string | null
          pesticide_brand: string | null
          pesticide_name: string | null
          pricing_snapshot: Json | null
          reschedule_count: number
          scheduled_date: string
          scheduled_date_end: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          spray_type: string | null
          state: Database["public"]["Enums"]["job_state"]
          state_history: Json
          tenant_id: string
          updated_at: string
          version: number
          village: string | null
          weather_evaluated_at: string | null
          weather_last_notified_safety: string | null
          weather_safety: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_pricing: { Args: { p_job_id: string }; Returns: Json }
      cancel_job: {
        Args: { p_job_id: string; p_reason: string }
        Returns: {
          area: number
          area_acres: number
          area_unit: Database["public"]["Enums"]["area_unit"]
          assigned_drone_id: string | null
          assigned_pilot_id: string | null
          cancel_reason: string | null
          created_at: string
          crop: string
          farmer_id: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_polygon: Json | null
          number: string
          override_reason: string | null
          pesticide_brand: string | null
          pesticide_name: string | null
          pricing_snapshot: Json | null
          reschedule_count: number
          scheduled_date: string
          scheduled_date_end: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          spray_type: string | null
          state: Database["public"]["Enums"]["job_state"]
          state_history: Json
          tenant_id: string
          updated_at: string
          version: number
          village: string | null
          weather_evaluated_at: string | null
          weather_last_notified_safety: string | null
          weather_safety: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_wishlist: {
        Args: { p_reason: string; p_wishlist_id: string }
        Returns: {
          area_acres: number | null
          confirmed_at: string | null
          created_at: string
          crop: string | null
          farmer_id: string
          id: string
          notified_at: string | null
          preferred_date: string
          status: Database["public"]["Enums"]["wishlist_status"]
          tenant_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "wishlist_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_window_conflict: {
        Args: {
          p_date: string
          p_exclude_job_id?: string
          p_tenant_id: string
          p_time_end: string
          p_time_start: string
        }
        Returns: Json
      }
      close_farmer_query: {
        Args: { p_query_id: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          context_state: string | null
          farmer_id: string | null
          id: string
          inbound_text: string
          language: string
          opened_at: string
          related_job_id: string | null
          replied_at: string | null
          replied_by: string | null
          reply_text: string | null
          sla_due_at: string
          source: string
          status: string
          telegram_chat_id: string
          telegram_user_id: string | null
          tenant_id: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "farmer_queries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_sortie: {
        Args: {
          p_area_covered: number
          p_sortie_id: string
          p_volume_sprayed: number
        }
        Returns: {
          aborted_reason: string | null
          area_covered_acres: number | null
          created_at: string
          drone_id: string | null
          gps_centroid_lat: number | null
          gps_centroid_lng: number | null
          gps_track: Json | null
          id: string
          job_id: string
          landing_at: string | null
          npnt_permission_ref: string | null
          pilot_id: string | null
          sortie_number: number
          state: Database["public"]["Enums"]["sortie_state"]
          takeoff_at: string | null
          telemetry_blob_url: string | null
          tenant_id: string
          updated_at: string
          volume_sprayed_l: number | null
        }
        SetofOptions: {
          from: "*"
          to: "sorties"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_job: {
        Args: { p_job_id: string }
        Returns: {
          area: number
          area_acres: number
          area_unit: Database["public"]["Enums"]["area_unit"]
          assigned_drone_id: string | null
          assigned_pilot_id: string | null
          cancel_reason: string | null
          created_at: string
          crop: string
          farmer_id: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_polygon: Json | null
          number: string
          override_reason: string | null
          pesticide_brand: string | null
          pesticide_name: string | null
          pricing_snapshot: Json | null
          reschedule_count: number
          scheduled_date: string
          scheduled_date_end: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          spray_type: string | null
          state: Database["public"]["Enums"]["job_state"]
          state_history: Json
          tenant_id: string
          updated_at: string
          version: number
          village: string | null
          weather_evaluated_at: string | null
          weather_last_notified_safety: string | null
          weather_safety: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_inquiry: {
        Args: {
          p_date_end?: string
          p_job_id: string
          p_time_end: string
          p_time_start: string
        }
        Returns: {
          area: number
          area_acres: number
          area_unit: Database["public"]["Enums"]["area_unit"]
          assigned_drone_id: string | null
          assigned_pilot_id: string | null
          cancel_reason: string | null
          created_at: string
          crop: string
          farmer_id: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_polygon: Json | null
          number: string
          override_reason: string | null
          pesticide_brand: string | null
          pesticide_name: string | null
          pricing_snapshot: Json | null
          reschedule_count: number
          scheduled_date: string
          scheduled_date_end: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          spray_type: string | null
          state: Database["public"]["Enums"]["job_state"]
          state_history: Json
          tenant_id: string
          updated_at: string
          version: number
          village: string | null
          weather_evaluated_at: string | null
          weather_last_notified_safety: string | null
          weather_safety: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_wishlist: {
        Args: { p_wishlist_id: string }
        Returns: {
          area: number
          area_acres: number
          area_unit: Database["public"]["Enums"]["area_unit"]
          assigned_drone_id: string | null
          assigned_pilot_id: string | null
          cancel_reason: string | null
          created_at: string
          crop: string
          farmer_id: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_polygon: Json | null
          number: string
          override_reason: string | null
          pesticide_brand: string | null
          pesticide_name: string | null
          pricing_snapshot: Json | null
          reschedule_count: number
          scheduled_date: string
          scheduled_date_end: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          spray_type: string | null
          state: Database["public"]["Enums"]["job_state"]
          state_history: Json
          tenant_id: string
          updated_at: string
          version: number
          village: string | null
          weather_evaluated_at: string | null
          weather_last_notified_safety: string | null
          weather_safety: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_tenant_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      ensure_slot: {
        Args: { p_capacity: number; p_date: string; p_tenant_id: string }
        Returns: {
          booked: number
          capacity: number
          created_at: string
          date: string
          id: string
          locked: number
          notes: string | null
          tenant_id: string
          unavailable: boolean
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "slots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_invoice: {
        Args: { p_job_id: string }
        Returns: {
          created_at: string
          id: string
          job_id: string
          line_items: Json
          number: string
          paid_at: string | null
          paid_by_method: string | null
          paid_reference: string | null
          subtotal: number
          tax_total: number
          tenant_id: string
          total: number
          updated_at: string
          upi_qr_payload: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_invoice_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      generate_job_number: {
        Args: { p_crop: string; p_date: string; p_tenant_id: string }
        Returns: string
      }
      has_admin_role: { Args: never; Returns: boolean }
      has_override_role: { Args: never; Returns: boolean }
      mark_farmer_query_delivered: {
        Args: { p_query_id: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          context_state: string | null
          farmer_id: string | null
          id: string
          inbound_text: string
          language: string
          opened_at: string
          related_job_id: string | null
          replied_at: string | null
          replied_by: string | null
          reply_text: string | null
          sla_due_at: string
          source: string
          status: string
          telegram_chat_id: string
          telegram_user_id: string | null
          tenant_id: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "farmer_queries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_invoice_paid: {
        Args: { p_invoice_id: string; p_method: string; p_reference: string }
        Returns: {
          created_at: string
          id: string
          job_id: string
          line_items: Json
          number: string
          paid_at: string | null
          paid_by_method: string | null
          paid_reference: string | null
          subtotal: number
          tax_total: number
          tenant_id: string
          total: number
          updated_at: string
          upi_qr_payload: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      override_state: {
        Args: {
          p_job_id: string
          p_new_state: Database["public"]["Enums"]["job_state"]
          p_reason: string
        }
        Returns: {
          area: number
          area_acres: number
          area_unit: Database["public"]["Enums"]["area_unit"]
          assigned_drone_id: string | null
          assigned_pilot_id: string | null
          cancel_reason: string | null
          created_at: string
          crop: string
          farmer_id: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_polygon: Json | null
          number: string
          override_reason: string | null
          pesticide_brand: string | null
          pesticide_name: string | null
          pricing_snapshot: Json | null
          reschedule_count: number
          scheduled_date: string
          scheduled_date_end: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          spray_type: string | null
          state: Database["public"]["Enums"]["job_state"]
          state_history: Json
          tenant_id: string
          updated_at: string
          version: number
          village: string | null
          weather_evaluated_at: string | null
          weather_last_notified_safety: string | null
          weather_safety: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reconcile_job: { Args: { p_job_id: string }; Returns: boolean }
      release_slot: {
        Args: { p_date: string; p_tenant_id: string }
        Returns: undefined
      }
      reply_to_farmer_query: {
        Args: { p_query_id: string; p_reply: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          context_state: string | null
          farmer_id: string | null
          id: string
          inbound_text: string
          language: string
          opened_at: string
          related_job_id: string | null
          replied_at: string | null
          replied_by: string | null
          reply_text: string | null
          sla_due_at: string
          source: string
          status: string
          telegram_chat_id: string
          telegram_user_id: string | null
          tenant_id: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "farmer_queries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reschedule_job:
        | {
            Args: {
              p_job_id: string
              p_new_date: string
              p_new_date_end: string
              p_reason: string
              p_time_end: string
              p_time_start: string
            }
            Returns: {
              area: number
              area_acres: number
              area_unit: Database["public"]["Enums"]["area_unit"]
              assigned_drone_id: string | null
              assigned_pilot_id: string | null
              cancel_reason: string | null
              created_at: string
              crop: string
              farmer_id: string
              id: string
              location_lat: number | null
              location_lng: number | null
              location_polygon: Json | null
              number: string
              override_reason: string | null
              pesticide_brand: string | null
              pesticide_name: string | null
              pricing_snapshot: Json | null
              reschedule_count: number
              scheduled_date: string
              scheduled_date_end: string | null
              scheduled_time_end: string | null
              scheduled_time_start: string | null
              spray_type: string | null
              state: Database["public"]["Enums"]["job_state"]
              state_history: Json
              tenant_id: string
              updated_at: string
              version: number
              village: string | null
              weather_evaluated_at: string | null
              weather_last_notified_safety: string | null
              weather_safety: string | null
            }
            SetofOptions: {
              from: "*"
              to: "jobs"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { p_job_id: string; p_new_date: string; p_reason: string }
            Returns: {
              area: number
              area_acres: number
              area_unit: Database["public"]["Enums"]["area_unit"]
              assigned_drone_id: string | null
              assigned_pilot_id: string | null
              cancel_reason: string | null
              created_at: string
              crop: string
              farmer_id: string
              id: string
              location_lat: number | null
              location_lng: number | null
              location_polygon: Json | null
              number: string
              override_reason: string | null
              pesticide_brand: string | null
              pesticide_name: string | null
              pricing_snapshot: Json | null
              reschedule_count: number
              scheduled_date: string
              scheduled_date_end: string | null
              scheduled_time_end: string | null
              scheduled_time_start: string | null
              spray_type: string | null
              state: Database["public"]["Enums"]["job_state"]
              state_history: Json
              tenant_id: string
              updated_at: string
              version: number
              village: string | null
              weather_evaluated_at: string | null
              weather_last_notified_safety: string | null
              weather_safety: string | null
            }
            SetofOptions: {
              from: "*"
              to: "jobs"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      reserve_date_range: {
        Args: { p_date_end: string; p_date_start: string; p_tenant_id: string }
        Returns: boolean
      }
      reserve_slot: {
        Args: { p_date: string; p_tenant_id: string }
        Returns: boolean
      }
      run_compliance_checks: { Args: { p_job_id: string }; Returns: boolean }
      start_sortie: {
        Args: { p_job_id: string }
        Returns: {
          aborted_reason: string | null
          area_covered_acres: number | null
          created_at: string
          drone_id: string | null
          gps_centroid_lat: number | null
          gps_centroid_lng: number | null
          gps_track: Json | null
          id: string
          job_id: string
          landing_at: string | null
          npnt_permission_ref: string | null
          pilot_id: string | null
          sortie_number: number
          state: Database["public"]["Enums"]["sortie_state"]
          takeoff_at: string | null
          telemetry_blob_url: string | null
          tenant_id: string
          updated_at: string
          volume_sprayed_l: number | null
        }
        SetofOptions: {
          from: "*"
          to: "sorties"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_job_for_compliance: {
        Args: { p_job_id: string }
        Returns: {
          area: number
          area_acres: number
          area_unit: Database["public"]["Enums"]["area_unit"]
          assigned_drone_id: string | null
          assigned_pilot_id: string | null
          cancel_reason: string | null
          created_at: string
          crop: string
          farmer_id: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_polygon: Json | null
          number: string
          override_reason: string | null
          pesticide_brand: string | null
          pesticide_name: string | null
          pricing_snapshot: Json | null
          reschedule_count: number
          scheduled_date: string
          scheduled_date_end: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          spray_type: string | null
          state: Database["public"]["Enums"]["job_state"]
          state_history: Json
          tenant_id: string
          updated_at: string
          version: number
          village: string | null
          weather_evaluated_at: string | null
          weather_last_notified_safety: string | null
          weather_safety: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tg_apply_weather_snapshot: {
        Args: { p_job_id: string; p_safety: string }
        Returns: Json
      }
      tg_capture_query: {
        Args: {
          p_language: string
          p_state: string
          p_telegram_chat_id: string
          p_telegram_user_id: string
          p_tenant_id: string
          p_text: string
          p_username: string
        }
        Returns: Json
      }
      tg_finalize_booking: {
        Args: { p_telegram_chat_id: string; p_tenant_id: string }
        Returns: Json
      }
      tg_mark_weather_notified: {
        Args: { p_job_id: string; p_safety: string }
        Returns: undefined
      }
      tg_set_job_location: {
        Args: { p_job_id: string; p_lat: number; p_lng: number }
        Returns: undefined
      }
      write_audit: {
        Args: {
          p_actor_id: string
          p_actor_type: string
          p_entity_id: string
          p_entity_type: string
          p_event_type: string
          p_payload: Json
          p_source: Database["public"]["Enums"]["audit_source"]
          p_tenant_id: string
        }
        Returns: string
      }
    }
    Enums: {
      area_unit: "acre" | "hectare" | "bigha" | "guntha" | "kanal" | "ghumao"
      audit_source: "auto" | "manual" | "override"
      compliance_check_type:
        | "dgca_uin"
        | "dgca_rpc"
        | "cib_pesticide"
        | "npnt"
        | "pricing"
      compliance_status: "pass" | "fail" | "overridden"
      drone_status: "ready" | "in_flight" | "maintenance" | "out_of_service"
      incident_severity: "low" | "medium" | "high" | "critical"
      incident_type:
        | "crash"
        | "drift"
        | "injury"
        | "equipment_failure"
        | "near_miss"
      job_state:
        | "draft"
        | "compliance"
        | "inquiry"
        | "confirmed"
        | "crew_assigned"
        | "in_progress"
        | "complete"
        | "invoiced"
        | "paid"
        | "wishlist"
        | "comp_fail"
        | "cancelled"
        | "failed"
        | "disputed"
      sortie_state: "pending" | "pre_flight" | "active" | "closed" | "aborted"
      user_role:
        | "owner"
        | "admin"
        | "operations"
        | "accountant"
        | "support"
        | "viewer"
        | "pilot"
        | "farmer"
      wishlist_status:
        | "waiting"
        | "notified"
        | "confirmed"
        | "expired"
        | "cancelled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      area_unit: ["acre", "hectare", "bigha", "guntha", "kanal", "ghumao"],
      audit_source: ["auto", "manual", "override"],
      compliance_check_type: [
        "dgca_uin",
        "dgca_rpc",
        "cib_pesticide",
        "npnt",
        "pricing",
      ],
      compliance_status: ["pass", "fail", "overridden"],
      drone_status: ["ready", "in_flight", "maintenance", "out_of_service"],
      incident_severity: ["low", "medium", "high", "critical"],
      incident_type: [
        "crash",
        "drift",
        "injury",
        "equipment_failure",
        "near_miss",
      ],
      job_state: [
        "draft",
        "compliance",
        "inquiry",
        "confirmed",
        "crew_assigned",
        "in_progress",
        "complete",
        "invoiced",
        "paid",
        "wishlist",
        "comp_fail",
        "cancelled",
        "failed",
        "disputed",
      ],
      sortie_state: ["pending", "pre_flight", "active", "closed", "aborted"],
      user_role: [
        "owner",
        "admin",
        "operations",
        "accountant",
        "support",
        "viewer",
        "pilot",
        "farmer",
      ],
      wishlist_status: [
        "waiting",
        "notified",
        "confirmed",
        "expired",
        "cancelled",
      ],
    },
  },
} as const
