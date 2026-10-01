import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface GameWrapperProps {
  title: string;
  subtitle?: string;
  score?: number;
  totalQuestions?: number;
  children: React.ReactNode;
}

export default function GameWrapper({ title, subtitle, score, totalQuestions, children }: GameWrapperProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-50 to-white page-enter">
      <div className="flex items-center justify-between px-4 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{title}</h1>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {score !== undefined && totalQuestions !== undefined && (
          <div className="bg-white rounded-xl px-3 py-1 shadow-sm border border-gray-100">
            <span className="font-bold text-primary-600">{score}</span>
            <span className="text-gray-400"> / {totalQuestions}</span>
          </div>
        )}
      </div>
      <div className="px-4 pb-8">
        {children}
      </div>
    </div>
  );
}
