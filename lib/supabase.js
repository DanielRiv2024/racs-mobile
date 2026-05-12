// lib/supabase.js
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://arzbanrxrnywgmgdrakl.supabase.co";
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyemJhbnJ4cm55d2dtZ2RyYWtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjgxMDgzNiwiZXhwIjoyMDkyMzg2ODM2fQ.FZ9O12G6asn8sLkryGBPdbQNjlmmIk_OoL7x_kn5nv8"; // misma del .env web

console.log("🔵 Supabase URL:", SUPABASE_URL);
console.log("🔵 Supabase KEY:", SUPABASE_KEY ? "✅ SET" : "❌ NOT SET");

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage:          AsyncStorage,  // en móvil usa AsyncStorage
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
});
console.log("🔵 Supabase client created");