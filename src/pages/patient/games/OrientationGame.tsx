import { useState } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { t } from '../../../utils/translations';
import { getFingerprint } from '../../../services/storage';
import { v4 as uuid } from 'uuid';

const now = new Date();
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const QUESTIONS = [
  {
    question: 'What day is today?',
    correct: DAYS[now.getDay()],
    options: [DAYS[now.getDay()], DAYS[(now.getDay() + 1) % 7], DAYS[(now.getDay() + 3) % 7], DAYS[(now.getDay() + 5) % 7]].sort(() => Math.random() - 0.5),
  },
  {
    question: 'What month is it?',
    correct: MONTHS[now.getMonth()],
    options: [MONTHS[now.getMonth()], MONTHS[(now.getMonth() + 1) % 12], MONTHS[(now.getMonth() + 4) % 12], MONTHS[(now.getMonth() + 8) % 12]].sort(() => Math.random() - 0.5),
  },
  {
    question: 'Is it morning, afternoon, or evening right now?',
    correct: now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening',
    options: ['Morning', 'Afternoon', 'Evening'].sort(() => Math.random() - 0.5),
  },
];

export default function OrientationGame() {
  const { language } = useAppStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const question = QUESTIONS[currentQ];

  const handleSelect = (answer: string) => {
    if (selected) return;
    setSelected(answer);

    if (answer === question.correct) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      setSelected(null);
      if (currentQ + 1 < QUESTIONS.length) {
        setCurrentQ(prev => prev + 1);
      } else {
        const fp = getFingerprint();
        const finalScore = Math.round(((score + (answer === question.correct ? 1 : 0)) / QUESTIONS.length) * 100);
        const store = useAppStore.getState();
        store.addCognitiveResult({
          id: uuid(),
          patientId: 'P001',
          date: new Date().toISOString().split('T')[0],
          domain: 'orientation',
          score: finalScore,
          probeOrAdaptive: 'probe',
          baselineScore: fp.orientation.baseline,
          baselineDeviation: finalScore - fp.orientation.baseline,
          gameName: 'Day & Place',
        });
        store.showToast("Good effort! Let's continue.", 'success');
        setCurrentQ(QUESTIONS.length);
      }
    }, 1500);
  };

  if (currentQ >= QUESTIONS.length) {
    return (
      <GameWrapper title={t('games.orientation', language)} score={score} totalQuestions={QUESTIONS.length}>
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-6xl mb-4">🗓️</span>
          <p className="text-2xl font-bold text-gray-800 mb-2">{t('games.welldone', language)}</p>
          <p className="text-gray-500 mb-8">You got {score} out of {QUESTIONS.length} correct</p>
          <button onClick={() => window.history.back()} className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg">Done</button>
        </div>
      </GameWrapper>
    );
  }

  return (
    <GameWrapper title={t('games.orientation', language)} score={score} totalQuestions={QUESTIONS.length}>
      <div className="flex flex-col items-center py-8">
        <span className="text-5xl mb-6">📅</span>
        <p className="text-xl text-gray-700 font-bold mb-8 text-center">
          {currentQ + 1}. {question.question}
        </p>

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

        {selected && (
          <div className={`mt-4 px-6 py-3 rounded-xl font-medium ${
            selected === question.correct ? 'bg-success-50 text-success-600' : 'bg-warm-50 text-warm-500'
          }`}>
            {selected === question.correct ? t('games.correct', language) : t('games.tryagain', language)}
          </div>
        )}
      </div>
    </GameWrapper>
  );
}
