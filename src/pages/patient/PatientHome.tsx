import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { getGreeting, t } from '../../utils/translations';
import { getPatient } from '../../services/storage';
import { MessageCircle, Gamepad2, Image, Bell, Settings } from 'lucide-react';
import PrivacyNote from '../../components/shared/PrivacyNote';

export default function PatientHome() {
  const navigate = useNavigate();
  const { language } = useAppStore();
  const patient = getPatient();

  const cards = [
    { path: '/patient/talk', icon: MessageCircle, label: t('home.talk', language), desc: t('home.talk.desc', language), color: 'bg-primary-500' },
    { path: '/patient/games', icon: Gamepad2, label: t('home.play', language), desc: t('home.play.desc', language), color: 'bg-warm-500' },
    { path: '/patient/memories', icon: Image, label: t('home.memories', language), desc: t('home.memories.desc', language), color: 'bg-success-500' },
    { path: '/patient/reminders', icon: Bell, label: t('home.reminders', language), desc: t('home.reminders.desc', language), color: 'bg-primary-400' },
  ];

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {getGreeting(language)}, {patient.name.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 mt-1 text-lg">
              {t('greeting.howcanihelp', language)}
            </p>
          </div>
          <button
            onClick={() => navigate('/patient/settings')}
            className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center"
          >
            <Settings size={22} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Action Cards */}
      <div className="px-4 grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 
                       flex flex-col items-center text-center gap-3 
                       active:scale-95 transition-transform hover:shadow-md"
          >
            <div className={`w-16 h-16 rounded-2xl ${card.color} flex items-center justify-center`}>
              <card.icon size={32} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-800 card-title">{card.label}</div>
              <div className="text-sm text-gray-400 mt-1">{card.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Privacy note */}
      <PrivacyNote />

      {/* Demo badge */}
      <div className="px-6 mt-4 mb-4">
        <div className="bg-primary-50 rounded-xl px-4 py-2 text-center text-xs text-primary-600 font-medium">
          🎯 Demo Mode Active — Tap "Talk to Me" to try the voice interaction
        </div>
      </div>
    </div>
  );
}
