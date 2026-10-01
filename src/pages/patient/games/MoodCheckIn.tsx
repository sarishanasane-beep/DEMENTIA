import { useState } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { v4 as uuid } from 'uuid';

const MOODS = [
  { id: 'good', emoji: '😊', label: 'Feeling Good', color: 'bg-green-100 border-green-300 hover:bg-green-200' },
  { id: 'okay', emoji: '😐', label: 'Okay', color: 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200' },
  { id: 'tired', emoji: '😴', label: 'Tired', color: 'bg-blue-100 border-blue-300 hover:bg-blue-200' },
  { id: 'not-well', emoji: '😟', label: 'Not Feeling Well', color: 'bg-orange-100 border-orange-300 hover:bg-orange-200' },
];

type Phase = 'select' | 'done';

export default function MoodCheckIn() {
  useAppStore();
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const handleSelect = (moodId: string) => {
    setSelectedMood(moodId);
    useAppStore.getState().addCognitiveResult({
      id: uuid(),
      patientId: 'P001',
      date: new Date().toISOString().split('T')[0],
      domain: 'extra',
      score: 100,
      probeOrAdaptive: 'adaptive',
      baselineScore: 100,
      baselineDeviation: 0,
      gameName: 'Mood Check-in',
    });
    setPhase('done');
  };

  if (phase === 'done') {
    const mood = MOODS.find(m => m.id === selectedMood);
    return (
      <GameWrapper title="How I Feel">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-6xl mb-4">💜</div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Thank You</h2>
          <p className="text-lg text-gray-600 text-center mb-2">
            You shared that you are feeling <strong>{mood?.label}</strong>.
          </p>
          <p className="text-base text-gray-500 text-center mb-8">
            Your caregiver can see how you are doing.
          </p>
          <button
            onClick={() => window.history.back()}
            className="w-full max-w-sm py-4 bg-pink-500 text-white text-xl font-bold rounded-2xl shadow-lg"
          >
            Back Home
          </button>
        </div>
      </GameWrapper>
    );
  }

  return (
    <GameWrapper title="How I Feel" subtitle="Share how you are feeling today">
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-6xl mb-6">🌸</div>
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-3">How are you feeling today?</h2>
        <p className="text-lg text-gray-600 text-center mb-8">
          Tap the one that matches how you feel.
        </p>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {MOODS.map(mood => (
            <button
              key={mood.id}
              onClick={() => handleSelect(mood.id)}
              className={`p-6 rounded-2xl border-2 text-center transition transform hover:scale-105 ${mood.color}`}
            >
              <div className="text-5xl mb-2">{mood.emoji}</div>
              <div className="text-lg font-semibold text-gray-700">{mood.label}</div>
            </button>
          ))}
        </div>
      </div>
    </GameWrapper>
  );
}
