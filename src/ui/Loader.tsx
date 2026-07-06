import { useEffect, useRef, useState } from 'react';

export default function Loader({ onDone }: { onDone: () => void }) {
  const [off, setOff] = useState(false);
  const [bloom, setBloom] = useState(false);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(false);

  const enter = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setBloom(true);
    setTimeout(() => { setOff(true); onDone(); }, 650);
  };

  useEffect(() => {
    const cv = cvRef.current!;
    const cx = cv.getContext('2d')!;
    let W = 0, H = 0, raf = 0;
    const rs = () => { W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio; };
    rs(); addEventListener('resize', rs);
    const P = Array.from({ length: 90 }, () => ({
      x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8,
      v: 0.00004 + Math.random() * 0.00012, o: 0.15 + Math.random() * 0.4, g: Math.random() < 0.3,
    }));
    const an = () => {
      cx.clearRect(0, 0, W, H);
      P.forEach(p => {
        p.y -= p.v; if (p.y < 0) p.y = 1;
        cx.fillStyle = p.g ? `rgba(79,122,88,${p.o})` : `rgba(200,190,160,${p.o})`;
        cx.beginPath(); cx.arc(p.x * W, p.y * H, p.r * devicePixelRatio, 0, 6.283); cx.fill();
      });
      raf = requestAnimationFrame(an);
    };
    an();
    const kd = (e: KeyboardEvent) => { if (e.key === 'Enter') enter(); };
    addEventListener('keydown', kd);
    const auto = setTimeout(enter, 8000);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', rs); removeEventListener('keydown', kd); clearTimeout(auto); };
  }, []);

  return (
    <div id="loader" className={off ? 'off' : ''} onClick={enter}>
      <canvas id="ldust" ref={cvRef} />
      <div className="rip" /><div className="rip" style={{ animationDelay: '1.2s' }} />
      <div className="rip" style={{ animationDelay: '2.4s' }} /><div className="rip" style={{ animationDelay: '3.6s' }} />
      <div className="core" />
      <div className="lbrand"><h1>Tenet Labs</h1><div className="by">powered by</div><div className="soen">SOEN</div></div>
      <div className="lhint">Press Enter · or tap</div>
      <div id="lbloom" className={bloom ? 'go' : ''} />
    </div>
  );
}
