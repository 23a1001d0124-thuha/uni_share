import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = (): boolean => {
  return typeof supabaseUrl === "string" && supabaseUrl.length > 0 &&
         typeof supabaseAnonKey === "string" && supabaseAnonKey.length > 0;
};

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = getSupabaseClient();
