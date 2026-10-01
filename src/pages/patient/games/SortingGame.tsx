import { useState } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { getFingerprint } from '../../../services/storage';
import { getEncouragingMessage } from '../../../services/scoring';
import { v4 as uuid } from 'uuid';

const SORT_SETS = [
  {
    categories: ['🍎 Fruits', '🥕 Vegetables'],
    items: [
      { id: 1, label: 'Apple', emoji: '🍎', category: '🍎 Fruits', color: 'bg-red-100 border-red-300' },
      { id: 2, label: 'Carrot', emoji: '🥕', category: '🥕 Vegetables', color: 'bg-orange-100 border-orange-300' },
      { id: 3, label: 'Banana', emoji: '🍌', category: '🍎 Fruits', color: 'bg-yellow-100 border-yellow-300' },
      { id: 4, label: 'Spinach', emoji: '🥬', category: '🥕 Vegetables', color: 'bg-green-100 border-green-300' },
      { id: 5, label: 'Mango', emoji: '🥭', category: '🍎 Fruits', color: 'bg-amber-100 border-amber-300' },
      { id: 6, label: 'Potato', emoji: '🥔', category: '🥕 Vegetables', color: 'bg-stone-100 border-stone-300' },
    ],
  },
  {
    categories: ['🔴 Red', '🔵 Blue', '🟡 Yellow'],
    items: [
      { id: 1, label: 'Rose', emoji: '🌹', category: '🔴 Red', color: 'bg-red-100 border-red-300' },
      { id: 2, label: 'Sky', emoji: '☁️', category: '🔵 Blue', color: 'bg-blue-100 border-blue-300' },
      { id: 3, label: 'Sun', emoji: '☀️', category: '🟡 Yellow', color: 'bg-yellow-100 border-yellow-300' },
      { id: 4, label: 'Cherry', emoji: '🍒', category: '🔴 Red', color: 'bg-red-100 border-red-300' },
      { id: 5, label: 'Ocean', emoji: '🌊', category: '🔵 Blue', color: 'bg-blue-100 border-blue-300' },
      { id: 6, label: 'Lemon', emoji: '🍋', category: '🟡 Yellow', color: 'bg-yellow-100 border-yellow-300' },
    ],
  },
];

type SortingPhase = 'intro' | 'sorting' | 'result';

export default function SortingGame() {
  useAppStore();
  const [phase, setPhase] = useState<SortingPhase>('intro');
  const [setIdx] = useState(Math.floor(Math.random() * SORT_SETS.length));
  const currentSet = SORT_SETS[setIdx];
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  const handleItemTap = (itemId: number) => {
    setSelectedItem(itemId);
  };

  const handleCategoryTap = (category: string) => {
    if (selectedItem === null) return;
    setAssignments(prev => ({ ...prev, [selectedItem]: category }));
    setSelectedItem(null);
  };

  const calculateScore = () => {
    let correct = 0;
    currentSet.items.forEach(item => {
      if (assignments[item.id] === item.category) correct++;
    });
    return Math.round((correct / currentSet.items.length) * 100);
  };

  const handleComplete = () => {
    const score = calculateScore();
    const fp = getFingerprint();
    useAppStore.getState().addCognitiveResult({
      id: uuid(),
      patientId: 'P001',
      date: new Date().toISOString().split('T')[0],
      domain: 'attention',
      score,
      probeOrAdaptive: 'adaptive',
      baselineScore: fp.attention.baseline,
      baselineDeviation: score - fp.attention.baseline,
      gameName: 'Sorting',
    });
    setPhase('result');
  };

  if (phase === 'intro') {
    return (
      <GameWrapper title="Sorting" subtitle="Sort the items into groups">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-6xl mb-6">🔢</div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-3">Sort the Items</h2>
          <p className="text-lg text-gray-600 text-center mb-8">
            Tap an item, then tap the category it belongs to.
          </p>
          <button
            onClick={() => setPhase('sorting')}
            className="w-full max-w-sm py-4 bg-indigo-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-indigo-600 transition"
          >
            Let's Start
          </button>
        </div>
      </GameWrapper>
    );
  }

  if (phase === 'result') {
    const score = calculateScore();
    const correct = currentSet.items.filter(i => assignments[i.id] === i.category).length;
    return (
      <GameWrapper title="Sorting" score={score} totalQuestions={100}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Nice Effort!</h2>
          <p className="text-lg text-gray-600 text-center mb-2">
            You sorted {correct} out of {currentSet.items.length} correctly.
          </p>
          <p className="text-gray-500 mb-6">{getEncouragingMessage(score)}</p>
          <p className="text-xs text-gray-400 mb-4">🎮 Practice Result</p>
          <button
            onClick={() => window.history.back()}
            className="w-full max-w-sm py-4 bg-indigo-500 text-white text-xl font-bold rounded-2xl shadow-lg"
          >
            Done
          </button>
        </div>
      </GameWrapper>
    );
  }

  return (
    <GameWrapper title="Sorting" subtitle="Sort items into groups">
      <div className="p-2">
        {/* Category buckets */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {currentSet.categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryTap(cat)}
              className={`flex-shrink-0 px-4 py-3 rounded-xl text-lg font-semibold border-2 transition ${
                selectedItem !== null
                  ? 'border-indigo-400 bg-indigo-50 hover:bg-indigo-100 cursor-pointer'
                  : 'border-gray-200 bg-gray-50 opacity-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items to sort */}
        <div className="grid grid-cols-3 gap-3">
          {currentSet.items.map(item => (
            <button
              key={item.id}
              onClick={() => handleItemTap(item.id)}
              className={`p-4 rounded-xl border-2 text-center transition ${
                assignments[item.id]
                  ? 'bg-green-50 border-green-300'
                  : selectedItem === item.id
                  ? 'bg-indigo-100 border-indigo-500 scale-105'
                  : `${item.color} hover:scale-105`
              }`}
            >
              <div className="text-3xl mb-1">{item.emoji}</div>
              <div className="text-sm font-medium text-gray-700">{item.label}</div>
              {assignments[item.id] && (
                <div className="text-xs text-green-600 mt-1">{assignments[item.id]}</div>
              )}
            </button>
          ))}
        </div>

        {/* Submit */}
        {Object.keys(assignments).length === currentSet.items.length && (
          <button
            onClick={handleComplete}
            className="w-full mt-6 py-4 bg-indigo-500 text-white text-xl font-bold rounded-2xl shadow-lg"
          >
            Check My Sorting
          </button>
        )}
      </div>
    </GameWrapper>
  );
}
