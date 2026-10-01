import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Wifi, WifiOff } from 'lucide-react';

export default function NetworkIndicator() {
  const { isOnline, setOnline, pendingSyncCount } = useAppStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  if (isOnline && pendingSyncCount === 0) return null;

  return (
    <div className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium ${
      isOnline ? 'bg-success-50 text-success-600' : 'bg-caution-50 text-caution-600'
    }`}>
      {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
      {isOnline
        ? pendingSyncCount > 0 ? `${pendingSyncCount} interactions waiting to sync` : ''
        : 'Offline mode — your activity is saved locally'
      }
    </div>
  );
}
