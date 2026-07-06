/**
 * Single Vercel serverless function.
 * POST /api/soen  { service: 'ai', prompt }        → { text }
 * POST /api/soen  { service: 'oura', start, end }  → { readiness, dailySleep, sleep, activity, stress }
 *
 * Auth: Supabase access token in Authorization header. Keys are read from
 * user_secrets with the service-role key — they never reach the browser.
 */
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  if (!SUPABASE_URL || !SERVICE_KEY) { res.status(500).json({ error: 'backend_not_configured' }); return; }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: 'no_auth' }); return; }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: userData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !userData?.user) { res.status(401).json({ error: 'bad_auth' }); return; }
  const uid = userData.user.id;

  const { data: secrets } = await admin
    .from('user_secrets')
    .select('oura_token, gemini_key, groq_key')
    .eq('user_id', uid)
    .maybeSingle();

  const body = req.body || {};

  try {
    if (body.service === 'oura') {
      const tok = secrets?.oura_token;
      if (!tok) { res.status(200).json({ error: 'no_token' }); return; }
      const start = String(body.start || ''), end = String(body.end || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        res.status(400).json({ error: 'bad_dates' }); return;
      }
      const q = (p: string) =>
        fetch(`https://api.ouraring.com/v2/usercollection/${p}?start_date=${start}&end_date=${end}`, {
          headers: { Authorization: 'Bearer ' + tok },
        }).then(r => (r.ok ? r.json() : { data: [] }));
      const [readiness, dailySleep, sleep, activity, stress] = await Promise.all([
        q('daily_readiness'), q('daily_sleep'), q('sleep'), q('daily_activity'), q('daily_stress'),
      ]);
      res.status(200).json({ readiness, dailySleep, sleep, activity, stress });
      return;
    }

    if (body.service === 'ai') {
      const prompt = String(body.prompt || '').slice(0, 24000);
      if (!prompt) { res.status(400).json({ error: 'no_prompt' }); return; }
      // Groq first (fastest free inference), Gemini fallback
      if (secrets?.groq_key) {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + secrets.groq_key },
            body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
          });
          if (r.ok) {
            const j = await r.json();
            res.status(200).json({ text: j.choices[0].message.content });
            return;
          }
        } catch { /* fall through to Gemini */ }
      }
      if (secrets?.gemini_key) {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${secrets.gemini_key}`,
          {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          },
        );
        if (r.ok) {
          const j = await r.json();
          res.status(200).json({ text: j.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer.' });
          return;
        }
        res.status(200).json({ error: 'ai_failed' });
        return;
      }
      res.status(200).json({ error: 'no_ai_key' });
      return;
    }

    res.status(400).json({ error: 'unknown_service' });
  } catch (e: any) {
    res.status(500).json({ error: 'server', detail: String(e?.message || e) });
  }
}
