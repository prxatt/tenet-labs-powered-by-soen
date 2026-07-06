# Tenet Labs · powered by SOEN

> The umbrella is **Tenet Labs**. Only the hardware is called **Tenet Sense**. This app is the pre-upgraded SOEN mini-app prototype (main private repo: github.com/prxatt/SOEN · this prototype: github.com/prxatt/tenet-labs-powered-by-soen).

Personal planning web app for Pratt — boxing camp, TENET Boxing build, TENET Sense hobby lab, life habits. Single-file, zero build step.

## v6 — structure
- **Rhythm** (home): calendar + score + health + fuel-of-the-day + done/outstanding + capture + build tracker, one page.
- **Fuel**: recipes categorized breakfast / lunch / dinner / snacks, chicken-forward high-protein rotation.
- **Roadmap**: TENET Boxing / Sense plans, filming rig, pipeline, Claude Code first prompt, progress expectations.
- Slash command is a floating glass dock at the bottom — calendar events only (`/` to focus).
- Liquid-glass UI (iOS 27 direction), transitive-cluster overlap lanes in the day timeline (no more collisions/cutoffs).

## Deploy (GitHub → Vercel)
1. Repo: `github.com/prxatt/tenet-labs-powered-by-soen` — this folder pushes there (`git push`).
2. vercel.com → Add New Project → Import the repo → Deploy (no settings needed — static).
3. Every future `git push` auto-redeploys.
4. iPhone/iPad: open the URL in Safari → Share → **Add to Home Screen** → full-screen app. Mac: Safari → File → Add to Dock.

## API keys — clarity
- **Oura**: only a **Personal Access Token** (cloud.ouraring.com → Personal Access Tokens). No client secret needed — ID+secret are for OAuth multi-user apps only.
- **Gemini**: separate key from aistudio.google.com (free tier is enough).
- Keys are **not interchangeable** between services. Enter both in the app's Settings, once per device.
- Storage: keys are AES-256-GCM encrypted at rest; the encryption key is a non-extractable CryptoKey in the browser's IndexedDB. Nothing is ever committed to this repo. You are never logged out.

## Cross-device
Oura + Gemini data follow you via their clouds. Local edits (moves, done-marks, logs) are per-device; use Settings → Export/Import backup to carry them over. A true free realtime sync needs a backend — that's the React Native version's job.

## Claude Code migration path
Open this folder in Claude Code (`claude` in the repo directory). Suggested evolution:
1. Split `index.html` → `src/` (extract CSS/JS), add Vite. 2. Add a tiny Vercel serverless function to proxy Oura/Gemini so keys move to env vars (`OURA_TOKEN`, `GEMINI_API_KEY` in Vercel project settings). 3. Add Vercel KV or Supabase free tier for cross-device state. 4. Port screens to React Native (Expo) — the data model (blocks/moves/done/logs) transfers as-is.

## Separate future app: Sense Logger
Own repo + own Claude Code project. Scope: record gym sessions (camera), tag/browse clips, run pose pipeline results, later ingest ESP32/LSM6DSOX IMU streams. Keep this planner app and the logger separate — planner = SOEN prototype, logger = TENET Sense capture tool.

## Local AI (offline / flights)
Run `OLLAMA_ORIGINS="*" ollama serve` + `ollama pull llama3.2` on the MacBook Pro, enable Local AI in Settings. Provider chain: Ollama → Groq → Gemini — the app works fully offline for planning + AI parsing when local is on. This mirrors the iOS 27 on-device direction; when the React Native build lands, swap the Ollama call for Apple's on-device model API.

## GitHub build tracker
Settings → add `user/tenet-boxing-repo` and `prxatt/SOEN`. Public repos need no token; private repos need step 2 (serverless proxy with a GitHub PAT in Vercel env vars).
