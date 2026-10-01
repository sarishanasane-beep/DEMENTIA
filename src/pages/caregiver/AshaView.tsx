// ============================================================
// ASHA Worker Dashboard
// ============================================================
// Community Health Worker view — plain-language patient summary.
// Syncs offline patient data when connectivity returns.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, CheckCircle, AlertTriangle,
  Wifi, WifiOff, Clock, TrendingDown, TrendingUp, Minus,
  Brain, Mic, Bell,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  generateSyncRecords, syncPendingData, generateASHASummary,
  startAutoSync, type ASHASummary,
} from '../../services/syncService';
import { getSyncQueueStatus } from '../../services/storage';

type SyncState = 'idle' | 'generating' | 'syncing' | 'complete' | 'error';

export default function AshaView() {
  const navigate = useNavigate();
  const { setRole, isOnline, pendingSyncCount } = useAppStore();
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [summary, setSummary] = useState<ASHASummary | null>(null);
  const [queueStatus, setQueueStatus] = useState({ pending: 0, synced: 0, failed: 0 });

  // Generate summary on mount and when data changes
  useEffect(() => {
    setSummary(generateASHASummary());
    setQueueStatus(getSyncQueueStatus());
  }, [pendingSyncCount]);

  // Start auto-sync when online
  useEffect(() => {
    startAutoSync(isOnline);
  }, [isOnline]);

  // Sync handler
  const handleSync = useCallback(async () => {
    if (!isOnline || syncState !== 'idle') return;

    try {
      // Step 1: Generate sync records from current data
      setSyncState('generating');
      setSyncMessage('Preparing data...');
      generateSyncRecords();
      setQueueStatus(getSyncQueueStatus());
      await new Promise(r => setTimeout(r, 500));

      // Step 2: Sync with backend
      setSyncState('syncing');
      setSyncMessage('Syncing with health server...');
      const result = await syncPendingData();

      if (result.success) {
        setSyncState('complete');
        setSyncMessage(result.message);
        setSummary(generateASHASummary());
        setQueueStatus(getSyncQueueStatus());
        setTimeout(() => setSyncState('idle'), 3000);
      } else {
        setSyncState('error');
        setSyncMessage(result.message);
        setTimeout(() => setSyncState('idle'), 5000);
      }
    } catch (error) {
      setSyncState('error');
      setSyncMessage('Sync failed. Will retry later.');
      setTimeout(() => setSyncState('idle'), 5000);
    }
  }, [isOnline, syncState]);

  if (!summary) return null;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'review': return <AlertTriangle size={14} className="text-red-500" />;
      case 'watch': return <Clock size={14} className="text-amber-500" />;
      default: return <CheckCircle size={14} className="text-green-500" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'review': return 'text-red-600 bg-red-50';
      case 'watch': return 'text-amber-600 bg-amber-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const trendIcon = (trend: string) => {
    switch (trend) {
      case 'declining': return <TrendingDown size={14} className="text-red-500" />;
      case 'improving': return <TrendingUp size={14} className="text-green-500" />;
      default: return <Minus size={14} className="text-gray-400" />;
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-gray-50 page-enter">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-4 bg-white border-b border-gray-200">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">ASHA Worker View</h1>
          <p className="text-xs text-gray-400">Prototype — Community Health Summary</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          isOnline ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
        }`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">

        {/* Patient Profile */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600">
              {summary.patient.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-800 text-lg">{summary.patient.name}</h2>
              <p className="text-sm text-gray-400">Age {summary.patient.age} · Demo Patient</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              summary.syncStatus === 'synced' ? 'bg-green-50 text-green-600' :
              summary.syncStatus === 'pending' ? 'bg-amber-50 text-amber-600' :
              'bg-red-50 text-red-600'
            }`}>
              {summary.syncStatus === 'synced' ? '✓ Synced' :
               summary.syncStatus === 'pending' ? '⏳ Pending' :
               '⚠ Failed'}
            </div>
          </div>
        </div>

        {/* Sync Status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Brain size={16} className="text-blue-500" />
              Sync Status
            </h3>
            <span className="text-xs text-gray-400">
              {formatTime(summary.lastSync)}
            </span>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-600">{queueStatus.synced} synced</span>
            </div>
            {queueStatus.pending > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-600">{queueStatus.pending} pending</span>
              </div>
            )}
            {queueStatus.failed > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-600">{queueStatus.failed} failed</span>
              </div>
            )}
          </div>
        </div>

        {/* Cognitive Domain Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Brain size={16} className="text-purple-500" />
            Cognitive Summary
          </h3>
          <div className="space-y-2">
            {summary.cognitiveSummary.map(d => (
              <div key={d.domain} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  {statusIcon(d.status)}
                  <span className="text-gray-700 font-medium">{d.domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(d.status)}`}>
                    {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">{d.score}%</span>
                  {trendIcon(d.trend)}
                </div>
              </div>
            ))}
          </div>
          {/* Trend summary */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Recent trend:{' '}
              {summary.cognitiveSummary.filter(d => d.trend === 'declining').length > 0
                ? summary.cognitiveSummary
                    .filter(d => d.trend === 'declining')
                    .map(d => `${d.domain} ↓`)
                    .join(', ')
                : 'No changes detected'}
            </p>
          </div>
        </div>

        {/* Voice Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Mic size={16} className="text-green-500" />
            Voice Interactions
          </h3>
          {summary.voiceSummary ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Recent sessions</span>
                <span className="font-medium text-gray-800">{summary.voiceSummary.totalSessions}</span>
              </div>
              {summary.voiceSummary.unusualCount > 0 ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <span className="text-sm text-amber-700 font-medium">
                    {summary.voiceSummary.unusualCount} unusual pattern{summary.voiceSummary.unusualCount > 1 ? 's' : ''} noted — review recommended
                  </span>
                </div>
              ) : summary.voiceSummary.monitorCount > 0 ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                  <Clock size={16} className="text-blue-500" />
                  <span className="text-sm text-blue-700 font-medium">
                    {summary.voiceSummary.monitorCount} session{summary.voiceSummary.monitorCount > 1 ? 's' : ''} with minor variation — monitor
                  </span>
                </div>
              ) : (
                <p className="text-sm text-green-600">No unusual patterns in recent sessions</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No voice interaction data yet</p>
          )}
        </div>

        {/* Active Alerts */}
        {summary.alerts.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Bell size={16} className="text-red-500" />
              Active Alerts
            </h3>
            <div className="space-y-2">
              {summary.alerts.map((alert, i) => (
                <div key={i} className="p-3 bg-red-50 rounded-xl">
                  <p className="text-sm font-medium text-red-700">{alert.title}</p>
                  <p className="text-xs text-red-500 mt-1">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation */}
        <div className={`rounded-2xl p-5 border ${
          summary.recommendation.includes('Review')
            ? 'bg-amber-50 border-amber-200'
            : summary.recommendation.includes('Monitor')
            ? 'bg-blue-50 border-blue-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <h3 className={`font-bold mb-1 ${
            summary.recommendation.includes('Review') ? 'text-amber-700' :
            summary.recommendation.includes('Monitor') ? 'text-blue-700' :
            'text-green-700'
          }`}>
            Recommended Action
          </h3>
          <p className={`text-sm ${
            summary.recommendation.includes('Review') ? 'text-amber-600' :
            summary.recommendation.includes('Monitor') ? 'text-blue-600' :
            'text-green-600'
          }`}>
            {summary.recommendation}
          </p>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={!isOnline || syncState !== 'idle'}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
            syncState !== 'idle' || !isOnline
              ? 'bg-gray-200 text-gray-400'
              : 'bg-blue-500 text-white active:scale-[0.98] shadow-lg'
          }`}
        >
          {syncState === 'idle' && (
            <>
              <Wifi size={20} />
              Sync Patient Data
            </>
          )}
          {syncState === 'generating' && (
            <>
              <RefreshCw size={20} className="animate-spin" />
              {syncMessage}
            </>
          )}
          {syncState === 'syncing' && (
            <>
              <RefreshCw size={20} className="animate-spin" />
              {syncMessage}
            </>
          )}
          {syncState === 'complete' && (
            <>
              <CheckCircle size={20} />
              {syncMessage}
            </>
          )}
          {syncState === 'error' && (
            <>
              <AlertTriangle size={20} />
              {syncMessage}
            </>
          )}
        </button>

        {!isOnline && (
          <div className="bg-amber-50 rounded-xl p-3 text-center text-sm text-amber-600 font-medium">
            Offline — data will sync when connection is restored
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { setRole('patient'); navigate('/patient'); }}
            className="flex-1 py-3 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-600"
          >
            Patient View
          </button>
          <button
            onClick={() => { setRole('caregiver'); navigate('/caregiver'); }}
            className="flex-1 py-3 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-600"
          >
            Caregiver View
          </button>
        </div>

        {/* Prototype label */}
        <p className="text-center text-xs text-gray-300 mt-2">
          Prototype Sync — Not connected to government health systems
        </p>
      </div>
    </div>
  );
}
