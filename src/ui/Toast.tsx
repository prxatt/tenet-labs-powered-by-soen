import { useEffect, useRef, useState } from 'react';
import { registerToast } from './hooks';

export default function Toast() {
  const [msg, setMsg] = useState('');
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    registerToast(m => {
      setMsg(m); setOn(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setOn(false), 3200);
    });
  }, []);
  return <div id="toast" className={on ? 'on' : ''}>{msg}</div>;
}
