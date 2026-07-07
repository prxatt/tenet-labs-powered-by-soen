import { ensureSession } from '../core/sync';
import { useApp } from './hooks';
import { useEffect, useState } from 'react';

export default function SyncBanner({ onSettings }: { onSettings: () => void }) {
  const app = useApp();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    void ensureSession().then(s => setSignedIn(!!s));
  }, [app.sync]);

  if (signedIn !== false || app.sync === 'ok') return null;

  return (
    <div className="sync-banner" role="status">
      <span>Optional: sign in to sync check-offs across your devices. Oura works without signing in.</span>
      <button type="button" onClick={onSettings}>Sign in</button>
    </div>
  );
}
