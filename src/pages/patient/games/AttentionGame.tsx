import { useState } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { t } from '../../../utils/translations';
import { getFingerprint } from '../../../services/storage';
import { v4 as uuid } from 'uuid';

const PATTERNS = [
  { sequence: ['🔴', '🔵', '🔴', '🔵'], answer: '🔴', options: ['🔴', '🔵'] },
  { sequence: ['⭐', '🌙', '⭐', '🌙'], answer: '⭐', options: ['⭐', '🌙'] },
  { sequence: ['🟢', '🟢', '🟡', '🟢', '🟢'], answer: '🟡', options: ['🟢', '🟡'] },
  { sequence: ['🐱', '🐶', '🐱', '🐶', '🐱'], answer: '🐶', options: ['🐱', '🐶'] },
  { sequence: ['⬆️', '➡️', '⬇️', '⬅️'], answer: '⬆️', options: ['⬆️', '⬇️'] },
];

export default function AttentionGame() {
  const { language } = useAppStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const pattern = PATTERNS[currentQ];

  const handleSelect = (answer: string) => {
    if (selected) return;
    setSelected(answer);

    if (answer === pattern.answer) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      setSelected(null);
      if (currentQ + 1 < PATTERNS.length) {
        setCurrentQ(prev => prev + 1);
      } else {
        const fp = getFingerprint();
        const finalScore = Math.round(((score + (answer === pattern.answer ? 1 : 0)) / PATTERNS.length) * 100);
        const store = useAppStore.getState();
        store.addCognitiveResult({
          id: uuid(),
          patientId: 'P001',
          date: new Date().toISOString().split('T')[0],
          domain: 'attention',
          score: finalScore,
          probeOrAdaptive: 'probe',
          baselineScore: fp.attention.baseline,
          baselineDeviation: finalScore - fp.attention.baseline,
          gameName: 'Pattern Continue',
        });
        store.showToast("Good effort! Let's continue.", 'success');
        setCurrentQ(PATTERNS.length);
      }
    }, 1500);
  };

  if (currentQ >= PATTERNS.length) {
    return (
      <GameWrapper title={t('games.attention', language)} score={score} totalQuestions={PATTERNS.length}>
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-6xl mb-4">✨</span>
          <p className="text-2xl font-bold text-gray-800 mb-2">{t('games.welldone', language)}</p>
          <p className="text-gray-500 mb-8">You got {score} out of {PATTERNS.length} correct</p>
          <button onClick={() => window.history.back()} className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg">Done</button>
        </div>
      </GameWrapper>
    );
  }

  return (
    <GameWrapper title={t('games.attention', language)} subtitle="Complete the pattern" score={score} totalQuestions={PATTERNS.length}>
      <div className="flex flex-col items-center py-8">
        <p className="text-lg text-gray-600 mb-6 font-medium">What comes next?</p>

        {/* Pattern display */}
        <div className="bg-white rounded-3xl px-6 py-8 shadow-lg border-2 border-purple-200 mb-8 w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {pattern.sequence.map((emoji, i) => (
              <span key={i} className="text-3xl">{emoji}</span>
            ))}
            <span className="text-3xl text-gray-300 ml-2">❓</span>
          </div>
        </div>

        {/* Options */}
        <div className="flex gap-4">
          {pattern.options.map((opt) => {
            const isCorrect = opt === pattern.answer;
            const isSelected = opt === selected;
            let bgColor = 'bg-white border-gray-100';
            if (selected) {
              if (isCorrect) bgColor = 'bg-success-50 border-success-500';
              else if (isSelected) bgColor = 'bg-alert-50 border-alert-500';
            }

            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                disabled={!!selected}
                className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center text-4xl transition-all ${bgColor} ${
                  !selected ? 'hover:shadow-md active:scale-95' : ''
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className={`mt-6 px-6 py-3 rounded-xl font-medium ${
            selected === pattern.answer ? 'bg-success-50 text-success-600' : 'bg-warm-50 text-warm-500'
          }`}>
            {selected === pattern.answer ? t('games.correct', language) : t('games.tryagain', language)}
          </div>
        )}
      </div>
    </GameWrapper>
  );
}
