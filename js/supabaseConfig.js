/* ==========================================================================
   Supabase Configuration
   - Replace these values with your actual Supabase project URL and anon key.
   ========================================================================== */

const SUPABASE_URL = 'https://fshdfzborigivsobcdut.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_t3gioVJoUvnIijfGK1dt2A_pfha9N-Z';

// Initialize the Supabase client
// This assumes the Supabase JS library is loaded via CDN in index.html
window.db = null;

if (typeof window.supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE') {
    window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase client initialized.");
} else {
    console.warn("Supabase is not configured yet. Multiplayer features will not work.");
}
