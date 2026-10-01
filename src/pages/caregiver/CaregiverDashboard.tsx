import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, Brain, Mic, Bell, Image, Shield, Wifi, LogOut,
  ChevronRight, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Minus, Globe
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getPatient, getVoiceSessions, getBaseline, getFingerprint, getMemories, getBaselineStatus } from '../../services/storage';
import { getLanguageServiceStatus } from '../../services/language';

const navItems = [
  { key: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { key: 'profile', icon: User, label: 'Patient Profile' },
  { key: 'cognitive', icon: Brain, label: 'Cognitive Fingerprint' },
  { key: 'voice', icon: Mic, label: 'Voice Insights' },
  { key: 'alerts', icon: Bell, label: 'Alerts' },
  { key: 'memories', icon: Image, label: 'Memories' },
  { key: 'privacy', icon: Shield, label: 'Privacy' },
  { key: 'sync', icon: Wifi, label: 'Sync' },
];

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'declining') return <TrendingDown size={16} className="text-alert-500" />;
  if (trend === 'improving') return <TrendingUp size={16} className="text-success-500" />;
  return <Minus size={16} className="text-gray-400" />;
}

function OverviewTab() {
  const patient = getPatient();
  const { voiceSessions: sessions, alerts } = useAppStore();
  const fingerprint = getFingerprint();
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const unusualSessions = sessions.filter(s => s.status === 'unusual');
  const lastSession = sessions[sessions.length - 1];

  const domains = [
    { key: 'memory', label: 'Memory', ...fingerprint.memory },
    { key: 'language', label: 'Language', ...fingerprint.language },
    { key: 'orientation', label: 'Orientation', ...fingerprint.orientation },
    { key: 'attention', label: 'Attention', ...fingerprint.attention },
    { key: 'judgement', label: 'Judgement', ...fingerprint.judgement },
  ];

  return (
    <div className="space-y-6">
      {/* Patient Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-600">
            {patient.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{patient.name}</h2>
            <p className="text-gray-400">Age {patient.age} · {patient.preferredLanguage === 'as' ? 'Assamese' : patient.preferredLanguage === 'hi' ? 'Hindi' : 'English'}</p>
            <p className="text-xs text-gray-400 mt-1">Last interaction: {lastSession ? new Date(lastSession.timestamp).toLocaleString() : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">Unusual Interactions</div>
          <div className="text-3xl font-bold text-alert-500">{unusualSessions.length}</div>
          <div className="text-xs text-gray-400 mt-1">this week</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">Active Alerts</div>
          <div className="text-3xl font-bold text-caution-500">{activeAlerts.length}</div>
          <div className="text-xs text-gray-400 mt-1">requiring review</div>
        </div>
      </div>

      {/* Cognitive Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Cognitive Fingerprint</h3>
        <div className="space-y-3">
          {domains.map(d => (
            <div key={d.key} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-24">{d.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    d.trend === 'declining' ? 'bg-caution-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${d.current}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700 w-10 text-right">{d.current}%</span>
              <TrendIcon trend={d.trend} />
            </div>
          ))}
        </div>
        {domains.some(d => d.trend === 'declining') && (
          <div className="mt-4 px-3 py-2 bg-caution-50 rounded-xl flex items-center gap-2">
            <AlertTriangle size={14} className="text-caution-500" />
            <span className="text-xs text-caution-600 font-medium">
              Noticeable change from personal baseline in some domains.
            </span>
          </div>
        )}
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3">Recent Alerts</h3>
        {activeAlerts.length === 0 ? (
          <p className="text-gray-400 text-sm">No active alerts</p>
        ) : (
          <div className="space-y-2">
            {activeAlerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="flex items-center gap-3 p-3 bg-alert-50 rounded-xl">
                <AlertTriangle size={16} className="text-alert-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800">{alert.title}</div>
                  <div className="text-xs text-gray-400 truncate">{alert.message}</div>
                </div>
                <span className="text-xs font-bold text-alert-500">{alert.score}/100</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-3 bg-gray-50 rounded-xl text-center text-xs text-gray-400">
        Prototype indicator only. Not a medical diagnosis.
      </div>
    </div>
  );
}

function ProfileTab() {
  const patient = getPatient();
  const baseline = getBaseline();
  const sessions = getVoiceSessions();

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Patient Information</h3>
        <div className="space-y-3">
          {[
            ['Name', patient.name],
            ['Age', `${patient.age}`],
            ['Language', patient.preferredLanguage === 'as' ? 'Assamese' : patient.preferredLanguage === 'hi' ? 'Hindi' : 'English'],
            ['Patient ID', patient.id],
            ['Registered', new Date(patient.createdAt).toLocaleDateString()],
            ['Total Sessions', `${sessions.length}`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-400">{label}</span>
              <span className="text-sm font-medium text-gray-700">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3">Personal Voice Baseline</h3>
        <p className="text-xs text-gray-400 mb-4">
          Established from {baseline.sessionsUsed} previous interactions.
        </p>
        <div className="space-y-2">
          {[
            ['Pitch (mean)', `${baseline.pitchMean} Hz`],
            ['Speaking rate', `${baseline.speakingRateMean} wpm`],
            ['Pause duration', `${baseline.pauseMean}s`],
            ['Repetition', `${baseline.repetitionMean}`],
            ['Volume', `${baseline.volumeMean}`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-700">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CognitiveTab() {
  // Force re-read from storage to get latest fingerprint
  const { cognitiveResults } = useAppStore();
  const fingerprint = getFingerprint();
  const domains = [
    { key: 'memory', label: 'Memory', ...fingerprint.memory },
    { key: 'language', label: 'Language', ...fingerprint.language },
    { key: 'orientation', label: 'Orientation', ...fingerprint.orientation },
    { key: 'attention', label: 'Attention', ...fingerprint.attention },
    { key: 'judgement', label: 'Judgement', ...fingerprint.judgement },
  ];

  // Get recent results for display with probe/adaptive badges
  const recentResults = [...cognitiveResults]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-1">Cognitive Fingerprint</h3>
        <p className="text-xs text-gray-400 mb-6">Compared with personal baseline</p>

        <div className="space-y-5">
          {domains.map(d => {
            const change = d.current - d.baseline;
            return (
              <div key={d.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{d.label}</span>
                    <TrendIcon trend={d.trend} />
                  </div>
                  <span className={`text-sm font-bold ${
                    d.trend === 'declining' ? 'text-alert-500' : 'text-gray-700'
                  }`}>{d.current}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      d.trend === 'declining' ? 'bg-caution-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${d.current}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>Baseline: {d.baseline}%</span>
                  <span>Change: {change >= 0 ? '+' : ''}{change}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {domains.some(d => d.trend === 'declining') && (
        <div className="bg-caution-50 rounded-2xl p-5 border border-caution-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-caution-500" />
            <span className="font-bold text-caution-700">Domain Change Detected</span>
          </div>
          <p className="text-sm text-caution-600">
            Orientation shows noticeable change from personal baseline (75% → 55%).
            Review recommended.
          </p>
          <p className="text-xs text-caution-400 mt-2 italic">
            This is an indicator, not a diagnosis.
          </p>
        </div>
      )}

      {/* Probe vs Adaptive explanation */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-2">Measurement vs Practice</h3>
        <p className="text-xs text-gray-400 mb-3">
          Fingerprint values are calculated only from <strong>Measurement (Probe)</strong> results — fixed-structure games suitable for longitudinal comparison. <strong>Practice (Adaptive)</strong> results support engagement but do not affect the fingerprint.
        </p>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary-500" />
            <span className="text-gray-500">📊 Measurement (Probe)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warm-400" />
            <span className="text-gray-500">🎮 Practice (Adaptive)</span>
          </div>
        </div>
      </div>

      {/* Game Activity History */}
      {recentResults.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">Game Activity History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-400 font-medium">Game</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Category</th>
                  <th className="text-center py-2 text-gray-400 font-medium">Type</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Score</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map(result => {
                  const isExtra = result.domain === 'extra';
                  return (
                    <tr key={result.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 text-gray-700 font-medium">{result.gameName}</td>
                      <td className="py-2">
                        <span className={`text-xs font-medium ${isExtra ? 'text-purple-600' : 'text-gray-500'} capitalize`}>
                          {isExtra ? 'Extra / Supportive' : `Core · ${result.domain}`}
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isExtra
                            ? 'bg-purple-50 text-purple-600'
                            : result.probeOrAdaptive === 'probe'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-green-50 text-green-600'
                        }`}>
                          {isExtra ? '🎮 Supportive' : result.probeOrAdaptive === 'probe' ? '📊 Measurement' : '🎮 Practice'}
                        </span>
                      </td>
                      <td className="py-2 text-right font-bold text-gray-700">
                        {isExtra ? (result.gameName === 'Mood Check-in' ? '😊' : `${result.score}%`) : `${result.score}%`}
                      </td>
                      <td className="py-2 text-right text-gray-400 text-xs">{new Date(result.date).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent cognitive results with probe/adaptive badge */}
      {recentResults.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">Recent Results</h3>
          <div className="space-y-2">
            {recentResults.map(result => (
              <div key={result.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  result.probeOrAdaptive === 'probe'
                    ? 'bg-primary-50 text-primary-600'
                    : 'bg-warm-50 text-warm-500'
                }" style={{
                  background: result.probeOrAdaptive === 'probe' ? '#EEF2FF' : '#FFF7ED',
                  color: result.probeOrAdaptive === 'probe' ? '#4F46E5' : '#F97316',
                }}>
                  {result.probeOrAdaptive === 'probe' ? '📊 Probe' : '🎮 Adaptive'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-700 capitalize">{result.domain}</span>
                  <span className="text-xs text-gray-400 ml-2">{result.gameName}</span>
                </div>
                <span className="text-sm font-bold text-gray-700">{result.score}%</span>
                <span className="text-xs text-gray-400">{new Date(result.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VoiceInsightsTab() {
  const { voiceSessions: sessions } = useAppStore();
  const reversed = [...sessions].reverse();
  const [filter, setFilter] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const filtered = filter === 'all' ? reversed : reversed.filter(s => s.status === filter);
  const active = selectedSession ? reversed.find(s => s.id === selectedSession) : null;

  if (active) {
    const d = active.deviations;
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <button onClick={() => setSelectedSession(null)} className="text-sm text-primary-500 mb-4">← Back to sessions</button>
          <h3 className="font-bold text-gray-800 mb-4">Voice Interaction Details</h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">Date</div>
              <div className="font-bold text-gray-700">{new Date(active.timestamp).toLocaleDateString()}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">Duration</div>
              <div className="font-bold text-gray-700">{active.duration}s</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">Pattern Deviation</div>
              <div className={`font-bold ${active.status === 'unusual' ? 'text-alert-500' : active.status === 'monitor' ? 'text-caution-500' : 'text-success-500'}`}>
                {active.anomalyScore} / 100
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">Status</div>
              <div className={`font-bold ${active.status === 'unusual' ? 'text-alert-500' : active.status === 'monitor' ? 'text-caution-500' : 'text-success-500'}`}>
                {active.status.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Feature comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-400 font-medium">Feature</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Baseline</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Current</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Z-Score</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['Speaking Pace', d.pace] as const,
                  ['Pause Duration', d.pause] as const,
                  ['Repetition', d.repetition] as const,
                  ['Pitch Variation', d.pitch] as const,
                  ['Volume Variation', d.volume] as const,
                ]).map(([label, data]) => (
                  <tr key={label} className="border-b border-gray-50">
                    <td className="py-2 text-gray-600">{label}</td>
                    <td className="py-2 text-right text-gray-500">{data.baseline}</td>
                    <td className="py-2 text-right font-medium text-gray-700">{data.current}</td>
                    <td className={`py-2 text-right font-bold ${Math.abs(data.zScore) > 2 ? 'text-alert-500' : 'text-gray-500'}`}>
                      {data.zScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 font-medium mb-1">Interpretation</p>
            <p className="text-sm text-gray-500">
              {active.status === 'unusual'
                ? "Today's interaction differs noticeably from the patient's usual voice-interaction pattern."
                : active.status === 'monitor'
                ? "Some variation from the usual pattern was observed."
                : "Voice pattern is within the person's usual range."}
            </p>
          </div>

          {active.status === 'unusual' && (
            <div className="mt-3 p-4 bg-caution-50 rounded-xl border border-caution-200">
              <p className="text-sm font-bold text-caution-700 mb-1">Recommended action</p>
              <p className="text-sm text-caution-600">Please check in with the patient.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const baseline = getBaseline();
  const baselineInfo = getBaselineStatus();

  return (
    <div className="space-y-4">
      {/* Personal Voice Baseline */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3">Personal Voice Baseline</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400">Sessions collected</div>
            <div className="font-bold text-gray-700">{baselineInfo.sessionsUsed} / 3 minimum</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400">Status</div>
            <div className={`font-bold ${baselineInfo.status === 'ready' ? 'text-success-500' : 'text-caution-500'}`}>
              {baselineInfo.status === 'ready' ? 'Ready' : 'Building'}
            </div>
          </div>
        </div>
        {baselineInfo.status === 'insufficient' && (
          <div className="bg-caution-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-caution-600 font-medium mb-1">Building personal baseline</p>
            <p className="text-xs text-caution-500">More voice interactions are needed before reliable pattern comparison is available. Target window: up to 10 sessions.</p>
          </div>
        )}
        <div className="space-y-1.5">
          {[
            ['Pitch', `${baseline.pitchMean} Hz`],
            ['Speaking pace', `${baseline.speakingRateMean} wpm`],
            ['Pause pattern', `${baseline.pauseMean}s avg`],
            ['Volume', `${baseline.volumeMean}`],
            ['Repetition', `${baseline.repetitionMean} avg`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1 text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-700">{value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Updated: {new Date(baseline.updatedAt).toLocaleDateString()}</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Voice Interaction Insights</h3>
        <p className="text-xs text-gray-400 mb-4">Compared with personal baseline</p>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', 'normal', 'monitor', 'unusual'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map(session => (
            <button
              key={session.id}
              onClick={() => setSelectedSession(session.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              <div className={`w-2 h-8 rounded-full ${
                session.status === 'unusual' ? 'bg-alert-500' :
                session.status === 'monitor' ? 'bg-caution-500' :
                session.status === 'insufficient_baseline' ? 'bg-gray-300' : 'bg-success-500'
              }`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {new Date(session.timestamp).toLocaleDateString()}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    session.status === 'unusual' ? 'bg-alert-50 text-alert-500' :
                    session.status === 'monitor' ? 'bg-caution-50 text-caution-500' :
                    session.status === 'insufficient_baseline' ? 'bg-gray-100 text-gray-500' : 'bg-success-50 text-success-500'
                  }`}>
                    {session.status === 'insufficient_baseline' ? 'BUILDING' : session.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs text-gray-400">Score: {session.anomalyScore}</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsTab() {
  const { alerts, acknowledgeAlert, reviewedAlert } = useAppStore();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Voice Interaction Alerts</h3>

      {alerts.filter(a => a.status === 'active').length === 0 && alerts.filter(a => a.status === 'acknowledged').length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <CheckCircle size={48} className="text-success-500 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No alerts to review</p>
        </div>
      )}

      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`bg-white rounded-2xl p-5 shadow-sm border ${
            alert.status === 'active' ? 'border-alert-200' : 'border-gray-100'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              alert.status === 'active' ? 'bg-alert-50' : 'bg-gray-100'
            }`}>
              <AlertTriangle size={20} className={alert.status === 'active' ? 'text-alert-500' : 'text-gray-400'} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-800">{alert.title}</h4>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  alert.status === 'active' ? 'bg-alert-50 text-alert-500' :
                  alert.status === 'acknowledged' ? 'bg-caution-50 text-caution-500' :
                  'bg-success-50 text-success-500'
                }`}>
                  {alert.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{alert.message}</p>

              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span>Time: {new Date(alert.timestamp).toLocaleString()}</span>
                <span>Deviation: {alert.score}/100</span>
              </div>

              {alert.status === 'active' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => reviewedAlert(alert.id)}
                    className="flex-1 py-2.5 px-4 bg-gray-100 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-200 active:scale-[0.98]"
                  >
                    Review
                  </button>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="flex-1 py-2.5 px-4 bg-primary-500 rounded-xl text-sm font-medium text-white hover:bg-primary-600 active:scale-[0.98]"
                  >
                    Acknowledge
                  </button>
                </div>
              )}

              {alert.status === 'acknowledged' && (
                <button
                  onClick={() => reviewedAlert(alert.id)}
                  className="mt-4 w-full py-2.5 px-4 bg-success-50 rounded-xl text-sm font-medium text-success-600 hover:bg-success-100"
                >
                  Mark as Reviewed
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MemoriesTab() {
  const navigate = useNavigate();
  const memories = getMemories();
  const pendingCount = memories.filter(m => m.status === 'pending').length;
  const approvedCount = memories.filter(m => m.status === 'approved').length;
  const excludedCount = memories.filter(m => m.status === 'excluded').length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-2">Family Memories</h3>
        <p className="text-xs text-gray-400 mb-4">
          Manage family memories and AI-generated reminiscence activities.
        </p>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Total', value: memories.length, color: 'text-gray-700' },
            { label: 'Pending', value: pendingCount, color: 'text-caution-500' },
            { label: 'Approved', value: approvedCount, color: 'text-success-500' },
            { label: 'Excluded', value: excludedCount, color: 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/caregiver/memories')}
          className="w-full py-3 bg-primary-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-95"
        >
          Open Family Memories →
        </button>
      </div>
    </div>
  );
}

function LanguageServiceStatus() {
  const [status, setStatus] = useState<{ configured: boolean; mode: string; message: string } | null>(null);

  useEffect(() => {
    getLanguageServiceStatus().then(setStatus);
  }, []);

  if (!status) return null;

  return (
    <div className="p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Globe size={16} className="text-primary-500" />
        <p className="font-medium text-gray-700">Language Services (Bhashini)</p>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${status.mode === 'real' ? 'bg-success-500' : 'bg-caution-500'}`} />
        <span className="text-sm text-gray-600">
          {status.mode === 'real' ? 'Bhashini Connected' : 'Demo Mode'}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">{status.message}</p>
    </div>
  );
}

function PrivacyTab() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Privacy & Consent</h3>
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-2">Microphone Usage</p>
            <p>The microphone is used only when the patient starts a voice interaction. It is never continuously active.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-2">Voice Data Processing</p>
            <p>Voice-derived features (pitch, pace, pauses) are used to identify unusual changes from the patient's personal interaction pattern.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-2">Data Storage</p>
            <p>Raw voice recordings should be deleted or securely stored according to the deployment policy. For this prototype, data is stored locally on the device.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="font-medium text-gray-700 mb-2">No Medical Claims</p>
            <p>This system provides behavioral indicators for caregiver review. It does not diagnose any medical condition.</p>
          </div>
          <LanguageServiceStatus />
        </div>
      </div>
    </div>
  );
}

function SyncTab() {
  const { isOnline, pendingSyncCount, simulateSync } = useAppStore();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await simulateSync();
    setSyncing(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Data Sync</h3>

        <div className="flex items-center gap-3 mb-6">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-success-500' : 'bg-alert-500'}`} />
          <span className="font-medium text-gray-700">{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {pendingSyncCount > 0 ? (
          <div className="bg-caution-50 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-caution-600">
              {pendingSyncCount} interactions waiting to sync
            </p>
          </div>
        ) : (
          <div className="bg-success-50 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-success-600">All data is up to date</p>
          </div>
        )}

        <button
          onClick={handleSync}
          disabled={!isOnline || syncing || pendingSyncCount === 0}
          className={`w-full py-3 rounded-xl font-bold transition-all ${
            !isOnline || syncing || pendingSyncCount === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-primary-500 text-white active:scale-[0.98] shadow-lg'
          }`}
        >
          {syncing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Syncing...
            </span>
          ) : isOnline ? 'Sync Patient Data' : 'Offline — Cannot Sync'}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3">ASHA Sync History</h3>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span>Last sync</span>
            <span className="font-medium text-gray-700">01 Sep 2026, 10:00 AM</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span>Data transferred</span>
            <span className="font-medium text-gray-700">12 voice sessions, 5 cognitive tests</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Status</span>
            <span className="font-medium text-success-500">Complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CaregiverDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { setRole, isOnline, pendingSyncCount, alerts } = useAppStore();
  const navigate = useNavigate();
  const activeAlerts = alerts.filter(a => a.status === 'active').length;

  const tabs: Record<string, () => ReactNode> = {
    overview: OverviewTab,
    profile: ProfileTab,
    cognitive: CognitiveTab,
    voice: VoiceInsightsTab,
    alerts: AlertsTab,
    memories: MemoriesTab,
    privacy: PrivacyTab,
    sync: SyncTab,
  };

  const ActiveTab = tabs[activeTab] || OverviewTab;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800">Caregiver Dashboard</h1>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              isOnline ? 'bg-success-50 text-success-500' : 'bg-caution-50 text-caution-500'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-success-500' : 'bg-caution-500'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
            {pendingSyncCount > 0 && (
              <span className="bg-caution-50 text-caution-500 text-xs font-medium px-2 py-0.5 rounded-full">
                {pendingSyncCount} pending
              </span>
            )}
          </div>
          <button
            onClick={() => { setRole('patient'); navigate('/patient'); }}
            className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-xl text-sm font-medium text-primary-600 hover:bg-primary-100"
          >
            <LogOut size={16} />
            Patient View
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto flex">
        {/* Sidebar */}
        <nav className="w-56 shrink-0 border-r border-gray-200 bg-white min-h-[calc(100vh-56px)] p-4 hidden md:block">
          <div className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.key
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <item.icon size={18} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.key === 'alerts' && activeAlerts > 0 && (
                  <span className="bg-alert-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {activeAlerts}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile tab bar */}
        <div className="flex md:hidden overflow-x-auto gap-1 p-2 bg-white border-b border-gray-200 w-full">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                activeTab === item.key
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-500'
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6">
          <ActiveTab />
        </div>
      </div>
    </div>
  );
}
