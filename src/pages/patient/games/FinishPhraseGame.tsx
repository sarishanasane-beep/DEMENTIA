import { useState } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { getFingerprint } from '../../../services/storage';
import { scoreByAccuracy, getEncouragingMessage } from '../../../services/scoring';
import { v4 as uuid } from 'uuid';

const PHRASES = [
  { phrase: 'An apple a day keeps the doctor ______', answer: 'away', options: ['away', 'busy', 'happy', 'safe'] },
  { phrase: 'Early to bed and early to rise makes a man ______ and wise', answer: 'healthy', options: ['healthy', 'wealthy', 'tired', 'busy'] },
  { phrase: 'A stitch in time saves ______', answer: 'nine', options: ['nine', 'one', 'time', 'money'] },
  { phrase: 'Actions speak louder than ______', answer: 'words', options: ['words', 'deeds', 'thoughts', 'silence'] },
];

export default function FinishPhraseGame() {
  // Store accessed via useAppStore.getState() for results
  const [currentQ, setCurrentQ] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const handleAnswer = (answer: string) => {
    if (selected) return;
    setSelected(answer);
    const isCorrect = answer === PHRASES[currentQ].answer;
    if (isCorrect) setCorrect(c => c + 1);

    setTimeout(() => {
      setSelected(null);
      if (currentQ + 1 < PHRASES.length) {
        setCurrentQ(q => q + 1);
      } else {
        const finalCorrect = isCorrect ? correct + 1 : correct;
        const score = scoreByAccuracy(finalCorrect, PHRASES.length);
        const fp = getFingerprint();
        useAppStore.getState().addCognitiveResult({
          id: uuid(), patientId: 'P001', date: new Date().toISOString().split('T')[0],
          domain: 'language', score, probeOrAdaptive: 'adaptive',
          baselineScore: fp.language.baseline, baselineDeviation: score - fp.language.baseline,
          gameName: 'Finish the Phrase',
        });
      }
    }, 1200);
  };

  if (currentQ >= PHRASES.length) {
    const score = scoreByAccuracy(correct, PHRASES.length);
    return (
      <GameWrapper title="Finish the Phrase" score={correct} totalQuestions={PHRASES.length}>
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-6xl mb-4">🗣️</span>
          <p className="text-2xl font-bold text-gray-800 mb-2">Well done!</p>
          <p className="text-gray-500 mb-6">{getEncouragingMessage(score)}</p>
          <p className="text-xs text-gray-400 mb-4">🎮 Practice Result</p>
          <button onClick={() => window.history.back()} className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg">Done</button>
        </div>
      </GameWrapper>
    );
  }

  const q = PHRASES[currentQ];
  return (
    <GameWrapper title="Finish the Phrase" subtitle={`Question ${currentQ + 1} of ${PHRASES.length}`} score={correct} totalQuestions={PHRASES.length}>
      <div className="py-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <p className="text-xl text-gray-700 font-medium text-center leading-relaxed">{q.phrase}</p>
        </div>
        <p className="text-sm text-gray-400 text-center mb-4">Choose the missing word:</p>
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
            {selected === q.answer ? 'Great memory!' : "Let's try that together."}
          </p>
        )}
      </div>
    </GameWrapper>
  );
}
