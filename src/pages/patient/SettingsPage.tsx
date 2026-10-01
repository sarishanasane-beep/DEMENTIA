import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Type, Mic, Shield, Trash2, Users } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { t } from '../../utils/translations';
import { deleteAllData } from '../../services/storage';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { language, setLanguage, textSize, setTextSize, voiceEnabled, setVoiceEnabled, setRole } = useAppStore();

  const languages = [
    { code: 'en' as const, name: 'English', native: 'English' },
    { code: 'as' as const, name: 'Assamese', native: 'অসমীয়া' },
    { code: 'hi' as const, name: 'Hindi', native: 'हिन्दी' },
  ];

  const textSizes = [
    { value: 'normal' as const, label: 'Normal' },
    { value: 'large' as const, label: 'Large' },
    { value: 'xlarge' as const, label: 'Extra Large' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 page-enter">
      <div className="flex items-center gap-3 px-4 pt-10 pb-6 bg-white border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{t('settings.title', language)}</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Language */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Globe size={20} className="text-primary-500" />
            <h2 className="font-bold text-gray-800">{t('settings.language', language)}</h2>
          </div>
          <div className="space-y-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`w-full flex items-center justify-between py-3 px-4 rounded-xl transition-all ${
                  language === lang.code
                    ? 'bg-primary-50 border-2 border-primary-500'
                    : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                }`}
              >
                <span className="font-medium text-gray-700">{lang.name}</span>
                <span className="text-gray-400">{lang.native}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Size */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Type size={20} className="text-warm-500" />
            <h2 className="font-bold text-gray-800">{t('settings.textsize', language)}</h2>
          </div>
          <div className="flex gap-2">
            {textSizes.map((size) => (
              <button
                key={size.value}
                onClick={() => setTextSize(size.value)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  textSize === size.value
                    ? 'bg-warm-500 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic size={20} className="text-success-500" />
              <h2 className="font-bold text-gray-800">{t('settings.voice', language)}</h2>
            </div>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`w-14 h-8 rounded-full transition-all ${
                voiceEnabled ? 'bg-success-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                voiceEnabled ? 'ml-7 mt-1' : 'ml-1 mt-1'
              }`} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 ml-8">
            {voiceEnabled ? t('settings.enabled', language) : t('settings.disabled', language)}
          </p>
        </div>

        {/* Switch to Caregiver */}
        <button
          onClick={() => { setRole('caregiver'); navigate('/caregiver'); }}
          className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-3 hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          <Users size={20} className="text-purple-500" />
          <span className="font-bold text-gray-800">Switch to Caregiver View</span>
        </button>

        {/* Switch to ASHA */}
        <button
          onClick={() => { setRole('asha'); navigate('/asha'); }}
          className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-3 hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          <Users size={20} className="text-blue-500" />
          <span className="font-bold text-gray-800">Community Health Worker View</span>
        </button>

        {/* Privacy */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={20} className="text-primary-500" />
            <h2 className="font-bold text-gray-800">{t('settings.privacy', language)}</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-500 leading-relaxed">
            <p>• Your microphone is used only when you start a voice interaction.</p>
            <p>• Voice-derived features are used to identify unusual changes from your personal pattern.</p>
            <p>• Raw voice recordings are stored securely on this device.</p>
          </div>
        </div>

        {/* Delete Data */}
        <button
          onClick={() => {
            if (confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
              deleteAllData();
              window.location.reload();
            }
          }}
          className="w-full bg-white rounded-2xl p-5 shadow-sm border border-red-200 flex items-center gap-3 hover:bg-red-50 active:scale-[0.98] transition-all"
        >
          <Trash2 size={20} className="text-red-500" />
          <span className="font-bold text-red-600">{t('settings.delete', language)}</span>
        </button>
      </div>
    </div>
  );
}
