import { useState } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { getFingerprint } from '../../../services/storage';
import { scoreByAccuracy, getEncouragingMessage } from '../../../services/scoring';
import { v4 as uuid } from 'uuid';

const QUESTIONS = [
  { q: 'Which activity is usually done in the morning?', answer: 'Brushing teeth', options: ['Brushing teeth', 'Watching TV', 'Going to bed', 'Having dinner'] },
  { q: 'When do people usually have lunch?', answer: 'Afternoon', options: ['Morning', 'Afternoon', 'Night', 'Early morning'] },
  { q: 'Which activity is done before sleeping?', answer: 'Saying goodnight', options: ['Saying goodnight', 'Having breakfast', 'Going to work', 'Playing games'] },
  { q: 'What do most people do when they first wake up?', answer: 'Get out of bed', options: ['Get out of bed', 'Go to sleep', 'Have dinner', 'Watch a movie'] },
];

export default function TimeOfDayGame() {
  // Store accessed via useAppStore.getState() for results
  const [currentQ, setCurrentQ] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const handleAnswer = (answer: string) => {
    if (selected) return;
    setSelected(answer);
    const isCorrect = answer === QUESTIONS[currentQ].answer;
    if (isCorrect) setCorrect(c => c + 1);

    setTimeout(() => {
      setSelected(null);
      if (currentQ + 1 < QUESTIONS.length) {
        setCurrentQ(q => q + 1);
      } else {
        const finalCorrect = isCorrect ? correct + 1 : correct;
        const score = scoreByAccuracy(finalCorrect, QUESTIONS.length);
        const fp = getFingerprint();
        useAppStore.getState().addCognitiveResult({
          id: uuid(), patientId: 'P001', date: new Date().toISOString().split('T')[0],
          domain: 'orientation', score, probeOrAdaptive: 'adaptive',
          baselineScore: fp.orientation.baseline, baselineDeviation: score - fp.orientation.baseline,
          gameName: 'Time of Day',
        });
      }
    }, 1200);
  };

  if (currentQ >= QUESTIONS.length) {
    const score = scoreByAccuracy(correct, QUESTIONS.length);
    return (
      <GameWrapper title="Time of Day" score={correct} totalQuestions={QUESTIONS.length}>
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-6xl mb-4">🕐</span>
          <p className="text-2xl font-bold text-gray-800 mb-2">Well done!</p>
          <p className="text-gray-500 mb-6">{getEncouragingMessage(score)}</p>
          <p className="text-xs text-gray-400 mb-4">🎮 Practice Result</p>
          <button onClick={() => window.history.back()} className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg">Done</button>
        </div>
      </GameWrapper>
    );
  }

  const q = QUESTIONS[currentQ];
  return (
    <GameWrapper title="Time of Day" subtitle={`Question ${currentQ + 1} of ${QUESTIONS.length}`} score={correct} totalQuestions={QUESTIONS.length}>
      <div className="py-6">
        <p className="text-xl text-gray-800 font-bold text-center mb-8">{q.q}</p>
        <div className="space-y-3">
          {q.options.map(opt => (
            <button key={opt} onClick={() => handleAnswer(opt)} disabled={!!selected}
              className={`w-full py-4 px-5 rounded-xl border-2 font-medium text-lg text-left transition-all ${
                selected === opt
                  ? opt === q.answer ? 'bg-success-50 border-success-500' : 'bg-alert-50 border-alert-500'
                  : selected && opt === q.answer ? 'bg-success-50 border-success-500'
                  : 'bg-white border-gray-100 hover:border-gray-300'
              } ${!selected ? 'active:scale-[0.98]' : ''}`}>
              {opt}
              {selected && opt === q.answer && <span className="ml-2">✓</span>}
              {selected === opt && opt !== q.answer && <span className="ml-2">✗</span>}
            </button>
          ))}
        </div>
        {selected && (
          <p className={`text-center mt-4 font-medium ${selected === q.answer ? 'text-success-600' : 'text-warm-500'}`}>
            {selected === q.answer ? 'Good thinking!' : "Let's try that together."}
          </p>
        )}
      </div>
    </GameWrapper>
  );
}
