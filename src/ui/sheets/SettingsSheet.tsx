import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { DEFAULT_OLLAMA_MODEL, getLocalKeys, hasOuraConnected, OLLAMA_MODELS, setLocalKeys, syncOura } from '../../core/api';
import { startOuraConnect } from '../../core/ouraOAuth';
import { ensureSession, hasSupabase, migrateLocalSecrets, saveSecrets, secretsStatus, signInMagic, signOut, supa } from '../../core/sync';
import { store } from '../../core/store';
import { useApp, toast } from '../hooks';
import Sheet from '../Sheet';

const COOLDOWN_SEC = 15;

function friendlyAuthError(msg: string): string {
  if (/rate limit|over_email_send_rate_limit/i.test(msg)) {
    return 'Too many emails sent. Check your inbox for an older link first, then wait ~15 min.';
  }
  return msg;
}

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const prefs = app.plan.prefs;
  const lk = getLocalKeys();
  const [gem, setGem] = useState('');
  const [groq, setGroq] = useState('');
  const [github, setGithub] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailErr, setEmailErr] = useState('');
  const [ouraBusy, setOuraBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [have, setHave] = useState({ oura: hasOuraConnected(), gemini: !!lk.gemini, groq: !!lk.groq, github: !!lk.github });
  const [repoA, setRepoA] = useState(prefs.repoA || '');
  const [repoB, setRepoB] = useState(prefs.repoB || 'prxatt/tenet-labs-powered-by-soen');
  const [ollama, setOllama] = useState(!!prefs.ollama);
  const [ollamaModel, setOllamaModel] = useState(prefs.ollamaModel || DEFAULT_OLLAMA_MODEL);
  const signedIn = !!session;

  useEffect(() => {
    void ensureSession().then(setSession);
    if (!hasSupabase()) return;
    const { data: { subscription } } = supa().auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (!signedIn) return;
    void migrateLocalSecrets();
    void secretsStatus().then(s => setHave(h => ({
      oura: h.oura || s.oura, gemini: h.gemini || s.gemini, groq: h.groq || s.groq, github: h.github || s.github,
    })));
  }, [signedIn]);

  const ouraSyncToast = (r: Awaited<ReturnType<typeof syncOura>>) => {
    if (r === 'ok') return 'Oura synced ✓';
    if (r === 'oura_api_error') return 'Oura session expired — tap Connect with Oura again';
    if (r === 'nokey') return 'Tap Connect with Oura first';
    if (r === 'err') return 'No Oura data yet — try again later';
    if (r === 'network') return 'No network';
    return 'Could not sync Oura';
  };

  const saveOtherKeys = async () => {
    const payload = {
      ...(gem.trim() && { gemini: gem.trim() }),
      ...(groq.trim() && { groq: groq.trim() }),
      ...(github.trim() && { github: github.trim() }),
    };
    if (!Object.keys(payload).length) { toast('Paste at least one key'); return; }

    setLocalKeys(payload);
    setHave(h => ({
      oura: h.oura,
      gemini: h.gemini || !!gem.trim(),
      groq: h.groq || !!groq.trim(),
      github: h.github || !!github.trim(),
    }));
    setGem(''); setGroq(''); setGithub('');
    toast('Keys saved on this device');

    if (signedIn) {
      const { error } = await saveSecrets(payload);
      if (error) toast('Cloud backup failed: ' + error);
      else toast('Also backed up to your account');
    }
  };

  const savePrefs = () => {
    store.updatePlan(p => ({ prefs: { ...p.prefs, repoA: repoA.trim(), repoB: repoB.trim(), ollama, ollamaModel: ollamaModel.trim() || DEFAULT_OLLAMA_MODEL } }));
    toast('Preferences saved');
  };

  const setGymHere = () => {
    navigator.geolocation.getCurrentPosition(p => {
      store.updatePlan(pl => ({ prefs: { ...pl.prefs, gymLoc: { la: p.coords.latitude, lo: p.coords.longitude } } }));
      toast('Gym location saved');
    }, () => toast('Location permission needed'));
  };

  const setHomeHere = () => {
    navigator.geolocation.getCurrentPosition(p => {
      store.updatePlan(pl => ({ prefs: { ...pl.prefs, homeLoc: { la: p.coords.latitude, lo: p.coords.longitude } } }));
      toast('Home location saved (local only)');
    }, () => toast('Location permission needed'));
  };

  const exportData = () => {
    const a = document.createElement('a');
    a.href = 'data:application/json,' + encodeURIComponent(JSON.stringify({ plan: app.plan, oura: app.oura }));
    a.download = 'tenet-labs-backup.json'; a.click();
    toast('Backup downloaded');
  };

  const importData = () => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json';
    i.onchange = () => {
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(String(r.result));
          if (d.plan) store.replacePlan({ ...d.plan, updatedAt: Date.now() });
          if (d.oura) store.setOura(d.oura);
          store.onPlanChange?.(store.get().plan);
          toast('Imported');
        } catch { toast('Invalid file'); }
      };
      r.readAsText(i.files![0]);
    };
    i.click();
  };

  const sendMagicLink = async () => {
    setEmailErr('');
    if (!email.includes('@')) { setEmailErr('Enter a valid email'); return; }
    const { error } = await signInMagic(email.trim());
    if (error) { toast(friendlyAuthError(error)); return; }
    setSent(true);
    setCooldown(COOLDOWN_SEC);
    toast('Email sent — tap the link on this same phone');
  };

  const K = (k: boolean) => k ? <span style={{ color: 'var(--green)', fontWeight: 800 }}> ✓</span> : null;

  return (
    <Sheet onClose={onClose}>
      <h3 className="serif">Settings</h3>

      {/* ---- Oura first: no account required ---- */}
      <div className="sec sec-oura">
        <h6>OURA</h6>
        <p style={{ fontSize: '.68rem', color: 'var(--sub)', marginBottom: 8 }}>
          Oura removed personal tokens in 2025 — tap <b>Connect with Oura</b> to sign in with your Oura account.
          {have.oura ? <span style={{ color: 'var(--green)', fontWeight: 800 }}> Connected{K(true)}</span> : null}
        </p>
        <button className="btnP" onClick={() => {
          try { startOuraConnect(); } catch (e) { toast(String(e instanceof Error ? e.message : e)); }
        }}>Connect with Oura</button>
        <button className="btnS" disabled={ouraBusy} onClick={async () => {
          setOuraBusy(true);
          const r = await syncOura();
          setOuraBusy(false);
          toast(ouraSyncToast(r));
          setHave(h => ({ ...h, oura: hasOuraConnected() }));
        }}>{ouraBusy ? 'Syncing…' : 'Sync Oura now'}</button>
      </div>

      {/* ---- Other keys ---- */}
      <div className="sec">
        <h6>AI &amp; GITHUB KEYS — OPTIONAL</h6>
        <p style={{ fontSize: '.68rem', color: 'var(--sub)', marginBottom: 6 }}>
          Gemini{K(have.gemini)} · Groq{K(have.groq)} · GitHub{K(have.github)}
        </p>
        <input type="password" placeholder="Gemini key — AIza…" value={gem} onChange={e => setGem(e.target.value)} />
        <div style={{ height: 8 }} />
        <input type="password" placeholder="Groq key — gsk_…" value={groq} onChange={e => setGroq(e.target.value)} />
        <div style={{ height: 8 }} />
        <input type="password" placeholder="GitHub PAT — ghp_…" value={github} onChange={e => setGithub(e.target.value)} />
        <button className="btnP" onClick={() => void saveOtherKeys()}>Save AI keys</button>
      </div>

      {/* ---- Cross-device: clearly optional ---- */}
      <div className="sec sec-sync">
        <h6>CROSS-DEVICE SYNC — OPTIONAL</h6>
        <p style={{ fontSize: '.68rem', color: 'var(--sub)', marginBottom: 8 }}>
          Only needed so <b>check-offs</b> match on iPhone + iPad + Mac. Oura works without this.
          {signedIn
            ? <> Signed in as <b>{session?.user.email}</b>.</>
            : <> Not signed in — check-offs stay on this device only.</>}
        </p>
        {!hasSupabase() ? (
          <p style={{ fontSize: '.68rem', color: 'var(--amber)' }}>Cloud not connected on this deploy — ask to link Supabase in Vercel.</p>
        ) : signedIn ? (
          <>
            <p style={{ fontSize: '.68rem', color: 'var(--green)', fontWeight: 700 }}>
              Cloud sync {app.sync === 'ok' ? 'active ✓' : app.sync === 'syncing' ? 'syncing…' : app.sync}
            </p>
            <button className="btnS" onClick={() => { void signOut(); toast('Signed out'); }}>Sign out</button>
          </>
        ) : (
          <>
            <input type="email" placeholder="you@email.com" value={email} onChange={e => { setEmail(e.target.value); setEmailErr(''); }} />
            {emailErr && <p style={{ fontSize: '.66rem', color: 'var(--red)', marginTop: 4 }}>{emailErr}</p>}
            {sent && (
              <p style={{ fontSize: '.68rem', color: 'var(--green)', marginTop: 6 }}>
                Email sent — open the link <b>on this same device</b>.{cooldown > 0 ? ` Resend in ${cooldown}s.` : ''}
              </p>
            )}
            <button className="btnP" disabled={cooldown > 0 && sent} onClick={() => void sendMagicLink()}>
              {cooldown > 0 && sent ? `Resend in ${cooldown}s` : 'Email me a sign-in link'}
            </button>
          </>
        )}
      </div>

      <div className="sec"><h6>Local AI — Ollama</h6>
        <div className="two">
          <select value={ollamaModel} onChange={e => setOllamaModel(e.target.value)} style={{ width: '100%' }}>
            {OLLAMA_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <button className="btnS" style={{ margin: 0 }} onClick={() => setOllama(v => !v)}>{ollama ? 'ON' : 'OFF'}</button>
        </div>
      </div>

      <div className="sec"><h6>GitHub build tracker</h6>
        <div className="two">
          <input placeholder="TENET Boxing: user/repo" value={repoA} onChange={e => setRepoA(e.target.value)} />
          <input placeholder="SOEN: prxatt/tenet-labs-powered-by-soen" value={repoB} onChange={e => setRepoB(e.target.value)} />
        </div>
      </div>
      <button className="btnP" onClick={savePrefs}>Save preferences</button>

      <div className="sec"><h6>Location (local only)</h6>
        <button className="btnS" onClick={setGymHere}>Save gym location</button>
        <button className="btnS" onClick={setHomeHere}>Save home location</button>
      </div>

      <div className="sec"><h6>Backup</h6>
        <button className="btnS" onClick={exportData}>Export</button>
        <button className="btnS" onClick={importData}>Import</button>
      </div>

      <div className="sec"><h6>Reset</h6>
        <button className="btnS" onClick={() => {
          if (confirm('Erase all local data on this device?')) { localStorage.clear(); location.reload(); }
        }}>Erase this device</button>
      </div>
    </Sheet>
  );
}
