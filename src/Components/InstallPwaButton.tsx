import { useEffect, useState } from 'react';
import GetApp from '@mui/icons-material/GetApp';
import {
  canInstallPwa,
  promptPwaInstall,
  subscribePwaInstall,
} from '../pwaInstall';
import './InstallPwaButton.css';

export default function InstallPwaButton() {
  const [canInstall, setCanInstall] = useState(canInstallPwa);
  const [installing, setInstalling] = useState(false);

  useEffect(() => subscribePwaInstall(() => setCanInstall(canInstallPwa())), []);

  const handleInstall = async () => {
    if (!canInstall || installing) {
      return;
    }

    setInstalling(true);
    try {
      await promptPwaInstall();
      setCanInstall(canInstallPwa());
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
        <span className='install-pwa-title'>
          {installing ? 'Установка…' : 'Установить на устройство'}
        </span>
        <span className='install-pwa-sep' aria-hidden='true'>
          ·
        </span>
        <span className='install-pwa-hint'>для работы без интернета</span>
      </button>
    </div>
  );
}
