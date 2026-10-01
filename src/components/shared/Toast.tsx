import { useAppStore } from '../../store/useAppStore';
import { CheckCircle, Info, AlertTriangle } from 'lucide-react';

export default function Toast() {
  const { toast, clearToast } = useAppStore();
  if (!toast) return null;

  const icons = {
    success: <CheckCircle size={20} className="text-success-500" />,
    info: <Info size={20} className="text-primary-500" />,
    warning: <AlertTriangle size={20} className="text-caution-500" />,
  };

  const bgColors = {
    success: 'bg-success-50 border-success-500',
    info: 'bg-primary-50 border-primary-500',
    warning: 'bg-caution-50 border-caution-500',
  };

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${bgColors[toast.type]} animate-[page-in_0.3s_ease-out]`}
      onClick={clearToast}
    >
      {icons[toast.type]}
      <span className="text-sm font-medium text-gray-800">{toast.message}</span>
    </div>
  );
}
