import { create } from 'zustand';
import type { UserRole, Language, TextSize, Alert, VoiceSession, CognitiveResult, CognitiveDomain, CognitiveFingerprint, MemoryActivity, MemoryCompletion } from '../types';
import * as storage from '../services/storage';
import { v4 as uuid } from 'uuid';

// ---- Fingerprint recalculation (Demo heuristic — not clinically validated) ----
// Recalculates the cognitive fingerprint from the most recent probe results per domain.
function recalculateFingerprint(results: CognitiveResult[]): CognitiveFingerprint {
  const domains: CognitiveDomain[] = ['memory', 'language', 'orientation', 'attention', 'judgement'];
  const fp: CognitiveFingerprint = {
    patientId: 'P001',
    memory: { current: 78, baseline: 80, trend: 'stable' },
    language: { current: 80, baseline: 82, trend: 'stable' },
    orientation: { current: 55, baseline: 75, trend: 'declining' },
    attention: { current: 80, baseline: 82, trend: 'stable' },
    judgement: { current: 72, baseline: 74, trend: 'stable' },
    updatedAt: new Date().toISOString(),
  };

  for (const domain of domains) {
    // Only probe results update the fingerprint.
    // Adaptive results are for engagement and do NOT contaminate measurement data.
    const domainResults = results
      .filter(r => r.domain === domain && r.probeOrAdaptive === 'probe')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // If no probe data exists for this domain, keep the seed defaults
    // (the UI will show 'Pre-seeded baseline' rather than calculated data)
    if (domainResults.length === 0) continue;

    const latest = domainResults[0];
    // Use the baseline from the earliest result as the historical baseline
    const baselineResult = domainResults[domainResults.length - 1];
    const baseline = baselineResult.baselineScore;
    const current = latest.score;
    const change = current - baseline;

    let trend: 'stable' | 'improving' | 'declining' = 'stable';
    if (change <= -15) trend = 'declining';
    else if (change >= 10) trend = 'improving';

    // Safe to cast since domains array only contains the 5 core fingerprint domains
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fp as any)[domain] = { current, baseline, trend };
  }

  return fp;
}

interface AppStore {
  // Role & navigation
  currentRole: UserRole;
  setRole: (role: UserRole) => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Text size
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;

  // Online status
  isOnline: boolean;
  setOnline: (online: boolean) => void;
  pendingSyncCount: number;
  simulateSync: () => Promise<void>;

  // Voice
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;

  // Voice sessions
  voiceSessions: VoiceSession[];
  addVoiceSession: (session: VoiceSession) => void;
  currentVoiceSession: VoiceSession | null;
  setCurrentVoiceSession: (session: VoiceSession | null) => void;
  baselineStatus: { status: 'ready' | 'insufficient'; sessionsUsed: number };
  refreshBaselineStatus: () => void;

  // Alerts
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  reviewedAlert: (id: string) => void;

  // Cognitive results
  cognitiveResults: CognitiveResult[];
  addCognitiveResult: (result: CognitiveResult) => void;

  // Memory activities
  memoryActivities: MemoryActivity[];
  addMemoryActivity: (activity: MemoryActivity) => void;
  addMemoryActivities: (activities: MemoryActivity[]) => void;
  updateMemoryActivity: (id: string, updates: Partial<MemoryActivity>) => void;

  // Memory completions
  memoryCompletions: MemoryCompletion[];
  addMemoryCompletion: (completion: MemoryCompletion) => void;

  // Demo mode
  demoMode: boolean;
  setDemoMode: (mode: boolean) => void;

  // Demo step (for voice analysis demo)
  demoStep: number;
  setDemoStep: (step: number) => void;
  demoSampleType: 'normal' | 'unusual' | null;
  setDemoSampleType: (type: 'normal' | 'unusual' | null) => void;

  // Recording state
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;

  // Toast messages
  toast: { message: string; type: 'success' | 'info' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  clearToast: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Role
  currentRole: 'patient',
  setRole: (role) => set({ currentRole: role }),

  // Language
  language: (storage.getSettings().language as Language) || 'en',
  setLanguage: (lang) => {
    storage.saveSettings({ ...storage.getSettings(), language: lang });
    set({ language: lang });
  },

  // Text size
  textSize: storage.getSettings().textSize || 'large',
  setTextSize: (size) => {
    storage.saveSettings({ ...storage.getSettings(), textSize: size });
    set({ textSize: size });
  },

  // Online
  isOnline: navigator.onLine,
  setOnline: (online) => set({ isOnline: online }),
  pendingSyncCount: storage.getPendingSyncCount(),
  simulateSync: async () => {
    // Use real sync service
    const { generateSyncRecords, syncPendingData } = await import('../services/syncService');
    generateSyncRecords();
    const result = await syncPendingData();
    set({ pendingSyncCount: storage.getPendingSyncCount() });
    if (result.success) {
      get().showToast(result.message, 'success');
    } else {
      get().showToast(result.message, 'warning');
    }
  },

  // Voice
  voiceEnabled: storage.getSettings().voiceEnabled ?? true,
  setVoiceEnabled: (enabled) => {
    storage.saveSettings({ ...storage.getSettings(), voiceEnabled: enabled });
    set({ voiceEnabled: enabled });
  },

  // Voice sessions
  voiceSessions: storage.getVoiceSessions(),
  addVoiceSession: (session) => {
    storage.addVoiceSession(session);
    set({ voiceSessions: storage.getVoiceSessions() });
    set({ pendingSyncCount: storage.getPendingSyncCount() });

    // Recalculate personal baseline from stored sessions
    // (so future sessions compare against updated history)
    storage.recalculateBaseline();

    // If unusual, create a caregiver alert
    if (session.status === 'unusual') {
      const alert: Alert = {
        id: uuid(),
        patientId: session.patientId,
        type: 'voice_anomaly',
        timestamp: session.timestamp,
        score: session.anomalyScore,
        status: 'active',
        title: 'Unusual voice interaction',
        message: "Today's voice interaction differs noticeably from the patient's usual pattern.",
        details: { deviations: session.deviations },
      };
      get().addAlert(alert);
    }
  },
  currentVoiceSession: null,
  setCurrentVoiceSession: (session) => set({ currentVoiceSession: session }),

  // Voice baseline status
  baselineStatus: storage.getBaselineStatus(),
  refreshBaselineStatus: () => set({ baselineStatus: storage.getBaselineStatus() }),

  // Alerts
  alerts: storage.getAlerts(),
  addAlert: (alert) => {
    storage.addAlert(alert);
    set({ alerts: storage.getAlerts() });
  },
  acknowledgeAlert: (id) => {
    storage.updateAlert(id, { status: 'acknowledged' });
    set({ alerts: storage.getAlerts() });
  },
  reviewedAlert: (id) => {
    storage.updateAlert(id, { status: 'reviewed' });
    set({ alerts: storage.getAlerts() });
  },

  // Memory activities
  memoryActivities: storage.getMemoryActivities(),
  addMemoryActivity: (activity) => {
    storage.addMemoryActivity(activity);
    set({ memoryActivities: storage.getMemoryActivities() });
  },
  addMemoryActivities: (activities) => {
    storage.addMemoryActivities(activities);
    set({ memoryActivities: storage.getMemoryActivities() });
  },
  updateMemoryActivity: (id, updates) => {
    storage.updateMemoryActivity(id, updates);
    set({ memoryActivities: storage.getMemoryActivities() });
  },

  // Memory completions
  memoryCompletions: storage.getMemoryCompletions(),
  addMemoryCompletion: (completion) => {
    storage.addMemoryCompletion(completion);
    set({ memoryCompletions: storage.getMemoryCompletions() });
  },

  // Cognitive
  cognitiveResults: storage.getCognitiveResults(),
  addCognitiveResult: (result) => {
    storage.addCognitiveResult(result);
    const updatedResults = storage.getCognitiveResults();
    set({ cognitiveResults: updatedResults });
    // Recalculate fingerprint from probe results
    const newFingerprint = recalculateFingerprint(updatedResults);
    storage.saveFingerprint(newFingerprint);
    // Queue for ASHA sync
    const patient = storage.getPatient();
    storage.queueForSync({
      id: `cognitive_${patient.id}_${result.domain}_${result.id}`,
      type: 'cognitive_summary',
      patientId: patient.id,
      timestamp: result.date,
      data: {
        domain: result.domain,
        latestScore: result.score,
        gameName: result.gameName,
        probeOrAdaptive: result.probeOrAdaptive,
        trend: (newFingerprint as unknown as Record<string, { trend: string }>)[result.domain]?.trend || 'stable',
      },
    });
    set({ pendingSyncCount: storage.getPendingSyncCount() });
  },

  // Demo
  demoMode: true,
  setDemoMode: (mode) => set({ demoMode: mode }),
  demoStep: 0,
  setDemoStep: (step) => set({ demoStep: step }),
  demoSampleType: null,
  setDemoSampleType: (type) => set({ demoSampleType: type }),

  // Recording
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),

  // Toast
  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },
  clearToast: () => set({ toast: null }),
}));
