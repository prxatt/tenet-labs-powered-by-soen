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

async function pullOura(tok: string, start: string, end: string) {
  const pairs: [string, string][] = [
    ['daily_readiness', 'readiness'],
    ['daily_sleep', 'dailySleep'],
    ['sleep', 'sleep'],
    ['daily_activity', 'activity'],
    ['daily_stress', 'stress'],
  ];
  const out: Record<string, { data: unknown[] }> = {};
  let authBad = false;

  for (const [path, key] of pairs) {
    const r = await fetch(
      `https://api.ouraring.com/v2/usercollection/${path}?start_date=${start}&end_date=${end}`,
      { headers: { Authorization: 'Bearer ' + tok } },
    );
    if (r.status === 401) { authBad = true; break; }
    if (r.ok) out[key] = await r.json();
    else out[key] = { data: [] }; // 403/404 on stress etc. — token can still be valid
  }

  if (authBad) {
    const err: any = new Error('oura_401');
    err.status = 401;
    throw err;
  }

  const hasData = Object.values(out).some(v => Array.isArray(v?.data) && v.data.length > 0);
  if (!hasData) {
    const err: any = new Error('oura_empty');
    err.status = 0;
    throw err;
  }
  return out;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }

  const body = req.body || {};

  /* Oura from phone — browsers cannot call api.ouraring.com (CORS). Proxy here, no sign-in needed. */
  if (body.service === 'oura_proxy') {
    const tok = String(body.oura_token || '').trim();
    const start = String(body.start || ''), end = String(body.end || '');
    if (!tok) { res.status(200).json({ error: 'no_token' }); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      res.status(400).json({ error: 'bad_dates' }); return;
    }
    try {
      res.status(200).json(await pullOura(tok, start, end));
    } catch (e: any) {
      const st = e?.status || 0;
      if (st === 401) res.status(200).json({ error: 'oura_rejected' });
      else if (st === 0) res.status(200).json({ error: 'oura_empty' });
      else res.status(200).json({ error: 'oura_failed', status: st });
    }
    return;
  }

  if (!SUPABASE_URL || !SERVICE_KEY) { res.status(500).json({ error: 'backend_not_configured' }); return; }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: 'no_auth' }); return; }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: userData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !userData?.user) { res.status(401).json({ error: 'bad_auth' }); return; }
  const uid = userData.user.id;

  const { data: secrets } = await admin
    .from('user_secrets')
    .select('oura_token, gemini_key, groq_key, github_token')
    .eq('user_id', uid)
    .maybeSingle();

  try {
    if (body.service === 'oura') {
      const tok = secrets?.oura_token;
      if (!tok) { res.status(200).json({ error: 'no_token' }); return; }
      const start = String(body.start || ''), end = String(body.end || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        res.status(400).json({ error: 'bad_dates' }); return;
      }
      try {
        res.status(200).json(await pullOura(tok, start, end));
      } catch (e: any) {
        const st = e?.status || 0;
        if (st === 401) res.status(200).json({ error: 'oura_rejected' });
        else if (st === 0) res.status(200).json({ error: 'oura_empty' });
        else res.status(200).json({ error: 'oura_failed', status: st });
      }
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

    if (body.service === 'github') {
      const slug = String(body.repo || '').trim();
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(slug)) {
        res.status(400).json({ error: 'bad_repo' }); return;
      }
      const tok = secrets?.github_token || process.env.GITHUB_TOKEN || '';
      if (!tok) { res.status(200).json({ error: 'no_github_token' }); return; }
      const r = await fetch(`https://api.github.com/repos/${slug}/commits?per_page=1`, {
        headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' },
      });
      if (!r.ok) { res.status(200).json({ error: 'github_failed' }); return; }
      const j = await r.json();
      const dt = new Date(j[0].commit.author.date);
      const days = Math.floor((Date.now() - dt.getTime()) / 864e5);
      res.status(200).json({ days, msg: j[0].commit.message.split('\n')[0].slice(0, 48) });
      return;
    }

    if (body.service === 'recipe_import') {
      const url = String(body.url || '').trim();
      const imageBase64 = String(body.imageBase64 || '').slice(0, 8_000_000);
      const hint = String(body.hint || '');
      if (!url && !imageBase64) { res.status(400).json({ error: 'no_input' }); return; }
      if (!secrets?.gemini_key) { res.status(200).json({ error: 'no_ai_key' }); return; }

      let content = '';
      if (url) {
        if (!/^https?:\/\//i.test(url)) { res.status(400).json({ error: 'bad_url' }); return; }
        try {
          const fr = await fetch(url, { headers: { 'User-Agent': 'TenetLabs-SOEN/1.0' }, redirect: 'follow' });
          const html = await fr.text();
          content = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 24000);
        } catch {
          res.status(200).json({ error: 'fetch_failed' }); return;
        }
      }

      const prompt = url
        ? `Extract a complete recipe from this web page text. Return ONLY JSON: {"c":"Breakfast"|"Lunch"|"Dinner"|"Snacks & Dessert","n":"Name","tag":"Category · X min","mac":"~NNN kcal · NNg P","ing":["…"],"st":["…"]}. Text: ${content}`
        : `Extract recipe from image. Return ONLY JSON with keys c,n,tag,mac,ing,st. ${hint}`;

      const parts: any[] = [{ text: prompt }];
      if (imageBase64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } });

      const gr = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${secrets.gemini_key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }) },
      );
      if (!gr.ok) { res.status(200).json({ error: 'ai_failed' }); return; }
      const gj = await gr.json();
      const text = gj.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) { res.status(200).json({ error: 'parse_failed' }); return; }
      try {
        const recipe = JSON.parse(m[0]);
        res.status(200).json({ recipe });
      } catch {
        res.status(200).json({ error: 'parse_failed' });
      }
      return;
    }

    res.status(400).json({ error: 'unknown_service' });
  } catch (e: any) {
    res.status(500).json({ error: 'server', detail: String(e?.message || e) });
  }
}
