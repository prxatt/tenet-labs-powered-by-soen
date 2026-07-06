# Tenet Labs · powered by SOEN

> The umbrella is **Tenet Labs**. Only the hardware is called **Tenet Sense**. This app is the pre-upgraded SOEN mini-app prototype (main private repo: github.com/prxatt/SOEN · this prototype: github.com/prxatt/tenet-labs-powered-by-soen).

Personal planning web app for Pratt — boxing camp, TENET Boxing build, TENET Sense hobby lab, life habits.

**Live:** [tenet-labs-powered-by-soen.vercel.app](https://tenet-labs-powered-by-soen.vercel.app)  
**Legacy v6 fallback (no build):** `/legacy-v6.html` on the same domain.

## v7 — Vite + React + Supabase

| Layer | What |
|-------|------|
| **UI** | Vite + React 19 + TypeScript — `src/ui/` |
| **Core** | Platform-agnostic logic in `src/core/` (React Native reuses this unchanged) |
| **Sync** | Supabase magic-link auth + `plan_state` jsonb row per user |
| **Secrets** | Oura / Gemini / Groq keys in `user_secrets` — write-only from browser, read by serverless only |
| **API** | `api/soen.ts` — one Vercel function proxies Oura + AI |

### Pages
- **Rhythm** — dashboard + integrated day/week/month calendar, scores, health, fuel-of-the-day, done/outstanding, capture, record-today checklist, slash dock (events + `recipe:`)
- **Fuel** — breakfast / lunch / dinner / snacks recipes, AI recipe creation into your FuelStack
- **Roadmap** — visual phase timeline, pipeline animation, camera rig, Saturday lab steps, Claude Code prompt

### Features
- Edit any event (title, notes, day, time, length, color) — base blocks use an `edits` overlay
- Overlap-safe timeline — transitive cluster lanes + tap-to-expand full width
- Drag cards between days · drag/tap day headers to swap whole days
- Cross-device sync when signed in (magic link)
- Local-only mode still works with zero backend config

## Local development

```bash
npm install
npm run dev          # http://localhost:5183
npm run build        # tsc + vite → dist/
```

Copy `.env.example` → `.env.local` and add your Supabase URL + anon key for sync testing.

Without Supabase env vars the app runs in **local-only mode** — same as v6, keys stored in browser localStorage.

## Deploy (GitHub → Vercel)

1. Push to `github.com/prxatt/tenet-labs-powered-by-soen`
2. Vercel auto-deploys on every push (framework: Vite, output: `dist/`)
3. Add these **Vercel environment variables** (Project → Settings → Environment Variables):

| Variable | Where | Scope |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API | Production + Preview |
| `VITE_SUPABASE_ANON_KEY` | same | Production + Preview |
| `SUPABASE_URL` | same URL | Production + Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (service role — never expose to client) | Production + Preview |

4. Run [`supabase/schema.sql`](supabase/schema.sql) once in Supabase SQL editor
5. iPhone: Safari → Share → **Add to Home Screen**

## Backend setup (one time)

1. Supabase project → Authentication → enable Email provider
2. SQL editor → paste and run `supabase/schema.sql`
3. In the app: Settings → enter email → magic link → sign in
4. Settings → paste Oura + Gemini (+ optional Groq) keys → **Save keys** (stored server-side)
5. Plan state syncs automatically; green dot in header = cloud sync active

## API keys

- **Oura**: Personal Access Token only (cloud.ouraring.com). No OAuth client secret needed.
- **Gemini**: aistudio.google.com free tier
- **Groq** (optional): console.groq.com — faster free inference
- Keys are **not interchangeable** between services
- When signed in: keys never touch the browser after save
- When not signed in: keys stored locally (v6 behavior)

## AI provider chain

1. Ollama localhost (if enabled in Settings) — works offline on flights
2. Serverless Groq → Gemini (when signed in + keys saved)
3. Local browser keys (fallback)

## React Native path

`src/core/` has zero React/DOM imports. When you start Expo:
- Import `store`, `schedule`, `scoring`, `sync`, `api` from core
- Rebuild `src/ui/` as React Native screens
- Same Supabase tables and `api/soen.ts` endpoint

## Separate future app: Tenet Sense Logger

Own repo for hardware capture + vision pipeline. This planner stays separate.
