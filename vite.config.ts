import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vercel Supabase integration sets SUPABASE_* / NEXT_PUBLIC_* — map to Vite client vars at build time.
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';
const supabaseAnon =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const ouraClientId =
  process.env.VITE_OURA_CLIENT_ID ||
  process.env.OURA_CLIENT_ID ||
  '';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
    'import.meta.env.VITE_OURA_CLIENT_ID': JSON.stringify(ouraClientId),
  },
  build: { outDir: 'dist', sourcemap: false },
  server: { port: 5183 },
});
