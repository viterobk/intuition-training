import { useEffect, useRef, useState } from 'react';
import GetApp from '@mui/icons-material/GetApp';
import './InstallPwaButton.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const isStandalone = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return media || iosStandalone;
};

export default function InstallPwaButton() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      return undefined;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const onInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
    };

    const onDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        deferredPromptRef.current = null;
        setCanInstall(false);
      }
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    mediaQuery.addEventListener?.('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      mediaQuery.removeEventListener?.('change', onDisplayModeChange);
    };
  }, []);

  const handleInstall = async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent || installing) {
      return;
    }

    setInstalling(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        deferredPromptRef.current = null;
        setCanInstall(false);
      }
    } finally {
      setInstalling(false);
    }
  };

  if (!canInstall) {
    return null;
  }

  return (
    <div className='install-pwa'>
      <button
        type='button'
        className='install-pwa-button'
        onClick={handleInstall}
        disabled={installing}
        aria-label='Установить на устройство'
      >
        <GetApp className='install-pwa-icon' fontSize='inherit' />
        <span className='install-pwa-copy'>
          <span className='install-pwa-title'>
            {installing ? 'Установка…' : 'Установить на устройство'}
          </span>
          <span className='install-pwa-hint'>для работы без интернета</span>
        </span>
      </button>
    </div>
  );
}
