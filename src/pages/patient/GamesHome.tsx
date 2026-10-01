import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, MessageSquare, Compass, Eye, Shield, Star } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { t } from '../../utils/translations';

interface GameItem {
  name: string;
  path: string;
  tag: string;
  tagColor: string;
  desc: string;
}

interface DomainGroup {
  domain: string;
  label: string;
  icon: typeof Brain;
  color: string;
  games: GameItem[];
}

const DOMAINS: DomainGroup[] = [
  {
    domain: 'memory',
    label: 'Memory',
    icon: Brain,
    color: 'from-primary-500 to-primary-600',
    games: [
      { name: 'Object Recall', path: '/patient/games/memory', tag: '📊 Probe', tagColor: 'bg-blue-100 text-blue-700', desc: 'Recall objects you saw' },
      { name: 'Photo Pairs', path: '/patient/games/photo-pairs', tag: '🎮 Practice', tagColor: 'bg-green-100 text-green-700', desc: 'Match pairs of cards' },
      { name: 'Story Recall', path: '/patient/games/story-recall', tag: '🎮 Practice', tagColor: 'bg-green-100 text-green-700', desc: 'Remember a short story' },
    ],
  },
  {
    domain: 'language',
    label: 'Language',
    icon: MessageSquare,
    color: 'from-warm-500 to-warm-600',
    games: [
      { name: 'Word Match', path: '/patient/games/language', tag: '📊 Probe', tagColor: 'bg-blue-100 text-blue-700', desc: 'Match words with pictures' },
      { name: 'Finish the Phrase', path: '/patient/games/finish-phrase', tag: '🎮 Practice', tagColor: 'bg-green-100 text-green-700', desc: 'Complete familiar sayings' },
    ],
  },
  {
    domain: 'orientation',
    label: 'Orientation',
    icon: Compass,
    color: 'from-success-500 to-success-600',
    games: [
      { name: 'Day & Place', path: '/patient/games/orientation', tag: '📊 Probe', tagColor: 'bg-blue-100 text-blue-700', desc: 'Know your day and time' },
      { name: 'Time of Day', path: '/patient/games/time-of-day', tag: '🎮 Practice', tagColor: 'bg-green-100 text-green-700', desc: 'Match activities to times' },
    ],
  },
  {
    domain: 'attention',
    label: 'Attention',
    icon: Eye,
    color: 'from-purple-500 to-purple-600',
    games: [
      { name: 'Pattern Continue', path: '/patient/games/attention', tag: '📊 Probe', tagColor: 'bg-blue-100 text-blue-700', desc: 'Complete the pattern' },
      { name: 'Tap the Target', path: '/patient/games/tap-target', tag: '🎮 Practice', tagColor: 'bg-green-100 text-green-700', desc: 'Tap only the right ones' },
      { name: 'Sorting', path: '/patient/games/sorting', tag: '🎮 Practice', tagColor: 'bg-green-100 text-green-700', desc: 'Sort items into groups' },
    ],
  },
  {
    domain: 'judgement',
    label: 'Judgement',
    icon: Shield,
    color: 'from-pink-500 to-pink-600',
    games: [
      { name: 'Judgement Check', path: '/patient/games/judgement-check', tag: '📊 Probe', tagColor: 'bg-blue-100 text-blue-700', desc: 'Safety & decision measurement' },
      { name: 'Judgement Practice', path: '/patient/games/judgement-practice', tag: '🎮 Practice', tagColor: 'bg-green-100 text-green-700', desc: 'Safety & decision stories' },
    ],
  },
  {
    domain: 'extra',
    label: 'More Activities',
    icon: Star,
    color: 'from-teal-500 to-teal-600',
    games: [
      { name: 'Routine Sequencing', path: '/patient/games/routine', tag: '🎮 Practice', tagColor: 'bg-green-100 text-green-700', desc: 'Arrange daily steps in order' },
      { name: 'How I Feel', path: '/patient/games/mood', tag: '💜 Check-in', tagColor: 'bg-purple-100 text-purple-700', desc: 'Share how you are feeling' },
    ],
  },
];

export default function GamesHome() {
  const navigate = useNavigate();
  const { language } = useAppStore();
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  return (
    <div className="page-enter pb-24">
      <div className="flex items-center gap-3 px-4 pt-10 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{t('games.title', language)}</h1>
      </div>

      <div className="px-4 space-y-3">
        {DOMAINS.map(domain => {
          const Icon = domain.icon;
          const isExpanded = expandedDomain === domain.domain;

          return (
            <div key={domain.domain} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setExpandedDomain(isExpanded ? null : domain.domain)}
                className="w-full flex items-center gap-4 p-4 active:scale-[0.98] transition-transform"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center shrink-0`}>
                  <Icon size={28} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-gray-800 text-lg">{domain.label}</div>
                  <div className="text-sm text-gray-400">{domain.games.length} {domain.games.length === 1 ? 'game' : 'games'}</div>
                </div>
                <div className="text-gray-300 text-xl transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                  ›
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {domain.games.map(game => (
                    <button
                      key={game.path}
                      onClick={() => navigate(game.path)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition text-left"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{game.name}</div>
                        <div className="text-sm text-gray-500">{game.desc}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${game.tagColor}`}>
                        {game.tag}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mx-4 mt-6 px-4 py-3 bg-warm-50 rounded-xl text-center text-xs text-warm-500 font-medium">
        🎮 Games help keep your mind active. Have fun!
      </div>
    </div>
  );
}
