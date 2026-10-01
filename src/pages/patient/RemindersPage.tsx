import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Bell, Plus, Trash2, X, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { t } from '../../utils/translations';
import { getReminders, addReminder, updateReminder, deleteReminder } from '../../services/storage';
import { v4 as uuid } from 'uuid';
import type { Reminder } from '../../types';

const repeatLabels: Record<string, Record<string, string>> = {
  en: { daily: 'Every day', weekly: 'Every week', once: 'One time' },
  as: { daily: 'প্ৰতিদিন', weekly: 'প্ৰতি সপ্তাহ', once: 'এবাৰ' },
  hi: { daily: 'हर दिन', weekly: 'हर सप्ताह', once: 'एक बार' },
};

export default function RemindersPage() {
  const navigate = useNavigate();
  const { language } = useAppStore();
  const [reminders, setReminders] = useState<Reminder[]>(getReminders());
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newRepeat, setNewRepeat] = useState<'daily' | 'weekly' | 'once'>('daily');

  const refresh = () => setReminders(getReminders());

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addReminder({
      id: uuid(),
      patientId: 'P001',
      title: newTitle.trim(),
      description: newDesc.trim() || newTitle.trim(),
      time: newTime,
      repeat: newRepeat,
      enabled: true,
    });
    refresh();
    setShowAdd(false);
    setNewTitle('');
    setNewDesc('');
    setNewTime('08:00');
    setNewRepeat('daily');
  };

  const handleDelete = (id: string) => {
    deleteReminder(id);
    refresh();
  };

  const handleToggle = (id: string, enabled: boolean) => {
    updateReminder(id, { enabled: !enabled });
    refresh();
  };

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between px-4 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{t('home.reminders', language)}</h1>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg active:scale-95"
        >
          {showAdd ? <X size={24} /> : <Plus size={24} />}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mx-4 mb-4 bg-white rounded-2xl p-5 shadow-sm border border-primary-200 space-y-4">
          <h3 className="font-bold text-gray-800">New Reminder</h3>
          <input
            type="text"
            placeholder="Reminder title (e.g., Morning Medicine)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg focus:outline-none focus:border-primary-500"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500"
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-500 mb-1 block">Time</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-500 mb-1 block">Repeat</label>
              <select
                value={newRepeat}
                onChange={(e) => setNewRepeat(e.target.value as 'daily' | 'weekly' | 'once')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="once">One time</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className={`w-full py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              newTitle.trim()
                ? 'bg-primary-500 text-white active:scale-95 shadow-lg'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            <Check size={20} />
            Add Reminder
          </button>
        </div>
      )}

      <div className="px-4 space-y-3">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <button
              onClick={() => handleToggle(reminder.id, reminder.enabled)}
              className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center shrink-0"
            >
              <Bell size={24} className={reminder.enabled ? 'text-primary-500' : 'text-gray-300'} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800 text-lg">{reminder.title}</div>
              <div className="text-sm text-gray-400 mt-0.5">{reminder.description}</div>
              <div className="flex items-center gap-2 mt-2">
                <Clock size={14} className="text-gray-300" />
                <span className="text-xs text-gray-400 font-medium">{reminder.time}</span>
                <span className="text-xs text-primary-400 bg-primary-50 px-2 py-0.5 rounded-full">
                  {repeatLabels[language]?.[reminder.repeat] || reminder.repeat}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${reminder.enabled ? 'bg-success-500' : 'bg-gray-300'}`} />
              <button
                onClick={() => handleDelete(reminder.id)}
                className="p-2 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {reminders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <span className="text-5xl mb-4">🔔</span>
          <p className="text-gray-500 text-center">No reminders yet. Tap + to add one!</p>
        </div>
      )}
    </div>
  );
}
