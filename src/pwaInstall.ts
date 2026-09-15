type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Listener = () => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<Listener>();

const isStandalone = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return media || iosStandalone;
};

const notify = () => {
  listeners.forEach((listener) => listener());
};

const clearPrompt = () => {
  deferredPrompt = null;
  notify();
};

export const canInstallPwa = () => Boolean(deferredPrompt) && !installed && !isStandalone();

export const subscribePwaInstall = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const promptPwaInstall = async () => {
  if (!deferredPrompt) {
    return false;
  }
  const promptEvent = deferredPrompt;
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  // Событие одноразовое — после prompt его больше нельзя использовать
  clearPrompt();
  return choice.outcome === 'accepted';
};

const initPwaInstall = () => {
  if (typeof window === 'undefined') {
    return;
  }
  if (isStandalone()) {
    installed = true;
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    clearPrompt();
  });

  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  mediaQuery.addEventListener?.('change', (event) => {
    if (event.matches) {
      installed = true;
      clearPrompt();
    }
  });
};

initPwaInstall();
