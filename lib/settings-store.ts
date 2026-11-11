import { STORAGE_KEY, readSettings, type Settings } from "./settings";

const changeEvent = "feifei-settings-change";
let sessionCopy: string | undefined;

export function subscribeSettings(notify: () => void) {
  function sync(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) notify();
  }
  window.addEventListener("storage", sync);
  window.addEventListener(changeEvent, notify);
  return () => {
    window.removeEventListener("storage", sync);
    window.removeEventListener(changeEvent, notify);
  };
}

export function readSavedSettings() {
  if (sessionCopy !== undefined) return sessionCopy;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function serverSettings() {
  return null;
}

export function updateSettings(update: (settings: Settings) => Settings) {
  const next = JSON.stringify(update(readSettings(readSavedSettings())));
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
    sessionCopy = undefined;
  } catch {
    sessionCopy = next;
  }
  window.dispatchEvent(new Event(changeEvent));
}
