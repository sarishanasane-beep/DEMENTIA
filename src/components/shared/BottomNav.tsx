import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, Gamepad2, Image, Bell } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { t } from '../../utils/translations';

const items = [
  { path: '/patient', icon: Home, labelKey: 'nav.home', emoji: '🏠' },
  { path: '/patient/talk', icon: MessageCircle, labelKey: 'nav.talk', emoji: '💬' },
  { path: '/patient/games', icon: Gamepad2, labelKey: 'nav.play', emoji: '🎮' },
  { path: '/patient/memories', icon: Image, labelKey: 'nav.memories', emoji: '📷' },
  { path: '/patient/reminders', icon: Bell, labelKey: 'nav.reminders', emoji: '🔔' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useAppStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === '/patient' && location.pathname === '/patient');
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
              aria-label={t(item.labelKey, language)}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-xs mt-1 font-medium">{item.emoji}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
