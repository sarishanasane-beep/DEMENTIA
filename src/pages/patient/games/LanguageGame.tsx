import { useState } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { t } from '../../../utils/translations';
import { getFingerprint } from '../../../services/storage';
import { v4 as uuid } from 'uuid';

const WORD_PAIRS = [
  { emoji: '🌻', correct: 'Sunflower', options: ['Sunflower', 'Moonlight', 'Rainbow', 'Starfish'] },
  { emoji: '🏠', correct: 'House', options: ['House', 'Bridge', 'Mountain', 'River'] },
  { emoji: '🐘', correct: 'Elephant', options: ['Lion', 'Elephant', 'Penguin', 'Dolphin'] },
  { emoji: '🌙', correct: 'Moon', options: ['Sun', 'Cloud', 'Moon', 'Wind'] },
  { emoji: '🚲', correct: 'Bicycle', options: ['Car', 'Boat', 'Bicycle', 'Airplane'] },
];

export default function LanguageGame() {
  const { language } = useAppStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const question = WORD_PAIRS[currentQ];

  const handleSelect = (answer: string) => {
    if (selected) return;
    setSelected(answer);

    if (answer === question.correct) {
      setScore(prev => prev + 1);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }

    setTimeout(() => {
      setSelected(null);
      setFeedback(null);
      if (currentQ + 1 < WORD_PAIRS.length) {
        setCurrentQ(prev => prev + 1);
      } else {
        // Save result via store (updates dashboard)
        const fp = getFingerprint();
        const finalScore = Math.round(((score + (answer === question.correct ? 1 : 0)) / WORD_PAIRS.length) * 100);
        const store = useAppStore.getState();
        store.addCognitiveResult({
          id: uuid(),
          patientId: 'P001',
          date: new Date().toISOString().split('T')[0],
          domain: 'language',
          score: finalScore,
          probeOrAdaptive: 'probe',
          baselineScore: fp.language.baseline,
          baselineDeviation: finalScore - fp.language.baseline,
          gameName: 'Word Match',
        });
        store.showToast("Good effort! Let's continue.", 'success');
        setCurrentQ(WORD_PAIRS.length); // trigger finished
      }
    }, 1500);
  };

  if (currentQ >= WORD_PAIRS.length) {
    return (
      <GameWrapper title={t('games.language', language)} score={score} totalQuestions={WORD_PAIRS.length}>
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-6xl mb-4">🎉</span>
          <p className="text-2xl font-bold text-gray-800 mb-2">{t('games.welldone', language)}</p>
          <p className="text-gray-500 mb-8">You got {score} out of {WORD_PAIRS.length} correct</p>
          <button
            onClick={() => window.history.back()}
            className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg"
          >
            Done
          </button>
        </div>
      </GameWrapper>
    );
  }

  return (
    <GameWrapper title={t('games.language', language)} subtitle="What is this?" score={score} totalQuestions={WORD_PAIRS.length}>
      <div className="flex flex-col items-center py-8">
        {/* Question object */}
        <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-warm-200 mb-8">
          <span className="text-7xl">{question.emoji}</span>
        </div>

        <p className="text-lg text-gray-600 mb-6 font-medium">
          {currentQ + 1}. What is this?
        </p>

        {/* Options */}
        <div className="w-full space-y-3">
          {question.options.map((opt) => {
            const isCorrect = opt === question.correct;
            const isSelected = opt === selected;
            let bgColor = 'bg-white border-gray-100 hover:border-gray-300';
            if (selected) {
              if (isCorrect) bgColor = 'bg-success-50 border-success-500';
              else if (isSelected) bgColor = 'bg-alert-50 border-alert-500';
              else bgColor = 'bg-gray-50 border-gray-100 opacity-50';
            }

            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                disabled={!!selected}
                className={`w-full py-4 px-6 rounded-xl border-2 font-medium text-lg transition-all ${bgColor} ${
                  !selected ? 'active:scale-[0.98]' : ''
                }`}
              >
                {opt}
                {selected && isCorrect && <span className="ml-2">✓</span>}
                {selected && isSelected && !isCorrect && <span className="ml-2">✗</span>}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className={`mt-4 px-6 py-3 rounded-xl font-medium ${
            feedback === 'correct' ? 'bg-success-50 text-success-600' : 'bg-warm-50 text-warm-500'
          }`}>
            {feedback === 'correct' ? t('games.correct', language) : t('games.tryagain', language)}
          </div>
        )}
      </div>
    </GameWrapper>
  );
}
