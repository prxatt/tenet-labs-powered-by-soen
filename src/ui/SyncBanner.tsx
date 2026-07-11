import { ensureSession } from '../core/sync';
import { useApp } from './hooks';
import { useEffect, useState } from 'react';

export default function SyncBanner({ onSettings }: { onSettings: () => void }) {
  const app = useApp();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    void ensureSession().then(s => setSignedIn(!!s));
  }, [app.sync]);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (offline) {
    return (
      <div className="sync-banner sync-banner-offline" role="status">
        <span>Offline — changes saved on this device until you're back online.</span>
      </div>
    );
  }

  if (signedIn === false) {
    return (
      <div className="sync-banner" role="status">
        <span>Sign in to sync your plan and Oura across iPhone, iPad, and Mac.</span>
        <button type="button" onClick={onSettings}>Sign in</button>
      </div>
    );
  }

  if (app.sync === 'conflict') {
    return (
      <div className="sync-banner sync-banner-conflict" role="status">
        <span>Changes from another device were merged — your check-offs are preserved.</span>
      </div>
    );
  }

  if (app.sync === 'err') {
    return (
      <div className="sync-banner sync-banner-err" role="status">
        <span>Cloud sync failed — your data is safe on this device.</span>
        <button type="button" onClick={onSettings}>Settings</button>
      </div>
    );
  }

  return null;
}
