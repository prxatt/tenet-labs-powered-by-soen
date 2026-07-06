import { weekIdx } from '../../core/dates';
import Sheet from '../Sheet';

export default function ShotListSheet({ onClose }: { onClose: () => void }) {
  const dow = new Date().getDay();
  return (
    <Sheet onClose={onClose}>
      <h3 className="serif">Gym Shot List — today</h3>
      <div className="sub">iPhone/iPad on a small tripod · 60 fps · 45° front of your stance · same spot every time. Ask the front desk once — "filming my own rounds" is normal at fight gyms.</div>
      <div className="sec"><h6>For the AI (TENET Sense training data)</h6>
        <div className="row"><span className="k">1 round</span><span>Bag work — natural combos. Full body in frame, no crop.</span></div>
        <div className="row"><span className="k">1 round</span><span>{dow === 5 ? 'Shadowbox — technique day, cleanest form of the week' : 'Single-punch drills — 10 clean reps each: jab, cross, hook, uppercut'}</span></div>
        <div className="row"><span className="k">Naming</span><span>Save as <b>YYYY-MM-DD_bag01.mov</b> → Photos album "TENET Sense v1". No labeling now — YOLO Pose does that.</span></div>
      </div>
      <div className="sec"><h6>For you (personal gains)</h6>
        <div className="row"><span>Watch once tonight at 0.5×: feet only. One note in the gym log — that's the whole review.</span></div>
      </div>
      <div className="sec"><h6>For content (marketing bank)</h6>
        <div className="row"><span>Every 3rd session: 15-sec vertical clip — best combo, raw, no caption. By Sept launch: 15+ authentic clips of a founder who actually boxes.</span></div>
      </div>
      <div className="sec"><h6>Hardware timeline</h6>
        <div className="row"><span className="k">Now</span><span>No hardware needed — phone/iPad footage is the pipeline input.</span></div>
        <div className="row"><span className="k">+1 wk</span><span>ESP32-S3 + LSM6DSOX arrive → Saturday bench bring-up (at home).</span></div>
        <div className="row"><span className="k">+1 mo</span><span>Raspberry Pi 5 — only buy when the laptop pipeline actually bottlenecks.</span></div>
      </div>
      <p className="hint">Week {weekIdx(new Date()) + 1} of camp — every clip is future training data.</p>
    </Sheet>
  );
}
