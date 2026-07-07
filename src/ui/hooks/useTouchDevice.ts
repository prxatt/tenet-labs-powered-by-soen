import { useEffect, useState } from 'react';

function isTouchLayout(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(max-width: 1024px)').matches) return true;
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** iPhone, iPad, and narrow touch layouts (not Mac desktop). */
export function useTouchDevice(): boolean {
  const [touch, setTouch] = useState(isTouchLayout);
  useEffect(() => {
    const update = () => setTouch(isTouchLayout());
    const mqs = [
      window.matchMedia('(max-width: 1024px)'),
      window.matchMedia('(hover: none) and (pointer: coarse)'),
    ];
    mqs.forEach(mq => mq.addEventListener('change', update));
    window.addEventListener('orientationchange', update);
    return () => {
      mqs.forEach(mq => mq.removeEventListener('change', update));
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return touch;
}
