import { useState } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { getEncouragingMessage } from '../../../services/scoring';
import { v4 as uuid } from 'uuid';

interface Step {
  id: number;
  text: string;
  emoji: string;
}

const ROUTINES = [
  {
    title: 'Morning Routine',
    emoji: '🌅',
    steps: [
      { id: 1, text: 'Wake up', emoji: '⏰' },
      { id: 2, text: 'Brush teeth', emoji: '🪥' },
      { id: 3, text: 'Have tea', emoji: '🍵' },
      { id: 4, text: 'Take medicine', emoji: '💊' },
    ],
  },
  {
    title: 'Making chai',
    emoji: '🍵',
    steps: [
      { id: 1, text: 'Boil water', emoji: '🫖' },
      { id: 2, text: 'Add tea leaves', emoji: '🍃' },
      { id: 3, text: 'Add milk', emoji: '🥛' },
      { id: 4, text: 'Add sugar', emoji: '🧂' },
    ],
  },
  {
    title: 'Getting dressed',
    emoji: '👕',
    steps: [
      { id: 1, text: 'Choose clothes', emoji: '👔' },
      { id: 2, text: 'Put on shirt', emoji: '👕' },
      { id: 3, text: 'Put on pants', emoji: '👖' },
      { id: 4, text: 'Put on shoes', emoji: '👟' },
    ],
  },
];

type Phase = 'intro' | 'ordering' | 'result';

export default function RoutineGame() {
  useAppStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const routine = ROUTINES[Math.floor(Math.random() * ROUTINES.length)];
  const correctOrder = routine.steps.map(s => s.id);
  const [currentOrder, setCurrentOrder] = useState<Step[]>(() => {
    return [...routine.steps].sort(() => Math.random() - 0.5);
  });

  const moveStep = (fromIdx: number, direction: -1 | 1) => {
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= currentOrder.length) return;
    const newOrder = [...currentOrder];
    [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
    setCurrentOrder(newOrder);
  };

  const calculateScore = () => {
    let correct = 0;
    currentOrder.forEach((step, idx) => {
      if (step.id === correctOrder[idx]) correct++;
    });
    return Math.round((correct / correctOrder.length) * 100);
  };

  const handleComplete = () => {
    const score = calculateScore();
    useAppStore.getState().addCognitiveResult({
      id: uuid(),
      patientId: 'P001',
      date: new Date().toISOString().split('T')[0],
      domain: 'extra',
      score,
      probeOrAdaptive: 'adaptive',
      baselineScore: score,
      baselineDeviation: 0,
      gameName: 'Routine Sequencing',
    });
    setPhase('result');
  };

  if (phase === 'intro') {
    return (
      <GameWrapper title="Routine" subtitle="Put the steps in order">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-6xl mb-6">📋</div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-3">Put in Order</h2>
          <p className="text-lg text-gray-600 text-center mb-8">
            Arrange the steps in the right order.
          </p>
          <button
            onClick={() => setPhase('ordering')}
            className="w-full max-w-sm py-4 bg-teal-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-teal-600 transition"
          >
            Let's Start
          </button>
        </div>
      </GameWrapper>
    );
  }

  if (phase === 'result') {
    const score = calculateScore();
    return (
      <GameWrapper title="Routine" score={score} totalQuestions={100}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Good Effort!</h2>
          <p className="text-lg text-gray-600 text-center mb-2">
            {score >= 75 ? 'Great job ordering the steps!' : 'Let\'s try this again sometime.'}
          </p>
          <p className="text-gray-500 mb-6">{getEncouragingMessage(score)}</p>
          <p className="text-xs text-gray-400 mb-4">🎮 Practice Result</p>
          <button
            onClick={() => window.history.back()}
            className="w-full max-w-sm py-4 bg-teal-500 text-white text-xl font-bold rounded-2xl shadow-lg"
          >
            Done
          </button>
        </div>
      </GameWrapper>
    );
  }

  return (
    <GameWrapper title={routine.title} subtitle="Arrange the steps in order">
      <div className="p-2">
        <div className="space-y-3">
          {currentOrder.map((step, idx) => (
            <div
              key={`${step.id}-${idx}`}
              className="flex items-center gap-3 bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm"
            >
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                {idx + 1}
              </div>
              <div className="text-3xl">{step.emoji}</div>
              <div className="flex-1 text-lg font-medium text-gray-800">{step.text}</div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveStep(idx, -1)}
                  disabled={idx === 0}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveStep(idx, 1)}
                  disabled={idx === currentOrder.length - 1}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleComplete}
          className="w-full mt-6 py-4 bg-teal-500 text-white text-xl font-bold rounded-2xl shadow-lg"
        >
          Check My Order
        </button>
      </div>
    </GameWrapper>
  );
}
