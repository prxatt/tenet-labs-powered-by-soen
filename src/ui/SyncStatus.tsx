import { useApp } from './hooks';

const LABELS: Record<string, string> = {
  local: 'Local only',
  syncing: 'Syncing…',
  ok: 'Synced',
  err: 'Sync error',
  conflict: 'Merged changes',
};

export default function SyncStatus() {
  const { sync } = useApp();
  const label = LABELS[sync] || sync;
  return (
    <span className={'sync-dot sync-dot-' + sync} title={label} aria-label={label} role="status" />
  );
}
