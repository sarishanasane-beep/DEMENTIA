// ============================================================
// OfflineStorageService — Local data persistence
// ============================================================
// Stores all patient interaction data locally.
// Core patient interaction does NOT depend on constant internet.
// ============================================================

import type {
  Patient, VoiceSession, BaselineProfile, CognitiveResult,
  CognitiveFingerprint, Alert, Memory, Reminder,
  MemoryActivity, MemoryCompletion
} from '../types';

export type { Memory };
import {
  DEMO_PATIENT, DEMO_VOICE_SESSIONS, DEMO_CURRENT_UNUSUAL,
  DEMO_BASELINE, DEMO_COGNITIVE_RESULTS, DEMO_FINGERPRINT,
  DEMO_ALERTS, DEMO_MEMORIES, DEMO_REMINDERS, DEMO_MEMORY_ACTIVITIES,
} from '../utils/demoData';
import { calculateBaselineFromSessions } from './voiceAnalysis';

const STORAGE_KEYS = {
  patient: 'smartmind_patient',
  voiceSessions: 'smartmind_voice_sessions',
  baseline: 'smartmind_baseline',
  cognitiveResults: 'smartmind_cognitive_results',
  fingerprint: 'smartmind_fingerprint',
  alerts: 'smartmind_alerts',
  memories: 'smartmind_memories',
  memoryActivities: 'smartmind_memory_activities',
  memoryCompletions: 'smartmind_memory_completions',
  reminders: 'smartmind_reminders',
  pendingSync: 'smartmind_pending_sync',
  settings: 'smartmind_settings',
  initialized: 'smartmind_initialized',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore parse errors */ }
  return fallback;
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or unavailable */ }
}

// ---- Initialize demo data if first run ----
export function initializeStorage(): void {
  const initialized = load<boolean>(STORAGE_KEYS.initialized, false);
  if (!initialized) {
    save(STORAGE_KEYS.patient, DEMO_PATIENT);
    save(STORAGE_KEYS.voiceSessions, [...DEMO_VOICE_SESSIONS, DEMO_CURRENT_UNUSUAL]);
    save(STORAGE_KEYS.baseline, DEMO_BASELINE);
    save(STORAGE_KEYS.cognitiveResults, DEMO_COGNITIVE_RESULTS);
    save(STORAGE_KEYS.fingerprint, DEMO_FINGERPRINT);
    save(STORAGE_KEYS.alerts, DEMO_ALERTS);
    save(STORAGE_KEYS.memories, DEMO_MEMORIES);
    save(STORAGE_KEYS.memoryActivities, DEMO_MEMORY_ACTIVITIES);
    save(STORAGE_KEYS.memoryCompletions, []);
    save(STORAGE_KEYS.reminders, DEMO_REMINDERS);
    save(STORAGE_KEYS.pendingSync, 0);
    save(STORAGE_KEYS.initialized, true);
  }
}

// ---- Patient ----
export function getPatient(): Patient {
  return load(STORAGE_KEYS.patient, DEMO_PATIENT);
}

export function savePatient(patient: Patient): void {
  save(STORAGE_KEYS.patient, patient);
}

// ---- Voice Sessions ----
export function getVoiceSessions(): VoiceSession[] {
  return load(STORAGE_KEYS.voiceSessions, [...DEMO_VOICE_SESSIONS, DEMO_CURRENT_UNUSUAL]);
}

export function addVoiceSession(session: VoiceSession): void {
  const sessions = getVoiceSessions();
  sessions.push(session);
  save(STORAGE_KEYS.voiceSessions, sessions);
  // Increment pending sync
  const pending = load<number>(STORAGE_KEYS.pendingSync, 0);
  save(STORAGE_KEYS.pendingSync, pending + 1);
}

export function getVoiceSessionsByStatus(status: VoiceSession['status']): VoiceSession[] {
  return getVoiceSessions().filter(s => s.status === status);
}

// ---- Baseline ----
// Returns calculated baseline from stored sessions.
// Returns DEMO_BASELINE ONLY for the demo patient (Anita Devi, P001) with seeded history.
// NEVER leaks demo baseline to other patients.
export function getBaseline(): BaselineProfile {
  const patient = getPatient();

  // First check if we have a saved baseline (from recalculation)
  const saved = load<BaselineProfile | null>(STORAGE_KEYS.baseline, null);

  // If saved baseline exists and belongs to this patient, use it
  if (saved && saved.patientId === patient.id && saved.sessionsUsed >= 3) {
    return saved;
  }

  // Try to calculate from stored sessions
  const sessions = getVoiceSessions();
  const result = calculateBaselineFromSessions(sessions, patient.id);

  if (result.baseline) {
    // Persist the calculated baseline
    save(STORAGE_KEYS.baseline, result.baseline);
    return result.baseline;
  }

  // INSUFFICIENT DATA — do NOT use demo baseline for non-demo patients.
  // Only return demo baseline for the demo patient with seeded history.
  const isDemoPatient = patient.id === DEMO_PATIENT.id;
  if (isDemoPatient) {
    return DEMO_BASELINE;
  }

  // For real patients with insufficient data, return a placeholder
  // with sessionsUsed = 0 so callers know baseline is not ready.
  return {
    patientId: patient.id,
    sessionsUsed: 0,
    pitchMean: 0,
    pitchStd: 1,
    speakingRateMean: 0,
    speakingRateStd: 1,
    pauseMean: 0,
    pauseStd: 0.05,
    repetitionMean: 0,
    repetitionStd: 0.1,
    volumeMean: 0,
    volumeStd: 0.01,
    updatedAt: new Date().toISOString(),
  };
}

// Save a recalculated baseline
export function saveBaseline(baseline: BaselineProfile): void {
  save(STORAGE_KEYS.baseline, baseline);
}

// Get baseline status (sufficient / insufficient)
export function getBaselineStatus(): { status: 'ready' | 'insufficient'; sessionsUsed: number } {
  const sessions = getVoiceSessions();
  const patient = getPatient();
  const result = calculateBaselineFromSessions(sessions, patient.id);
  return { status: result.status, sessionsUsed: result.sessionsUsed };
}

// Recalculate baseline from stored sessions and persist it.
// Called after each valid voice session is added.
// Returns null if insufficient data (no confident baseline exists).
export function recalculateBaseline(): BaselineProfile | null {
  const sessions = getVoiceSessions();
  const patient = getPatient();
  const result = calculateBaselineFromSessions(sessions, patient.id);
  if (result.baseline) {
    save(STORAGE_KEYS.baseline, result.baseline);
    return result.baseline;
  }
  // If insufficient, clear the saved baseline so it doesn't persist stale data
  localStorage.removeItem(STORAGE_KEYS.baseline);
  return null;
}

// ---- Cognitive Results ----
export function getCognitiveResults(): CognitiveResult[] {
  return load(STORAGE_KEYS.cognitiveResults, DEMO_COGNITIVE_RESULTS);
}

export function addCognitiveResult(result: CognitiveResult): void {
  const results = getCognitiveResults();
  results.push(result);
  save(STORAGE_KEYS.cognitiveResults, results);
}

// ---- Fingerprint ----
export function getFingerprint(): CognitiveFingerprint {
  return load(STORAGE_KEYS.fingerprint, DEMO_FINGERPRINT);
}

export function saveFingerprint(fp: CognitiveFingerprint): void {
  save(STORAGE_KEYS.fingerprint, fp);
}

// ---- Alerts ----
export function getAlerts(): Alert[] {
  return load(STORAGE_KEYS.alerts, DEMO_ALERTS);
}

export function addAlert(alert: Alert): void {
  const alerts = getAlerts();
  alerts.unshift(alert);
  save(STORAGE_KEYS.alerts, alerts);
}

export function updateAlert(id: string, updates: Partial<Alert>): void {
  const alerts = getAlerts();
  const idx = alerts.findIndex(a => a.id === id);
  if (idx >= 0) {
    alerts[idx] = { ...alerts[idx], ...updates };
    save(STORAGE_KEYS.alerts, alerts);
  }
}

// ---- Memories ----
export function getMemories(): Memory[] {
  return load(STORAGE_KEYS.memories, DEMO_MEMORIES);
}

// ---- Reminders ----
export function getReminders(): Reminder[] {
  return load(STORAGE_KEYS.reminders, DEMO_REMINDERS);
}

export function addReminder(reminder: Reminder): void {
  const reminders = getReminders();
  reminders.push(reminder);
  save(STORAGE_KEYS.reminders, reminders);
}

export function updateReminder(id: string, updates: Partial<Reminder>): void {
  const reminders = getReminders();
  const idx = reminders.findIndex(r => r.id === id);
  if (idx >= 0) {
    reminders[idx] = { ...reminders[idx], ...updates };
    save(STORAGE_KEYS.reminders, reminders);
  }
}

export function deleteReminder(id: string): void {
  const reminders = getReminders().filter(r => r.id !== id);
  save(STORAGE_KEYS.reminders, reminders);
}

// ---- Memories update ----
export function updateMemoryStatus(id: string, status: Memory['status']): void {
  const memories = getMemories();
  const idx = memories.findIndex(m => m.id === id);
  if (idx >= 0) {
    memories[idx] = { ...memories[idx], status };
    save(STORAGE_KEYS.memories, memories);
  }
}

export function addMemory(memory: Memory): void {
  const memories = getMemories();
  memories.unshift(memory);
  save(STORAGE_KEYS.memories, memories);
}

export function updateMemory(id: string, updates: Partial<Memory>): void {
  const memories = getMemories();
  const idx = memories.findIndex(m => m.id === id);
  if (idx >= 0) {
    memories[idx] = { ...memories[idx], ...updates };
    save(STORAGE_KEYS.memories, memories);
  }
}

export function deleteMemory(id: string): string | undefined {
  const memories = getMemories();
  const memory = memories.find(m => m.id === id);
  const mediaId = memory?.mediaId;
  const filtered = memories.filter(m => m.id !== id);
  save(STORAGE_KEYS.memories, filtered);
  // Also remove associated activities
  const activities = getMemoryActivities().filter(a => a.sourceMemoryId !== id);
  save(STORAGE_KEYS.memoryActivities, activities);
  return mediaId;
}

// ---- Memory Activities ----
export function getMemoryActivities(): MemoryActivity[] {
  return load(STORAGE_KEYS.memoryActivities, []);
}

export function addMemoryActivity(activity: MemoryActivity): void {
  const activities = getMemoryActivities();
  activities.push(activity);
  save(STORAGE_KEYS.memoryActivities, activities);
}

export function addMemoryActivities(newActivities: MemoryActivity[]): void {
  const activities = getMemoryActivities();
  activities.push(...newActivities);
  save(STORAGE_KEYS.memoryActivities, activities);
}

export function updateMemoryActivity(id: string, updates: Partial<MemoryActivity>): void {
  const activities = getMemoryActivities();
  const idx = activities.findIndex(a => a.id === id);
  if (idx >= 0) {
    activities[idx] = { ...activities[idx], ...updates };
    save(STORAGE_KEYS.memoryActivities, activities);
  }
}

export function getApprovedActivities(): MemoryActivity[] {
  return getMemoryActivities().filter(a =>
    a.status === 'approved' || a.status === 'edited_and_approved'
  );
}

export function getActivitiesForMemory(memoryId: string): MemoryActivity[] {
  return getMemoryActivities().filter(a => a.sourceMemoryId === memoryId);
}

// ---- Memory Completions ----
export function getMemoryCompletions(): MemoryCompletion[] {
  return load(STORAGE_KEYS.memoryCompletions, []);
}

export function addMemoryCompletion(completion: MemoryCompletion): void {
  const completions = getMemoryCompletions();
  completions.push(completion);
  save(STORAGE_KEYS.memoryCompletions, completions);
}

// ---- Sync Queue ----
// Individual records queued for ASHA sync
export interface SyncRecord {
  id: string;           // unique local record ID (deterministic)
  type: string;         // e.g. 'cognitive_summary', 'voice_summary', 'alert_summary'
  patientId: string;
  timestamp: string;    // when the original event happened
  queuedAt: string;     // when queued for sync
  data: unknown;        // summary payload (never raw media)
  status: 'pending' | 'synced' | 'failed';
  syncAttempts: number;
  lastSyncAttempt?: string;
}

const SYNC_QUEUE_KEY = 'smartmind_sync_queue';

export function getSyncQueue(): SyncRecord[] {
  return load(SYNC_QUEUE_KEY, []);
}

export function saveSyncQueue(queue: SyncRecord[]): void {
  save(SYNC_QUEUE_KEY, queue);
}

export function queueForSync(record: Omit<SyncRecord, 'queuedAt' | 'status' | 'syncAttempts'>): void {
  const queue = getSyncQueue();
  // Deduplication: skip if same ID already queued and not synced
  const existing = queue.find(r => r.id === record.id && r.status !== 'synced');
  if (existing) {
    // Update existing record with latest data (newest wins)
    existing.data = record.data;
    existing.timestamp = record.timestamp;
  } else {
    queue.push({
      ...record,
      queuedAt: new Date().toISOString(),
      status: 'pending',
      syncAttempts: 0,
    });
  }
  saveSyncQueue(queue);
  // Also update the simple counter for backward compatibility
  save(STORAGE_KEYS.pendingSync, queue.filter(r => r.status === 'pending').length);
}

export function markRecordSynced(id: string): void {
  const queue = getSyncQueue();
  const record = queue.find(r => r.id === id);
  if (record) {
    record.status = 'synced';
    record.lastSyncAttempt = new Date().toISOString();
  }
  saveSyncQueue(queue);
  save(STORAGE_KEYS.pendingSync, queue.filter(r => r.status === 'pending').length);
}

export function markRecordFailed(id: string): void {
  const queue = getSyncQueue();
  const record = queue.find(r => r.id === id);
  if (record) {
    record.status = 'failed';
    record.syncAttempts += 1;
    record.lastSyncAttempt = new Date().toISOString();
  }
  saveSyncQueue(queue);
  save(STORAGE_KEYS.pendingSync, queue.filter(r => r.status === 'pending').length);
}

export function getPendingRecords(): SyncRecord[] {
  return getSyncQueue().filter(r => r.status === 'pending');
}

export function getSyncQueueStatus(): { pending: number; synced: number; failed: number } {
  const queue = getSyncQueue();
  return {
    pending: queue.filter(r => r.status === 'pending').length,
    synced: queue.filter(r => r.status === 'synced').length,
    failed: queue.filter(r => r.status === 'failed').length,
  };
}

export function clearSyncedRecords(): void {
  const queue = getSyncQueue().filter(r => r.status !== 'synced');
  saveSyncQueue(queue);
}

// Legacy compatibility
export function getPendingSyncCount(): number {
  return getSyncQueue().filter(r => r.status === 'pending').length;
}

export function clearPendingSync(): void {
  const queue = getSyncQueue().map(r =>
    r.status === 'pending' ? { ...r, status: 'synced' as const } : r
  );
  saveSyncQueue(queue);
  save(STORAGE_KEYS.pendingSync, 0);
}

// ---- Settings ----
export interface UserSettings {
  textSize: 'normal' | 'large' | 'xlarge';
  voiceEnabled: boolean;
  language: string;
}

export function getSettings(): UserSettings {
  return load(STORAGE_KEYS.settings, {
    textSize: 'large',
    voiceEnabled: true,
    language: 'en',
  });
}

export function saveSettings(settings: UserSettings): void {
  save(STORAGE_KEYS.settings, settings);
}

// ---- Delete all data ----
export function deleteAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
