import { createClient } from '@supabase/supabase-js';

// Strips anything outside printable ASCII — a stray character from a
// copy-paste (smart quote, non-breaking space, BOM) survives into these
// build-time env values silently, but breaks every request once this
// value hits an HTTP header: browsers throw "Failed to execute 'set' on
// 'Headers': String contains non ISO-8859-1 code point" for the apikey/
// Authorization headers, which supabase-js surfaces as a generic network
// error, not something pointing at the actual bad character.
function sanitizeEnvValue(value: string | undefined): string {
  return (value ?? '').trim().replace(/[^\x20-\x7E]/g, '');
}

const supabaseUrl = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
