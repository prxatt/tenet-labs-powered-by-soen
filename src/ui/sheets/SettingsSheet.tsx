import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { DEFAULT_OLLAMA_MODEL, getLocalKeys, OLLAMA_MODELS, setLocalKeys, syncOura } from '../../core/api';
import { ensureSession, hasSupabase, saveSecrets, secretsStatus, signInMagic, signOut, supa } from '../../core/sync';
import { store } from '../../core/store';
import { useApp, toast } from '../hooks';
import Sheet from '../Sheet';

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const prefs = app.plan.prefs;
  const lk = getLocalKeys();
  const [oura, setOura] = useState('');
  const [gem, setGem] = useState('');
  const [groq, setGroq] = useState('');
  const [github, setGithub] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [have, setHave] = useState({ oura: !!lk.oura, gemini: !!lk.gemini, groq: !!lk.groq, github: !!lk.github });
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
    if (signedIn) void secretsStatus().then(s => setHave(h => ({
      oura: h.oura || s.oura, gemini: h.gemini || s.gemini, groq: h.groq || s.groq, github: h.github || s.github,
    })));
  }, [signedIn]);

  const saveKeys = async () => {
    const payload = {
      ...(oura.trim() && { oura: oura.trim() }),
      ...(gem.trim() && { gemini: gem.trim() }),
      ...(groq.trim() && { groq: groq.trim() }),
      ...(github.trim() && { github: github.trim() }),
    };
    if (!Object.keys(payload).length) { toast('Paste at least one key'); return; }

    const s = await ensureSession();
    if (s) {
      const { error } = await saveSecrets(payload);
      if (error) { toast('Key save failed: ' + error); return; }
      toast('Keys saved to your encrypted backend');
    } else {
      setLocalKeys(payload);
      toast('Keys saved on this device — open your magic link on this phone to move them server-side');
    }
    setOura(''); setGem(''); setGroq(''); setGithub('');
    if (oura.trim()) void syncOura();
    setHave(h => ({
      oura: h.oura || !!oura.trim(),
      gemini: h.gemini || !!gem.trim(),
      groq: h.groq || !!groq.trim(),
      github: h.github || !!github.trim(),
    }));
  };

  const savePrefs = () => {
    store.updatePlan(p => ({ prefs: { ...p.prefs, repoA: repoA.trim(), repoB: repoB.trim(), ollama, ollamaModel: ollamaModel.trim() || DEFAULT_OLLAMA_MODEL } }));
    toast('Saved — synced');
  };

  const setGymHere = () => {
    navigator.geolocation.getCurrentPosition(p => {
      store.updatePlan(pl => ({ prefs: { ...pl.prefs, gymLoc: { la: p.coords.latitude, lo: p.coords.longitude } } }));
      toast('Gym location saved');
    }, () => toast('Location permission needed'));
  };

  const exportData = () => {
    const a = document.createElement('a');
    a.href = 'data:application/json,' + encodeURIComponent(JSON.stringify({ plan: app.plan, oura: app.oura }));
    a.download = 'tenet-labs-backup.json'; a.click();
    toast('Backup downloaded (keys NOT included — by design)');
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
          toast('Imported — synced');
        } catch { toast('Invalid file'); }
      };
      r.readAsText(i.files![0]);
    };
    i.click();
  };

  const K = (k: boolean) => k ? <span style={{ color: 'var(--green)', fontWeight: 800 }}> · saved ✓</span> : null;
  const syncLabel = signedIn
    ? (app.sync === 'ok' ? 'cloud — ' + (session?.user.email || app.email) : app.sync)
    : 'this device only';

  return (
    <Sheet onClose={onClose}>
      <h3 className="serif">Settings</h3>
      <div className="sub">Sync: <b>{syncLabel}</b></div>

      <div className="sec"><h6>Account — cross-device sync</h6>
        {!hasSupabase() ? (
          <p style={{ fontSize: '.68rem', color: 'var(--sub)' }}>Backend not configured yet — redeploy after Supabase is linked in Vercel.</p>
        ) : signedIn ? (
          <button className="btnS" onClick={() => { void signOut(); toast('Signed out — local mode'); }}>Sign out ({session?.user.email})</button>
        ) : sent ? (
          <p style={{ fontSize: '.72rem', color: 'var(--green)', fontWeight: 700 }}>Magic link sent — open it on this device. You will stay signed in.</p>
        ) : (
          <>
            <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            <button className="btnP" onClick={async () => {
              if (!email.includes('@')) return;
              const { error } = await signInMagic(email.trim());
              if (error) toast('Sign-in failed: ' + error); else setSent(true);
            }}>Email me a magic link</button>
          </>
        )}
      </div>

      <div className="sec"><h6>API keys {signedIn ? '— stored server-side, never in the browser' : '— stored on this device until you sign in'}</h6>
        <p style={{ fontSize: '.68rem', color: 'var(--sub)', marginBottom: 6 }}>
          Oura: Personal Access Token (cloud.ouraring.com){K(have.oura)}<br />
          Gemini: aistudio.google.com free tier{K(have.gemini)}<br />
          Groq (optional, fastest): console.groq.com{K(have.groq)}<br />
          GitHub PAT (private repos): github.com/settings/tokens{K(have.github)}
        </p>
        <input type="password" placeholder="Oura Personal Access Token" value={oura} onChange={e => setOura(e.target.value)} />
        <div style={{ height: 8 }} />
        <input type="password" placeholder="Gemini key — AIza…" value={gem} onChange={e => setGem(e.target.value)} />
        <div style={{ height: 8 }} />
        <input type="password" placeholder="Groq key — gsk_…" value={groq} onChange={e => setGroq(e.target.value)} />
        <div style={{ height: 8 }} />
        <input type="password" placeholder="GitHub PAT — ghp_… (private repos)" value={github} onChange={e => setGithub(e.target.value)} />
        <button className="btnP" onClick={() => void saveKeys()}>Save keys</button>
      </div>

      <div className="sec"><h6>Local AI — Ollama (offline / flights)</h6>
        <p style={{ fontSize: '.68rem', color: 'var(--sub)', marginBottom: 6 }}>
          Run <b>OLLAMA_ORIGINS="*" ollama serve</b> on the MacBook Pro, then <b>ollama pull &lt;model&gt;</b> for each you use. SOEN tries local first when on.
        </p>
        <div className="two">
          <select value={ollamaModel} onChange={e => setOllamaModel(e.target.value)} style={{ width: '100%' }}>
            {OLLAMA_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <button className="btnS" style={{ margin: 0 }} onClick={() => setOllama(v => !v)}>{ollama ? 'Local AI: ON' : 'Local AI: OFF'}</button>
        </div>
      </div>

      <div className="sec"><h6>GitHub build tracker</h6>
        <div className="two">
          <input placeholder="TENET Boxing: user/repo" value={repoA} onChange={e => setRepoA(e.target.value)} />
          <input placeholder="SOEN: prxatt/tenet-labs-powered-by-soen" value={repoB} onChange={e => setRepoB(e.target.value)} />
        </div>
      </div>
      <button className="btnP" onClick={savePrefs}>Save preferences</button>

      <div className="sec"><h6>Location</h6>
        <button className="btnS" onClick={setGymHere}>I'm at the gym now — remember this location</button>
        <p className="hint" style={{ textAlign: 'left' }}>{prefs.gymLoc ? 'Gym saved ✓ — Gym Mode auto-activates within ~250 m.' : 'Not set. Tap the button while at Bay Breakers once.'}</p>
      </div>

      <div className="sec"><h6>Backup</h6>
        <button className="btnS" onClick={exportData}>Export backup file</button>
        <button className="btnS" onClick={importData}>Import backup file</button>
      </div>

      <div className="sec"><h6>Reset</h6>
        <button className="btnS" onClick={() => {
          if (confirm('Erase all local data on this device?')) { localStorage.clear(); location.reload(); }
        }}>Erase everything on this device</button>
      </div>
    </Sheet>
  );
}
