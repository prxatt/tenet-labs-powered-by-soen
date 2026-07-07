import { useEffect, useState } from 'react';

/** iPhone, iPad, and narrow touch layouts (not Mac desktop). */
export function useTouchDevice(): boolean {
  const [touch, setTouch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const fn = () => setTouch(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return touch;
}
