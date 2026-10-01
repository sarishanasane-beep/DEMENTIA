import { useState, useEffect } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { getFingerprint } from '../../../services/storage';
import { scoreByAccuracy, getEncouragingMessage } from '../../../services/scoring';
import { v4 as uuid } from 'uuid';

const EMOJI_PAIRS = [
  { emoji: '🍎', id: 'apple' }, { emoji: '🍎', id: 'apple' },
  { emoji: '🌟', id: 'star' }, { emoji: '🌟', id: 'star' },
  { emoji: '🐱', id: 'cat' }, { emoji: '🐱', id: 'cat' },
  { emoji: '🌺', id: 'flower' }, { emoji: '🌺', id: 'flower' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PhotoPairsGame() {
  // Store accessed via useAppStore.getState() for results
  const [cards, setCards] = useState<{ emoji: string; id: string; flipped: boolean; matched: boolean }[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    setCards(shuffle(EMOJI_PAIRS).map((c, i) => ({ ...c, flipped: false, matched: false, key: i })));
  }, []);

  useEffect(() => {
    if (selected.length === 2) {
      const [a, b] = selected;
      setMoves(m => m + 1);
      if (cards[a].id === cards[b].id) {
        setCards(prev => prev.map((c, i) => i === a || i === b ? { ...c, matched: true } : c));
        setMatchedPairs(p => p + 1);
        setSelected([]);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => i === a || i === b ? { ...c, flipped: false } : c));
          setSelected([]);
        }, 800);
      }
    }
  }, [selected, cards]);

  useEffect(() => {
    if (matchedPairs === 4 && !gameOver) {
      setGameOver(true);
      const fp = getFingerprint();
      const score = scoreByAccuracy(matchedPairs, 4);
      useAppStore.getState().addCognitiveResult({
        id: uuid(), patientId: 'P001', date: new Date().toISOString().split('T')[0],
        domain: 'memory', score, probeOrAdaptive: 'adaptive',
        baselineScore: fp.memory.baseline, baselineDeviation: score - fp.memory.baseline,
        gameName: 'Photo Pairs',
      });
    }
  }, [matchedPairs, gameOver]);

  const handleCardClick = (idx: number) => {
    if (cards[idx].flipped || cards[idx].matched || selected.length >= 2) return;
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, flipped: true } : c));
    setSelected(prev => [...prev, idx]);
  };

  if (gameOver) {
    const score = scoreByAccuracy(matchedPairs, 4);
    return (
      <GameWrapper title="Photo Pairs" score={score} totalQuestions={4}>
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-6xl mb-4">🌟</span>
          <p className="text-2xl font-bold text-gray-800 mb-2">Well done!</p>
          <p className="text-gray-500 mb-2">{getEncouragingMessage(score)}</p>
          <p className="text-sm text-gray-400 mb-6">Matched all pairs in {moves} moves</p>
          <p className="text-xs text-gray-400 mb-4">🎮 Practice Result</p>
          <button onClick={() => window.history.back()} className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg">Done</button>
        </div>
      </GameWrapper>
    );
  }

  return (
    <GameWrapper title="Photo Pairs" subtitle="Match the pairs" score={matchedPairs} totalQuestions={4}>
      <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto py-4">
        {cards.map((card, idx) => (
          <button key={idx} onClick={() => handleCardClick(idx)}
            className={`aspect-square rounded-2xl text-3xl flex items-center justify-center transition-all border-2 ${
              card.matched ? 'bg-success-50 border-success-300' :
              card.flipped ? 'bg-primary-50 border-primary-300' :
              'bg-white border-gray-200 hover:border-primary-300 active:scale-95'
            }`}>
            {(card.flipped || card.matched) ? card.emoji : '?'}
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-gray-400 mt-4">Moves: {moves}</p>
    </GameWrapper>
  );
}
