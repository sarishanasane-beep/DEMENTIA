import { useState } from 'react';
import GameWrapper from '../../../components/games/GameWrapper';
import { useAppStore } from '../../../store/useAppStore';
import { getFingerprint } from '../../../services/storage';
import { scoreByAccuracy, getEncouragingMessage } from '../../../services/scoring';
import { v4 as uuid } from 'uuid';

const STORIES = [
  {
    title: 'Morning Routine',
    story: 'Every morning, Anita Devi wakes up at 6 AM. She brushes her teeth, then makes tea for the family. After tea, she takes her medicine with breakfast.',
    questions: [
      { q: 'What does Anita do first after waking up?', answer: 'Brushes teeth', options: ['Brushes teeth', 'Makes tea', 'Takes medicine', 'Goes for a walk'] },
      { q: 'What does she make after brushing?', answer: 'Tea', options: ['Tea', 'Coffee', 'Breakfast', 'Lunch'] },
      { q: 'When does she take her medicine?', answer: 'After tea with breakfast', options: ['Before breakfast', 'After tea with breakfast', 'At lunch', 'Before bed'] },
    ],
  },
];

export default function StoryRecallGame() {
  // Store accessed via useAppStore.getState() for results
  const [phase, setPhase] = useState<'reading' | 'questions' | 'result'>('reading');
  const [currentQ, setCurrentQ] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const story = STORIES[0];

  const handleAnswer = (answer: string) => {
    if (selected) return;
    setSelected(answer);
    const isCorrect = answer === story.questions[currentQ].answer;
    if (isCorrect) setCorrect(c => c + 1);

    setTimeout(() => {
      setSelected(null);
      if (currentQ + 1 < story.questions.length) {
        setCurrentQ(q => q + 1);
      } else {
        setPhase('result');
        const finalCorrect = isCorrect ? correct + 1 : correct;
        const score = scoreByAccuracy(finalCorrect, story.questions.length);
        const fp = getFingerprint();
        useAppStore.getState().addCognitiveResult({
          id: uuid(), patientId: 'P001', date: new Date().toISOString().split('T')[0],
          domain: 'memory', score, probeOrAdaptive: 'adaptive',
          baselineScore: fp.memory.baseline, baselineDeviation: score - fp.memory.baseline,
          gameName: 'Story Recall',
        });
      }
    }, 1200);
  };

  if (phase === 'reading') {
    return (
      <GameWrapper title="Story Recall" subtitle="Read the story carefully">
        <div className="py-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <p className="text-lg text-gray-700 leading-relaxed">{story.story}</p>
          </div>
          <p className="text-sm text-gray-400 text-center mb-6 animate-pulse">Remember the details...</p>
          <button onClick={() => setPhase('questions')}
            className="w-full py-4 bg-primary-500 text-white rounded-2xl font-bold text-lg active:scale-95 shadow-lg">
            I&apos;m ready!
          </button>
        </div>
      </GameWrapper>
    );
  }

  if (phase === 'result') {
    const score = scoreByAccuracy(correct, story.questions.length);
    return (
      <GameWrapper title="Story Recall" score={correct} totalQuestions={story.questions.length}>
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-6xl mb-4">📖</span>
          <p className="text-2xl font-bold text-gray-800 mb-2">Well done!</p>
          <p className="text-gray-500 mb-6">{getEncouragingMessage(score)}</p>
          <p className="text-xs text-gray-400 mb-4">🎮 Practice Result</p>
          <button onClick={() => window.history.back()} className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg">Done</button>
        </div>
      </GameWrapper>
    );
  }

  const q = story.questions[currentQ];
  return (
    <GameWrapper title="Story Recall" subtitle={`Question ${currentQ + 1} of ${story.questions.length}`} score={correct} totalQuestions={story.questions.length}>
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
            {selected === q.answer ? 'Good memory!' : "Let's try that together."}
          </p>
        )}
      </div>
    </GameWrapper>
  );
}
