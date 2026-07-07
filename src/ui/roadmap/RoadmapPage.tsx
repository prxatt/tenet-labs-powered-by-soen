import { useState } from 'react';
import { gymVisitsThisWeek } from '../../core/geoLocal';
import { behaviorSummary } from '../../core/habits';
import { IcCam, IcJson, IcPath, IcPose, IcTrack, IcViz } from '../Icons';
import { toast } from '../hooks';

const CLAUDE_PROMPT = `Build a Python CLI tool "tenet-sense-v1" that: (1) takes an .mov/.mp4 of boxing bag work, (2) runs Ultralytics YOLO11-pose on every frame (COCO 17 keypoints), (3) computes per-frame wrist/elbow/shoulder velocities from keypoint deltas × fps, (4) segments punches via wrist-velocity peaks (scipy find_peaks, min prominence), (5) classifies each punch jab/cross/hook/uppercut with simple joint-angle heuristics at peak frame, (6) writes punches.json {t_start,t_peak,punch_type,peak_wrist_speed_px_s,confidence} and an annotated .mp4 overlay with skeleton + punch labels, (7) prints a session summary table (count by type, avg speed, punches/min). Use uv for deps: ultralytics, opencv-python, scipy, rich. Apple Silicon MPS if available. Include a README with exact run commands for footage shot on iPhone at 60fps, 45° front angle.`;

const PHASES = [
  { m: 'JULY', ti: 'Data + pipeline', su: 'Film every class (phone rig) · YOLO-pose pipeline on Mac · punch segmentation JSON', state: 'now' },
  { m: 'AUGUST', ti: 'Bench + fusion', su: 'ESP32-S3 + IMU bench bring-up · sync video+IMU clock · CAMP TEST Aug 16', state: 'next' },
  { m: 'SEPTEMBER', ti: 'TENET launch window', su: 'Boxing app launch w/ iOS 27 · Sense demo: live punch stats from one camera', state: 'later' },
];

const NODES: { ic: React.ReactNode; l: string }[] = [
  { ic: <IcCam lg />, l: 'Capture 60fps' }, { ic: <IcPose lg />, l: 'YOLO Pose' }, { ic: <IcTrack lg />, l: 'Track wrists' },
  { ic: <IcPath lg />, l: 'Segment punches' }, { ic: <IcJson lg />, l: 'punches.json' }, { ic: <IcViz lg />, l: 'Overlay + stats' },
];

export default function RoadmapPage() {
  const [showPrompt, setShowPrompt] = useState(false);
  return (
    <>
      <div className="card"><h6 className="lab">TENET SENSE — SIX WEEKS, THREE PHASES</h6>
        <div className="phaseline">
          {PHASES.map(p => (
            <div key={p.m} className={'phase' + (p.state === 'now' ? ' now' : '')}>
              <span className="pdot" />
              <span className="ph">{p.m}{p.state === 'now' ? ' — NOW' : ''}</span>
              <b>{p.ti}</b><small>{p.su}</small>
            </div>
          ))}
        </div>
        <p className="hint" style={{ textAlign: 'left' }}>Rule: no new hardware until the laptop pipeline bottlenecks. Phone footage IS the product right now.</p>
      </div>

      <div className="card mt"><h6 className="lab">THE PIPELINE — EVERY CLIP FLOWS THROUGH THIS</h6>
        <div className="pipe">
          {NODES.map((n, i) => (
            <div key={n.l} style={{ display: 'contents' }}>
              <div className="pnode"><div className="pc">{n.ic}</div><small>{n.l}</small></div>
              {i < NODES.length - 1 && <div className="plink" />}
            </div>
          ))}
        </div>
      </div>

      <div className="card mt"><h6 className="lab">GOALS — LOCAL (NEVER UPLOADED)</h6>
        <div className="row"><span className="k">Gym this week</span><span><b>{gymVisitsThisWeek()}</b> / 4 target days (from on-device location log)</span></div>
        <div className="row"><span className="k">SOEN learned</span><span>{behaviorSummary()}</span></div>
      </div>

      <div className="g2 mt">
        <div className="card"><h6 className="lab">THE RIG — SAME SPOT, EVERY SESSION</h6>
          <svg className="camrig" viewBox="0 0 380 260">
            <rect x="20" y="230" width="340" height="4" rx="2" fill="var(--line2)" />
            <ellipse cx="120" cy="120" rx="34" ry="66" fill="var(--redbg)" stroke="var(--red)" strokeWidth="2" />
            <line x1="120" y1="54" x2="120" y2="20" stroke="var(--red)" strokeWidth="2.5" />
            <text x="120" y="215" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--sub)">BAG</text>
            <circle cx="205" cy="120" r="11" fill="var(--greenbg)" stroke="var(--green)" strokeWidth="2" />
            <line x1="205" y1="131" x2="205" y2="180" stroke="var(--green)" strokeWidth="2.5" />
            <line x1="205" y1="145" x2="182" y2="128" stroke="var(--green)" strokeWidth="2.5" />
            <line x1="205" y1="145" x2="226" y2="132" stroke="var(--green)" strokeWidth="2.5" />
            <line x1="205" y1="180" x2="192" y2="222" stroke="var(--green)" strokeWidth="2.5" />
            <line x1="205" y1="180" x2="222" y2="222" stroke="var(--green)" strokeWidth="2.5" />
            <text x="205" y="245" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--sub)">YOU</text>
            <g className="sweep">
              <rect x="284" y="196" width="14" height="26" rx="4" fill="var(--ink)" />
              <line x1="291" y1="222" x2="291" y2="232" stroke="var(--ink)" strokeWidth="3" />
              <path d="M291 196 L212 128" stroke="var(--dim)" strokeWidth="1.4" strokeDasharray="5 5" />
              <path d="M291 196 L150 96" stroke="var(--dim)" strokeWidth="1.4" strokeDasharray="5 5" />
            </g>
            <text x="291" y="250" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--sub)">PHONE 45° · 60FPS</text>
          </svg>
          <div className="row"><span className="k">Frame</span><span>Full body + bag, no crop — feet to head</span></div>
          <div className="row"><span className="k">Light</span><span>Front-lit, avoid backlight from windows</span></div>
          <div className="row"><span className="k">Naming</span><span><b>YYYY-MM-DD_bag01.mov</b> → album "TENET Sense v1"</span></div>
        </div>

        <div className="card"><h6 className="lab">SATURDAY LAB — NEXT 3 SESSIONS</h6>
          {[['This Sat', 'Run the pipeline on footage you already have. One command, real output.'], ['Sat +1', 'ESP32-S3 + LSM6DSOX bench bring-up: blink → IMU stream → punch spike in serial plot.'], ['Sat +2', 'Clock-sync video + IMU (clap sync) — overlay both on one timeline.']].map(x => (
            <div className="row" key={x[0]}><span className="k">{x[0]}</span><span>{x[1]}</span></div>
          ))}
          <button className="btnS" onClick={() => setShowPrompt(s => !s)}>{showPrompt ? 'Hide' : 'Show'} the one Claude Code prompt that builds v1</button>
          {showPrompt && (
            <div className="codebx">
              <button className="cp" onClick={() => { navigator.clipboard.writeText(CLAUDE_PROMPT); toast('Prompt copied — paste into Claude Code'); }}>Copy</button>
              {CLAUDE_PROMPT}
            </div>
          )}
        </div>
      </div>

      <div className="card mt"><h6 className="lab">ARCHITECTURE SEAMS — WHY THIS WON'T NEED A REWRITE</h6>
        <div className="g3" style={{ marginTop: 8 }}>
          {[['Capture', 'Any camera in, timestamped frames out. Add depth/multi-cam later without touching downstream.'], ['Perception', 'Pose + punch events behind one JSON schema. Swap YOLO for anything better, nothing else changes.'], ['Experience', 'Overlay video today → live stats → Vision Pro volumetric replay. All read the same punches.json.']].map(x => (
            <div className="stat" key={x[0]}><small>{x[0]}</small><span style={{ fontSize: '.68rem', color: 'var(--sub)', lineHeight: 1.5 }}>{x[1]}</span></div>
          ))}
        </div>
      </div>
    </>
  );
}
