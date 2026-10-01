import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import BottomNav from './BottomNav';
import Toast from './Toast';
import NetworkIndicator from './NetworkIndicator';

export default function PatientLayout() {
  const { textSize } = useAppStore();
  const sizeClass = textSize === 'xlarge' ? 'text-size-xlarge' : textSize === 'large' ? 'text-size-large' : '';

  return (
    <div className={`min-h-screen bg-gradient-to-b from-primary-50 to-white ${sizeClass}`}>
      <NetworkIndicator />
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
      <Toast />
    </div>
  );
}
