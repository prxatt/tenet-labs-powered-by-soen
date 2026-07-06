import { type ReactNode, useEffect } from 'react';

export default function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  return (
    <div className="sheet" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="inner">
        <button className="x" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}
