import { useState } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { t } from '../../../utils/translations';
import { getFingerprint } from '../../../services/storage';
import { v4 as uuid } from 'uuid';
import type { ProbeOrAdaptive } from '../../../types';

// ============================================================
// PROBE SCENARIOS — Fixed, stable, suitable for longitudinal
// measurement. Same 4 scenarios every time.
// ============================================================
const PROBE_SCENARIOS = [
  {
    category: 'safety',
    story: 'You smell gas from the kitchen stove. What should you do?',
    options: [
      { text: 'Open windows and ask someone to check', correct: true },
      { text: 'Light a match to see better', correct: false },
      { text: 'Ignore it and continue cooking', correct: false },
    ],
  },
  {
    category: 'medicine',
    story: 'You are not sure if you already took your morning medicine. What should you do?',
    options: [
      { text: 'Ask a family member or check the medicine box', correct: true },
      { text: 'Take another dose just in case', correct: false },
      { text: 'Skip it today entirely', correct: false },
    ],
  },
  {
    category: 'money',
    story: 'Someone calls and says you have won a large prize. They ask for your bank details. What do you do?',
    options: [
      { text: 'Do not share any information and tell a family member', correct: true },
      { text: 'Give them your bank details to claim the prize', correct: false },
      { text: 'Ask them to call back later', correct: false },
    ],
  },
  {
    category: 'social',
    story: 'A stranger at the door says they are from the bank and need your password. What do you do?',
    options: [
      { text: 'Close the door and call a family member', correct: true },
      { text: 'Give them the password', correct: false },
      { text: 'Ask them to come back later', correct: false },
    ],
  },
];

// ============================================================
// ADAPTIVE SCENARIOS — Variable, for engagement/practice.
// ============================================================
const ADAPTIVE_STORIES = [
  {
    story: 'You are in the kitchen and smell gas from the stove. What should you do?',
    options: [
      { text: 'Open windows and ask a caregiver to check', correct: true },
      { text: 'Light a match to see better', correct: false },
      { text: 'Ignore it and continue cooking', correct: false },
    ],
  },
  {
    story: 'You are walking and it starts to rain heavily. There is a shelter nearby. What do you do?',
    options: [
      { text: 'Keep walking in the rain', correct: false },
      { text: 'Go to the shelter and wait', correct: true },
      { text: 'Run back home quickly', correct: false },
    ],
  },
  {
    story: 'A stranger at the door says they are from the bank and need your password. What do you do?',
    options: [
      { text: 'Give them the password', correct: false },
      { text: 'Close the door and call a family member', correct: true },
      { text: 'Ask them to come back later', correct: false },
    ],
  },
];

interface JudgementGameProps {
  mode: 'probe' | 'adaptive';
}

export default function JudgementGame({ mode }: JudgementGameProps) {
  const { language } = useAppStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const isProbe = mode === 'probe';
  const scenarios = isProbe ? PROBE_SCENARIOS : ADAPTIVE_STORIES;
  const gameName = isProbe ? 'Judgement Check' : 'Safety Story';
  const probeOrAdaptive: ProbeOrAdaptive = isProbe ? 'probe' : 'adaptive';
  const scenario = scenarios[currentQ];

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);

    if (scenario.options[idx].correct) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      setSelected(null);
      if (currentQ + 1 < scenarios.length) {
        setCurrentQ(prev => prev + 1);
      } else {
        const fp = getFingerprint();
        const finalScore = Math.round(((score + (scenario.options[idx].correct ? 1 : 0)) / scenarios.length) * 100);
        const store = useAppStore.getState();
        store.addCognitiveResult({
          id: uuid(),
          patientId: 'P001',
          date: new Date().toISOString().split('T')[0],
          domain: 'judgement',
          score: finalScore,
          probeOrAdaptive,
          baselineScore: fp.judgement.baseline,
          baselineDeviation: finalScore - fp.judgement.baseline,
          gameName,
        });
        store.showToast("Good effort! Let's continue.", 'success');
        setCurrentQ(scenarios.length);
      }
    }, 2000);
  };

  if (currentQ >= scenarios.length) {
    return (
      <GameWrapper title={isProbe ? 'Judgement Check' : t('games.judgement', language)} score={score} totalQuestions={scenarios.length}>
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-6xl mb-4">🧠</span>
          <p className="text-2xl font-bold text-gray-800 mb-2">{t('games.welldone', language)}</p>
          <p className="text-gray-500 mb-2">You got {score} out of {scenarios.length} correct</p>
          <p className="text-xs text-gray-400 mb-6">
            {isProbe ? '📊 Measurement result — recorded for cognitive fingerprint' : '🎮 Practice result — for engagement'}
          </p>
          <button onClick={() => window.history.back()} className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg">Done</button>
        </div>
      </GameWrapper>
    );
  }

  const categoryEmoji: Record<string, string> = {
    safety: '🔥',
    medicine: '💊',
    money: '💰',
    social: '🚪',
  };

  return (
    <GameWrapper
      title={isProbe ? 'Judgement Check' : t('games.judgement', language)}
      subtitle={isProbe ? `Measurement · ${(scenario as { category?: string }).category || ''}` : 'What would you do?'}
      score={score}
      totalQuestions={scenarios.length}
    >
      <div className="flex flex-col items-center py-6">
        {isProbe && (
          <div className="mb-3 px-3 py-1 bg-primary-50 rounded-full text-xs text-primary-600 font-medium">
            📊 Measurement · Question {currentQ + 1} of {scenarios.length}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-6 w-full">
          <p className="text-lg text-gray-700 font-medium leading-relaxed">
            {isProbe && <span className="mr-1">{categoryEmoji[(scenario as typeof PROBE_SCENARIOS[0]).category] || '📖'}</span>}
            {!isProbe && <span className="mr-1">📖</span>}
            {scenario.story}
          </p>
        </div>

        <p className="text-sm text-gray-400 mb-4">Choose the best action:</p>

        <div className="w-full space-y-3">
          {scenario.options.map((opt, idx) => {
            const isSelected = selected === idx;
            let bgColor = 'bg-white border-gray-100 hover:border-gray-300';
            if (selected !== null) {
              if (opt.correct) bgColor = 'bg-success-50 border-success-500';
              else if (isSelected) bgColor = 'bg-alert-50 border-alert-500';
              else bgColor = 'bg-gray-50 border-gray-100 opacity-50';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={selected !== null}
                className={`w-full py-4 px-5 rounded-xl border-2 font-medium text-left transition-all ${bgColor} ${
                  selected === null ? 'active:scale-[0.98]' : ''
                }`}
              >
                {opt.text}
                {selected !== null && opt.correct && <span className="ml-2">✓</span>}
                {selected === idx && !opt.correct && <span className="ml-2">✗</span>}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className={`mt-4 px-6 py-3 rounded-xl font-medium ${
            scenario.options[selected].correct ? 'bg-success-50 text-success-600' : 'bg-warm-50 text-warm-500'
          }`}>
            {scenario.options[selected].correct ? 'Good thinking! That is the safe choice.' : t('games.tryagain', language)}
          </div>
        )}
      </div>
    </GameWrapper>
  );
}
