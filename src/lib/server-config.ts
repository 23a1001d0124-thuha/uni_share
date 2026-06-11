import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Gemini AI configuration
const geminiApiKey = process.env.GEMINI_API_KEY || "";
export const ai = geminiApiKey 
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// JWT configuration
export const JWT_SECRET = process.env.JWT_SECRET || "unishare_secret_key_development_2026";
