import { useState, useCallback } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { t } from '../../../utils/translations';
import { getFingerprint } from '../../../services/storage';
import { v4 as uuid } from 'uuid';

const OBJECTS = [
  { emoji: '🍎', name: 'Apple' },
  { emoji: '🔑', name: 'Key' },
  { emoji: '📖', name: 'Book' },
  { emoji: '🪑', name: 'Chair' },
  { emoji: '☕', name: 'Cup' },
  { emoji: '🧸', name: 'Teddy Bear' },
  { emoji: '🪻', name: 'Flower' },
  { emoji: '🕯️', name: 'Candle' },
];

type Phase = 'showing' | 'hiding' | 'asking' | 'result';

export default function MemoryGame() {
  const { language } = useAppStore();
  const [phase, setPhase] = useState<Phase>('showing');
  const [shownObjects, setShownObjects] = useState<typeof OBJECTS>([]);
  const [selectedObjects, setSelectedObjects] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const totalRounds = 3;

  const startRound = useCallback(() => {
    // Pick 4 random objects
    const shuffled = [...OBJECTS].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 4);
    setShownObjects(picked);
    setSelectedObjects(new Set());
    setPhase('showing');

    // Show for 5 seconds, then hide
    setTimeout(() => setPhase('hiding'), 1500);
    setTimeout(() => {
      setPhase('asking');
    }, 4000);
  }, []);

  // Start first round on mount
  useState(() => { startRound(); });

  const toggleObject = (idx: number) => {
    if (phase !== 'asking') return;
    setSelectedObjects(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const submitAnswer = () => {
    if (phase !== 'asking') return;

    // Check how many correct selections
    const correctIds = new Set(shownObjects.map(o => OBJECTS.indexOf(o)));
    let correct = 0;
    selectedObjects.forEach(idx => {
      if (correctIds.has(idx)) correct++;
    });

    const roundScore = Math.round((correct / 4) * 100);
    const newScore = Math.round((score * round + roundScore) / (round + 1));
    setScore(newScore);
    setPhase('result');
  };

  const nextRound = () => {
    if (round + 1 >= totalRounds) {
      // Game complete — save result via store (updates dashboard)
      const fp = getFingerprint();
      const store = useAppStore.getState();
      store.addCognitiveResult({
        id: uuid(),
        patientId: 'P001',
        date: new Date().toISOString().split('T')[0],
        domain: 'memory',
        score,
        probeOrAdaptive: 'probe',
        baselineScore: fp.memory.baseline,
        baselineDeviation: score - fp.memory.baseline,
        gameName: 'Object Recall',
      });
      store.showToast("Good effort! Let's continue.", 'success');
      return;
    }
    setRound(prev => prev + 1);
    startRound();
  };

  if (phase === 'showing') {
    return (
      <GameWrapper title={t('games.memory', language)} subtitle="Remember these objects" score={score} totalQuestions={totalRounds}>
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-lg text-gray-500 mb-6 font-medium">Look at these objects:</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {shownObjects.map((obj, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 flex flex-col items-center shadow-md border-2 border-primary-200">
                <span className="text-5xl">{obj.emoji}</span>
                <span className="text-sm text-gray-500 mt-2">{obj.name}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-6 animate-pulse">Remember these objects...</p>
        </div>
      </GameWrapper>
    );
  }

  if (phase === 'hiding') {
    return (
      <GameWrapper title={t('games.memory', language)} subtitle="Get ready...">
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-6xl mb-4">🤔</span>
          <p className="text-xl text-gray-500 font-medium">Now hiding the objects...</p>
        </div>
      </GameWrapper>
    );
  }

  if (phase === 'result') {
    return (
      <GameWrapper title={t('games.memory', language)} score={score} totalQuestions={totalRounds}>
        <div className="flex flex-col items-center justify-center py-12">
          <span className="text-6xl mb-4">🌟</span>
          <p className="text-2xl font-bold text-gray-800 mb-2">{t('games.welldone', language)}</p>
          <p className="text-gray-500">You remembered {Math.round(score / 100 * 4)} out of 4 objects</p>
          <button
            onClick={nextRound}
            className="mt-8 bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg
                       active:scale-95 transition-transform shadow-lg"
          >
            {round + 1 >= totalRounds ? t('games.finished', language) : t('games.next', language)}
          </button>
        </div>
      </GameWrapper>
    );
  }

  // Asking phase
  return (
    <GameWrapper title={t('games.memory', language)} subtitle="Which objects did you see?" score={score} totalQuestions={totalRounds}>
      <div className="py-4">
        <p className="text-lg text-gray-600 text-center mb-6 font-medium">Tap the objects you remember:</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
          {OBJECTS.map((obj, i) => {
            const isSelected = selectedObjects.has(i);
            return (
              <button
                key={i}
                onClick={() => toggleObject(i)}
                className={`rounded-2xl p-5 flex flex-col items-center transition-all border-2 ${
                  isSelected
                    ? 'bg-primary-50 border-primary-500 shadow-md'
                    : 'bg-white border-gray-100 shadow-sm hover:shadow'
                }`}
              >
                <span className="text-4xl">{obj.emoji}</span>
                <span className="text-xs text-gray-400 mt-1">{obj.name}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={submitAnswer}
          disabled={selectedObjects.size === 0}
          className={`w-full mt-6 py-4 rounded-2xl font-bold text-lg transition-all ${
            selectedObjects.size === 0
              ? 'bg-gray-200 text-gray-400'
              : 'bg-primary-500 text-white active:scale-95 shadow-lg'
          }`}
        >
          {t('games.play', language)}
        </button>
      </div>
    </GameWrapper>
  );
}
