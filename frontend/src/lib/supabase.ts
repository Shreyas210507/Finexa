import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xenzxbmamgymsewzyhna.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlbnp4Ym1hbWd5bXNld3p5aG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0Nzc1MzIsImV4cCI6MjEwOTA1MzUzMn0.y5TVhjjVPHg4WixNruan8HFEzH_YNLGAP62WPqNbgRU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function createSupabaseBrowserClient() {
  return supabase;
}
