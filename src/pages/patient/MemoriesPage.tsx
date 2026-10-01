import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Play, Pause, Check, Volume2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { t } from '../../utils/translations';
import { getMemories, getApprovedActivities, addMemoryCompletion, getMemoryCompletions } from '../../services/storage';
import { v4 as uuid } from 'uuid';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import type { Memory, MemoryActivity, MemoryActivityType } from '../../types';

type ViewState = 'list' | 'memory_detail' | 'activity' | 'result';

export default function MemoriesPage() {
  const navigate = useNavigate();
  const { language, addMemoryCompletion: storeAddCompletion } = useAppStore();
  const [view, setView] = useState<ViewState>('list');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<MemoryActivity | null>(null);
  const [score, setScore] = useState(0);
  const [, setPatientAnswer] = useState('');

  const refresh = useCallback(() => setScore(s => s), []);

  const memories = getMemories().filter(m => m.status === 'approved');
  const approvedActivities = getApprovedActivities();
  const completions = getMemoryCompletions();

  // Group activities by source memory
  const activitiesByMemory = new Map<string, MemoryActivity[]>();
  for (const act of approvedActivities) {
    const existing = activitiesByMemory.get(act.sourceMemoryId) || [];
    existing.push(act);
    activitiesByMemory.set(act.sourceMemoryId, existing);
  }

  const handleComplete = (correct: boolean, answer: string) => {
    const newScore = correct ? 100 : 30;
    setScore(newScore);
    setPatientAnswer(answer);

    if (selectedActivity) {
      const completion = {
        id: uuid(),
        patientId: 'P001',
        activityId: selectedActivity.id,
        sourceMemoryId: selectedActivity.sourceMemoryId,
        activityType: selectedActivity.activityType,
        score: newScore,
        patientAnswer: answer,
        completedAt: new Date().toISOString(),
      };
      addMemoryCompletion(completion);
      storeAddCompletion(completion);
    }

    setView('result');
    refresh();
  };

  const handleBack = () => {
    if (view === 'activity') {
      setView('memory_detail');
      setSelectedActivity(null);
    } else {
      setView('list');
      setSelectedMemory(null);
      setSelectedActivity(null);
    }
  };

  if (view === 'memory_detail' && selectedMemory) {
    const memActivities = activitiesByMemory.get(selectedMemory.id) || [];
    return (
      <MemoryDetailView
        memory={selectedMemory}
        activities={memActivities}
        completions={completions}
        onSelectActivity={(act) => { setSelectedActivity(act); setView('activity'); }}
        onBack={() => { setView('list'); setSelectedMemory(null); }}
      />
    );
  }

  if (view === 'activity' && selectedActivity && selectedMemory) {
    return (
      <ActivityPlayer
        memory={selectedMemory}
        activity={selectedActivity}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    );
  }

  if (view === 'result' && selectedActivity) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-success-50 to-white page-enter">
        <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: '80vh' }}>
          <span className="text-6xl mb-4">🌟</span>
          <p className="text-2xl font-bold text-gray-800 mb-2">
            {score >= 80 ? 'Wonderful memory!' : 'Nice try!'}
          </p>
          <p className="text-gray-500 text-center mb-2">
            {score >= 80
              ? 'You remembered perfectly. Thank you for sharing this memory.'
              : "Let's try that together. Every memory is special."}
          </p>
          <p className="text-sm text-gray-400 mb-8">Thank you for sharing this memory.</p>
          <button
            onClick={handleBack}
            className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg"
          >
            Back to Memories
          </button>
        </div>
      </div>
    );
  }

  // ---- List View ----
  return (
    <div className="page-enter">
      <div className="flex items-center gap-3 px-4 pt-10 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{t('memories.title', language)} ❤️</h1>
      </div>

      <div className="px-4 space-y-3">
        {memories.map((memory) => {
          const memActivities = activitiesByMemory.get(memory.id) || [];
          const completedCount = memActivities.filter(a =>
            completions.some(c => c.activityId === a.id)
          ).length;

          return (
            <MemoryListItem
              key={memory.id}
              memory={memory}
              completedCount={completedCount}
              totalCount={memActivities.length}
              onClick={() => { setSelectedMemory(memory); setView('memory_detail'); }}
            />
          );
        })}
      </div>

      {memories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <span className="text-5xl mb-4">📷</span>
          <p className="text-gray-500 text-center">No memories available yet. Ask a family member to add some!</p>
        </div>
      )}
    </div>
  );
}

// ---- Memory List Item (uses hook for media URL) ----
function MemoryListItem({ memory, completedCount, totalCount, onClick }: {
  memory: Memory; completedCount: number; totalCount: number; onClick: () => void;
}) {
  const { url: mediaUrl } = useMediaUrl(memory.mediaId, memory.imageUrl || undefined);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100
                 active:scale-[0.98] transition-transform hover:shadow-md"
    >
      {mediaUrl ? (
        <img
          src={mediaUrl} alt={memory.title}
          className="w-20 h-20 rounded-xl object-cover shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-20 h-20 rounded-xl bg-warm-50 flex items-center justify-center text-3xl shrink-0">🎙️</div>
      )}
      <div className="text-left flex-1 min-w-0">
        <div className="font-bold text-gray-800">{memory.title}</div>
        <div className="text-sm text-gray-400 truncate">{memory.description}</div>
        {totalCount > 0 && (
          <div className="text-xs text-primary-500 mt-1">
            {completedCount}/{totalCount} activities completed
          </div>
        )}
      </div>
      <ChevronRight size={20} className="text-gray-300 shrink-0" />
    </button>
  );
}

// ---- Memory Detail / Activity Selection ----
function MemoryDetailView({ memory, activities, completions, onSelectActivity, onBack }: {
  memory: Memory;
  activities: MemoryActivity[];
  completions: { activityId: string }[];
  onSelectActivity: (activity: MemoryActivity) => void;
  onBack: () => void;
}) {
  const { url: mediaUrl } = useMediaUrl(memory.mediaId, memory.imageUrl || undefined);
  const activityLabels: Record<MemoryActivityType, { icon: string; label: string }> = {
    who_is_this: { icon: '👤', label: 'Who is this?' },
    where_was_this: { icon: '📍', label: 'Where was this?' },
    complete_the_memory: { icon: '📝', label: 'Complete the memory' },
    what_happened_next: { icon: '🔗', label: 'What happened next?' },
    whose_voice_is_this: { icon: '🎙️', label: 'Whose voice is this?' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-success-50 to-white page-enter">
      <div className="flex items-center gap-3 px-4 pt-10 pb-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">{memory.title}</h1>
      </div>

      <div className="px-4">
        {mediaUrl && (
          <div className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 mb-6">
            <img src={mediaUrl} alt={memory.title} className="w-full h-64 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23f3f4f6" width="400" height="300"/><text fill="%239ca3af" font-family="sans-serif" font-size="20" text-anchor="middle" x="200" y="160">📷 Photo</text></svg>'; }} />
          </div>
        )}

        {memory.type === 'audio' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 text-center">
            <div className="w-20 h-20 rounded-full bg-warm-50 flex items-center justify-center mx-auto mb-3">
              <Volume2 size={32} className="text-warm-500" />
            </div>
            <p className="text-sm text-gray-500">{memory.familyMember || 'Family voice recording'}</p>
          </div>
        )}

        <p className="text-gray-500 mb-6 text-center">{memory.description}</p>

        <div className="space-y-3">
          {activities.map(activity => {
            const completed = completions.some(c => c.activityId === activity.id);
            const info = activityLabels[activity.activityType] || { icon: '❓', label: activity.activityType };

            return (
              <button
                key={activity.id}
                onClick={() => onSelectActivity(activity)}
                className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100
                           active:scale-[0.98] transition-transform hover:shadow-md"
              >
                <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center text-2xl shrink-0">
                  {info.icon}
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-gray-800">{info.label}</div>
                  <div className="text-sm text-gray-400 mt-0.5">{activity.question}</div>
                </div>
                {completed ? (
                  <div className="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center">
                    <Check size={16} className="text-success-500" />
                  </div>
                ) : (
                  <ChevronRight size={20} className="text-gray-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Activity Player ----
function ActivityPlayer({ memory, activity, onComplete, onBack }: {
  memory: Memory;
  activity: MemoryActivity;
  onComplete: (correct: boolean, answer: string) => void;
  onBack: () => void;
}) {
  const { url: mediaUrl } = useMediaUrl(memory.mediaId, memory.imageUrl || undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [sequenceOrder, setSequenceOrder] = useState<string[]>(activity.sequenceCards || []);
  const [storyAnswer, setStoryAnswer] = useState('');
  const [audioPlaying, setAudioPlaying] = useState(false);

  if (activity.activityType === 'who_is_this' || activity.activityType === 'where_was_this' || activity.activityType === 'whose_voice_is_this') {
    // Multiple choice
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white page-enter">
        <div className="flex items-center gap-3 px-4 pt-10 pb-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{activity.question}</h1>
        </div>

        <div className="px-4">
          {/* Media display */}
          {mediaUrl && activity.activityType !== 'whose_voice_is_this' && (
            <div className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 mb-6">
              <img src={mediaUrl} alt="" className="w-full h-48 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23f3f4f6" width="400" height="300"/><text fill="%239ca3af" font-family="sans-serif" font-size="20" text-anchor="middle" x="200" y="160">📷</text></svg>'; }} />
            </div>
          )}

          {activity.activityType === 'whose_voice_is_this' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 text-center">
              <button
                onClick={() => setAudioPlaying(!audioPlaying)}
                className="w-16 h-16 rounded-full bg-warm-500 text-white flex items-center justify-center mx-auto mb-3 active:scale-95"
              >
                {audioPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
              <p className="text-sm text-gray-500">{activity.audioLabel || 'Voice recording'}</p>
              <p className="text-xs text-gray-400 mt-1">Listen, then answer</p>
            </div>
          )}

          {/* Options */}
          {activity.options && (
            <div className="space-y-3">
              {activity.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => setSelected(opt)}
                  disabled={!!selected}
                  className={`w-full py-4 px-5 rounded-xl border-2 font-medium text-lg transition-all text-left ${
                    selected === opt
                      ? opt === activity.correctAnswer
                        ? 'bg-success-50 border-success-500'
                        : 'bg-alert-50 border-alert-500'
                      : selected && opt === activity.correctAnswer
                        ? 'bg-success-50 border-success-500'
                        : 'bg-white border-gray-100 hover:border-gray-300'
                  } ${!selected ? 'active:scale-[0.98]' : ''}`}
                >
                  {opt}
                  {selected && opt === activity.correctAnswer && <span className="ml-2">✓</span>}
                  {selected === opt && opt !== activity.correctAnswer && <span className="ml-2">✗</span>}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="mt-6 text-center">
              <p className={`text-lg font-medium mb-4 ${
                selected === activity.correctAnswer ? 'text-success-600' : 'text-warm-500'
              }`}>
                {selected === activity.correctAnswer
                  ? 'Wonderful memory! That is correct.'
                  : "Let's try that together. Every memory is special."}
              </p>
              <button
                onClick={() => onComplete(selected === activity.correctAnswer, selected)}
                className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activity.activityType === 'complete_the_memory') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-warm-50 to-white page-enter">
        <div className="flex items-center gap-3 px-4 pt-10 pb-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Complete the memory</h1>
        </div>

        <div className="px-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <p className="text-xl text-gray-700 font-medium leading-relaxed">
              {activity.storyTemplate}
            </p>
          </div>

          {activity.options && (
            <p className="text-sm text-gray-400 mb-3">Choose the missing word:</p>
          )}

          {activity.options && (
            <div className="space-y-3">
              {activity.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => setStoryAnswer(opt)}
                  disabled={!!storyAnswer}
                  className={`w-full py-4 px-5 rounded-xl border-2 font-medium text-lg transition-all text-left ${
                    storyAnswer === opt
                      ? opt === activity.correctAnswer
                        ? 'bg-success-50 border-success-500'
                        : 'bg-alert-50 border-alert-500'
                      : storyAnswer && opt === activity.correctAnswer
                        ? 'bg-success-50 border-success-500'
                        : 'bg-white border-gray-100 hover:border-gray-300'
                  } ${!storyAnswer ? 'active:scale-[0.98]' : ''}`}
                >
                  {opt}
                  {storyAnswer && opt === activity.correctAnswer && <span className="ml-2">✓</span>}
                  {storyAnswer === opt && opt !== activity.correctAnswer && <span className="ml-2">✗</span>}
                </button>
              ))}
            </div>
          )}

          {storyAnswer && (
            <div className="mt-6 text-center">
              <p className={`text-lg font-medium mb-4 ${
                storyAnswer === activity.correctAnswer ? 'text-success-600' : 'text-warm-500'
              }`}>
                {storyAnswer === activity.correctAnswer
                  ? 'Wonderful memory! You remembered perfectly.'
                  : "Let's try that together. Every memory is special."}
              </p>
              <button
                onClick={() => onComplete(storyAnswer === activity.correctAnswer, storyAnswer)}
                className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activity.activityType === 'what_happened_next') {
    // Sequence ordering
    const moveCard = (from: number, direction: -1 | 1) => {
      const to = from + direction;
      if (to < 0 || to >= sequenceOrder.length) return;
      const next = [...sequenceOrder];
      [next[from], next[to]] = [next[to], next[from]];
      setSequenceOrder(next);
    };

    const isCorrect = JSON.stringify(sequenceOrder) === JSON.stringify(activity.sequenceCards);

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white page-enter">
        <div className="flex items-center gap-3 px-4 pt-10 pb-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{activity.question}</h1>
        </div>

        <div className="px-4">
          <p className="text-sm text-gray-400 mb-4">Tap arrows to put events in order:</p>

          <div className="space-y-2">
            {sequenceOrder.map((card, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-gray-700 font-medium">{card}</span>
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveCard(i, -1)} disabled={i === 0}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-30 text-sm">▲</button>
                  <button onClick={() => moveCard(i, 1)} disabled={i === sequenceOrder.length - 1}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-30 text-sm">▼</button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onComplete(isCorrect, sequenceOrder.join(' → '))}
            className={`w-full mt-6 py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-lg ${
              isCorrect ? 'bg-success-500 text-white' : 'bg-primary-500 text-white'
            }`}
          >
            Check Order
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500">Activity type not available yet.</p>
        <button onClick={onBack} className="mt-4 text-primary-500 font-medium">Go back</button>
      </div>
    </div>
  );
}
