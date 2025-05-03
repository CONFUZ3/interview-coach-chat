
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          type?: "resume" | "interview";
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
          type?: "resume" | "interview";
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          type?: "resume" | "interview";
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          created_at: string;
          content: string;
          type: "user" | "ai";
          format?: "text" | "feedback";
        };
        Insert: {
          id?: string;
          conversation_id: string;
          created_at?: string;
          content: string;
          type: "user" | "ai";
          format?: "text" | "feedback";
        };
        Update: {
          id?: string;
          conversation_id?: string;
          created_at?: string;
          content?: string;
          type?: "user" | "ai";
          format?: "text" | "feedback";
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name?: string;
          email?: string;
          phone?: string;
          resume_text?: string;
          updated_at?: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email?: string;
          phone?: string;
          resume_text?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string;
          resume_text?: string;
          updated_at?: string;
        };
      };
      resumes: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          job_title?: string;
          company?: string;
          conversation_id?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          job_title?: string;
          company?: string;
          conversation_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          job_title?: string;
          company?: string;
          conversation_id?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
