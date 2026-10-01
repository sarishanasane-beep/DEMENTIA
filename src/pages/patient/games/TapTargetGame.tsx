import { useState, useEffect, useCallback } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { getFingerprint } from '../../../services/storage';
import { scoreByAccuracy, getEncouragingMessage } from '../../../services/scoring';
import { v4 as uuid } from 'uuid';

const ITEMS = ['🍎', '🌟', '🐱', '🌺', '🎵', '⚽'];
const TARGET = '⭐';
const ROUNDS = 10;

export default function TapTargetGame() {
  // Store accessed via useAppStore.getState() for results
  const [currentItem, setCurrentItem] = useState('');
  const [round, setRound] = useState(0);
  const [hits, setHits] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const nextRound = useCallback(() => {
    if (round >= ROUNDS) {
      setGameOver(true);
      const score = scoreByAccuracy(hits, ROUNDS);
      const fp = getFingerprint();
      useAppStore.getState().addCognitiveResult({
        id: uuid(), patientId: 'P001', date: new Date().toISOString().split('T')[0],
        domain: 'attention', score, probeOrAdaptive: 'adaptive',
        baselineScore: fp.attention.baseline, baselineDeviation: score - fp.attention.baseline,
        gameName: 'Tap Target',
      });
      return;
    }
    const isTarget = Math.random() > 0.5;
    setCurrentItem(isTarget ? TARGET : ITEMS[Math.floor(Math.random() * ITEMS.length)]);
    setFeedback(null);
  }, [round, hits]);

  useEffect(() => { nextRound(); }, []);

  const handleTap = (isTarget: boolean) => {
    if (feedback) return;
    if (isTarget) {
      setHits(h => h + 1);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }
    setTimeout(() => {
      setRound(r => r + 1);
      nextRound();
    }, 600);
  };

  if (gameOver) {
    const score = scoreByAccuracy(hits, ROUNDS);
    return (
      <GameWrapper title="Tap Target" subtitle="Tap the star when you see it" score={hits} totalQuestions={ROUNDS}>
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-6xl mb-4">⭐</span>
          <p className="text-2xl font-bold text-gray-800 mb-2">Well done!</p>
          <p className="text-gray-500 mb-6">{getEncouragingMessage(score)}</p>
          <p className="text-xs text-gray-400 mb-4">🎮 Practice Result</p>
          <button onClick={() => window.history.back()} className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg">Done</button>
        </div>
      </GameWrapper>
    );
  }

  return (
    <GameWrapper title="Tap Target" subtitle="Tap the ⭐ when you see it!" score={hits} totalQuestions={ROUNDS}>
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-gray-400 mb-8">Round {round + 1} of {ROUNDS}</p>

        <button
          onClick={() => handleTap(currentItem === TARGET)}
          className={`w-32 h-32 rounded-3xl text-6xl flex items-center justify-center transition-all active:scale-95 ${
            feedback === 'correct' ? 'bg-success-100 border-4 border-success-400' :
            feedback === 'wrong' ? 'bg-alert-50 border-4 border-alert-400' :
            'bg-white border-4 border-gray-200 shadow-lg hover:shadow-xl'
          }`}
        >
          {currentItem}
        </button>

        {feedback && (
          <p className={`mt-4 text-lg font-medium ${feedback === 'correct' ? 'text-success-600' : 'text-warm-500'}`}>
            {feedback === 'correct' ? 'Nice!' : 'Let\'s try that together.'}
          </p>
        )}

        <p className="text-xs text-gray-400 mt-6">Tap the ⭐, ignore other items</p>
      </div>
    </GameWrapper>
  );
}
