import { useRef, useState } from 'react';
import type { Recipe } from '../../core/types';
import { RECIPE_CATS, allRecipes } from '../../core/recipes';
import { recipePrompt, parseRecipe } from '../../core/ai';
import { aiCall, importRecipe } from '../../core/api';
import { store } from '../../core/store';
import { useApp, toast } from '../hooks';
import type { SheetReq } from '../App';

function Mono({ n }: { n: string }) {
  return <div className="mono">{n.charAt(0)}</div>;
}

export function generateRecipe(request: string): Promise<Recipe | null> {
  return aiCall(recipePrompt(request)).then(a => {
    if (!a) return null;
    try { return parseRecipe(a); } catch { return null; }
  });
}

export default function FuelPage({ openSheet }: { openSheet: (s: SheetReq) => void }) {
  const { plan } = useApp();
  const [req, setReq] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const R = allRecipes(plan.userRecipes);

  const saveRecipe = (r: Recipe) => {
    store.addRecipe(r);
    toast(`Added to ${r.c} — synced across devices`);
    openSheet({ type: 'recipe', recipe: r });
  };

  const gen = async () => {
    if (!req.trim() || busy) return;
    setBusy(true); setPhase('Writing recipe…');
    const r = await generateRecipe(req.trim());
    setBusy(false); setPhase('');
    if (!r) { toast('AI unavailable — add a Groq/Gemini key in Settings'); return; }
    setReq('');
    saveRecipe(r);
  };

  const importUrl = async () => {
    if (!url.trim() || busy) return;
    setBusy(true); setPhase('Reading link…');
    const r = await importRecipe({ url: url.trim() });
    setBusy(false); setPhase('');
    if (!r) { toast('Could not import — try a direct recipe URL or paste text in Create'); return; }
    setUrl('');
    saveRecipe(r);
  };

  const importPhoto = async (file: File) => {
    setBusy(true); setPhase('Reading photo…');
    const b64 = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1] || '');
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const r = await importRecipe({ imageBase64: b64, hint: file.name });
    setBusy(false); setPhase('');
    if (!r) { toast('Could not read recipe from image'); return; }
    saveRecipe(r);
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <h6 className="lab">IMPORT RECIPE — LINK, PHOTO, OR INSTAGRAM</h6>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste recipe URL or Instagram link…" style={{ marginTop: 8 }} />
        <button className="btnP" style={{ marginTop: 8 }} disabled={busy} onClick={() => void importUrl()}>
          {phase || 'Import from link'}
        </button>
        <div style={{ height: 10 }} />
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) void importPhoto(f); e.target.value = ''; }} />
        <button className="btnS" disabled={busy} onClick={() => fileRef.current?.click()}>
          Upload cookbook page or screenshot
        </button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h6 className="lab">CREATE WITH SOEN — OR USE recipe: IN THE DOCK</h6>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input value={req} onChange={e => setReq(e.target.value)} onKeyDown={e => e.key === 'Enter' && void gen()}
            placeholder="high-protein chicken katsu, air-fryer" />
          <button style={{ flex: '0 0 auto', border: 0, background: 'var(--ink)', color: '#fff', fontWeight: 800, fontSize: '.68rem', padding: '0 18px', borderRadius: 100, cursor: 'pointer' }}
            onClick={() => void gen()}>{busy ? '…' : 'Create'}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}><h6 className="lab">DAILY RHYTHM — GYM DAY</h6>
        <div className="g2" style={{ marginTop: 8 }}>
          <div>
            {[['7:40', 'Coffee + collagen · Yakult'], ['8:15', 'Breakfast (rotates below)'], ['10:45', 'Built Bar pre-gym'], ['3:00', 'Shake + main meal · D3K2 · CoQ10 · NAC']].map(x => (
              <div className="row" key={x[0]}><span className="k">{x[0]}</span><span>{x[1]}</span></div>
            ))}
          </div>
          <div>
            {[['7:00', 'Dinner (rotates below)'], ['9:00', 'Cacao ritual + magnesium'], ['~2450', 'kcal target · 150g+ protein'], ['Sat', 'real dessert, guilt-free']].map(x => (
              <div className="row" key={x[0]}><span className="k">{x[0]}</span><span>{x[1]}</span></div>
            ))}
          </div>
        </div>
      </div>

      {RECIPE_CATS.map(cat => {
        const list = R.filter(r => r.c === cat);
        if (!list.length) return null;
        return (
          <div key={cat}>
            <h6 className="lab" style={{ margin: '18px 4px 10px' }}>{cat.toUpperCase()} — TAP FOR FULL RECIPE</h6>
            <div className="g3">
              {list.map((r, i) => (
                <div className="card rcp" key={r.id || r.n + i} onClick={() => openSheet({ type: 'recipe', recipe: r })}>
                  <Mono n={r.n} />
                  <h4>{r.n}{r.user ? <span style={{ fontSize: '.52rem', fontWeight: 800, color: 'var(--green)', marginLeft: 6 }}>SOEN</span> : null}</h4>
                  <p>{r.tag}</p>
                  <div className="macros"><span className="mchip">{r.mac}</span><span className="mchip">{r.ing.length} ingredients</span></div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="g2 mt">
        <div className="card"><h6 className="lab">MEAL PREP 90 — SUNDAY 4:00</h6>
          {[['0–10', 'Oven on 425°F. Rice cooker: big batch basmati.'], ['10–35', 'Sheet 1: 1.5 lb chicken thighs (half plain, half tikka). Sheet 2: sweet potato + broccoli + peppers.'], ['35–55', 'Stove: dal or tinga sauce simmers while sheets roast.'], ['55–75', 'Grill/pan chicken breast for bowls + wraps. Portion into 6 boxes.'], ['75–90', 'Yogurt bark into freezer · crispy chickpeas in the cooling oven · wipe down.']].map(x => (
            <div className="row" key={x[0]}><span className="k">{x[0]} min</span><span>{x[1]}</span></div>
          ))}
        </div>
        <div className="card"><h6 className="lab">GROCERY — REPEATING CORE</h6>
          {[['Protein', 'Chicken thighs + breast (3 lb) · eggs (18) · Greek yogurt (1 kg) · cottage cheese · paneer · halloumi'], ['Carbs', 'Basmati · oats · whole-grain bread · wraps · lentils · black beans · baby potatoes'], ['Produce', 'Berries · bananas · broccoli · peppers · cucumber · spinach · romaine · sweet potato · lemons · ginger'], ['Flavor', 'Miso · harissa · chipotle in adobo · garam masala · soy · oyster sauce · tahini · feta · parm'], ['Stack', 'PB2 Performance · Built Bars · collagen · Yakult · cacao · magnesium · D3K2 · CoQ10 · NAC · creatine']].map(x => (
            <div className="row" key={x[0]}><span className="k">{x[0]}</span><span>{x[1]}</span></div>
          ))}
        </div>
      </div>
    </>
  );
}
