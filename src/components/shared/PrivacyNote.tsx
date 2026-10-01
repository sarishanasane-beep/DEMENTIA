import { Shield } from 'lucide-react';

export default function PrivacyNote() {
  return (
    <div className="mx-4 mt-6 px-4 py-3 bg-gray-50 rounded-xl flex items-center gap-3">
      <Shield size={18} className="text-gray-400 shrink-0" />
      <p className="text-xs text-gray-400 leading-relaxed">
        Microphone is used only during voice interactions. Your voice data is stored securely on this device.
      </p>
    </div>
  );
}
