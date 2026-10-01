import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { User, Users, Heart, Play, ArrowRight, Globe } from 'lucide-react';
import { useState } from 'react';

import type { Language } from '../types';

export default function LandingPage() {
  const navigate = useNavigate();
  const { setRole, language, setLanguage } = useAppStore();
  const [showLangPicker, setShowLangPicker] = useState(false);

  const handleRole = (role: 'patient' | 'caregiver' | 'asha' | 'demo') => {
    if (role === 'demo') {
      setRole('caregiver');
      navigate('/demo');
    } else {
      setRole(role);
      navigate(`/${role}`);
    }
  };

  const langs = [
    { code: 'en' as Language, name: 'English', native: 'English' },
    { code: 'as' as Language, name: 'Assamese', native: 'অসমীয়া' },
    { code: 'hi' as Language, name: 'Hindi', native: 'हिन्दी' },
  ];

  if (showLangPicker) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-500 to-primary-700 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">Choose your language</h2>
          <p className="text-sm text-gray-400 text-center mb-6">Pilot language support</p>

          <div className="space-y-3">
            {langs.map(lang => (
              <button
                key={lang.code}
                onClick={() => { setLanguage(lang.code); setShowLangPicker(false); }}
                className={`w-full py-4 px-5 rounded-xl border-2 flex justify-between items-center transition-all ${
                  language === lang.code
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-gray-700">{lang.name}</span>
                <span className="text-gray-400">{lang.native}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowLangPicker(false)}
            className="w-full mt-4 py-3 text-sm text-gray-400 hover:text-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-500 via-primary-600 to-primary-700 flex flex-col">
      {/* Language selector */}
      <div className="flex justify-end p-4">
        <button
          onClick={() => setShowLangPicker(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl text-white/80 text-sm hover:bg-white/20"
        >
          <Globe size={16} />
          {langs.find(l => l.code === language)?.native}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Heart size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SmartMind</h1>
          <p className="text-white/70 text-lg">Cognitive Wellness Assistant</p>
          <p className="text-white/50 text-sm mt-2">PS 26003 — Smart India Hackathon</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {/* Patient */}
          <button
            onClick={() => handleRole('patient')}
            className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center">
              <User size={28} className="text-primary-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-800 text-lg">Patient</div>
              <div className="text-sm text-gray-400">Simple, voice-first interface</div>
            </div>
            <ArrowRight size={20} className="text-gray-300" />
          </button>

          {/* Caregiver */}
          <button
            onClick={() => handleRole('caregiver')}
            className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-warm-100 flex items-center justify-center">
              <Users size={28} className="text-warm-500" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-800 text-lg">Caregiver</div>
              <div className="text-sm text-gray-400">Dashboard & insights</div>
            </div>
            <ArrowRight size={20} className="text-gray-300" />
          </button>

          {/* ASHA */}
          <button
            onClick={() => handleRole('asha')}
            className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-success-100 flex items-center justify-center">
              <Heart size={28} className="text-success-500" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-800 text-lg">Community Health Worker</div>
              <div className="text-sm text-gray-400">ASHA sync & summary</div>
            </div>
            <ArrowRight size={20} className="text-gray-300" />
          </button>

          {/* Demo */}
          <button
            onClick={() => handleRole('demo')}
            className="w-full bg-white/10 border-2 border-white/30 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/20 active:scale-[0.98] transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Play size={28} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-white text-lg">🎯 Demo Mode</div>
              <div className="text-sm text-white/60">Interactive voice analysis demo</div>
            </div>
            <ArrowRight size={20} className="text-white/40" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-white/40 text-xs">
          Non-diagnostic cognitive wellness prototype. Not a medical device.
        </p>
      </div>
    </div>
  );
}
