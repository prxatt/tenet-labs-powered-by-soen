import { useSyncExternalStore } from 'react';
import { store, type AppState } from '../core/store';

export function useApp(): AppState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/* ---- toast (tiny event bus) ---- */
type ToastFn = (msg: string) => void;
let toastFn: ToastFn = () => { /* not mounted yet */ };
export const registerToast = (fn: ToastFn) => { toastFn = fn; };
export const toast = (msg: string) => toastFn(msg);
