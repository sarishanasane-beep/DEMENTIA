// ============================================================
// Sync Service — ASHA Worker Offline Sync
// ============================================================
// Queues patient summary records locally when offline,
// syncs to backend when connectivity returns.
// ============================================================

import type { CognitiveResult } from '../types';
import {
  getPatient, getCognitiveResults, getVoiceSessions, getFingerprint,
  getAlerts, getPendingRecords,
  queueForSync, markRecordSynced, markRecordFailed,
  getSyncQueueStatus,
} from './storage';

const API_BASE = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:3001';

// ---- Generate sync records from current patient data ----

export function generateSyncRecords(): void {
  const patient = getPatient();
  const results = getCognitiveResults();
  const sessions = getVoiceSessions();
  const fingerprint = getFingerprint();
  const alerts = getAlerts();

  // Queue cognitive summary (latest results per domain)
  const domainResults = new Map<string, CognitiveResult[]>();
  results.forEach(r => {
    const existing = domainResults.get(r.domain) || [];
    existing.push(r);
    domainResults.set(r.domain, existing);
  });

  domainResults.forEach((domainResults, domain) => {
    const latest = domainResults.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    const recentCount = domainResults.filter(r => {
      const d = new Date(r.date);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    }).length;

    const fpDomain = fingerprint[domain as keyof typeof fingerprint];
    const trend = typeof fpDomain === 'object' && fpDomain && 'trend' in fpDomain ? fpDomain.trend : 'stable';
    queueForSync({
      id: `cognitive_${patient.id}_${domain}`,
      type: 'cognitive_summary',
      patientId: patient.id,
      timestamp: latest.date,
      data: {
        domain,
        latestScore: latest.score,
        gameName: latest.gameName,
        probeOrAdaptive: latest.probeOrAdaptive,
        baselineScore: latest.baselineScore,
        deviation: latest.baselineDeviation,
        recentGames: recentCount,
        trend,
      },
    });
  });

  // Queue voice summary
  const recentSessions = sessions
    .filter(s => !s.isDemo)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  if (recentSessions.length > 0) {
    const unusualCount = recentSessions.filter(s => s.status === 'unusual').length;
    const monitorCount = recentSessions.filter(s => s.status === 'monitor').length;
    const baselineStatus = fingerprint ? 'active' : 'insufficient';

    queueForSync({
      id: `voice_${patient.id}`,
      type: 'voice_summary',
      patientId: patient.id,
      timestamp: recentSessions[0].timestamp,
      data: {
        totalSessions: recentSessions.length,
        unusualCount,
        monitorCount,
        baselineStatus,
        latestStatus: recentSessions[0].status,
        latestScore: recentSessions[0].anomalyScore,
      },
    });
  }

  // Queue active alerts
  const activeAlerts = alerts.filter(a => a.status === 'active');
  activeAlerts.forEach(alert => {
    queueForSync({
      id: `alert_${alert.id}`,
      type: 'alert_summary',
      patientId: patient.id,
      timestamp: alert.timestamp,
      data: {
        alertType: alert.type,
        title: alert.title,
        message: alert.message,
        score: alert.score,
      },
    });
  });
}

// ---- Sync with backend ----

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  message: string;
}

export async function syncPendingData(): Promise<SyncResult> {
  const pending = getPendingRecords();

  if (pending.length === 0) {
    return { success: true, syncedCount: 0, failedCount: 0, message: 'No pending records to sync' };
  }

  const patient = getPatient();

  try {
    const response = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient.id,
        records: pending.map(r => ({
          id: r.id,
          type: r.type,
          timestamp: r.timestamp,
          data: r.data,
        })),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Sync request failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      // Mark all sent records as synced
      pending.forEach(r => markRecordSynced(r.id));
      return {
        success: true,
        syncedCount: result.syncedCount || pending.length,
        failedCount: 0,
        message: `${result.syncedCount || pending.length} records synced successfully`,
      };
    } else {
      throw new Error(result.message || 'Sync failed on server');
    }
  } catch (error) {
    // Mark all as failed (will retry later)
    pending.forEach(r => markRecordFailed(r.id));
    return {
      success: false,
      syncedCount: 0,
      failedCount: pending.length,
      message: `Sync failed: ${(error as Error).message}. Will retry.`,
    };
  }
}

// ---- Auto-sync when online ----

let autoSyncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(isOnline: boolean): void {
  stopAutoSync();
  if (isOnline) {
    // Try to sync pending records every 30 seconds when online
    autoSyncInterval = setInterval(() => {
      const pending = getPendingRecords();
      if (pending.length > 0) {
        syncPendingData().catch(() => { /* retry next interval */ });
      }
    }, 30000);
  }
}

export function stopAutoSync(): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}

// ---- ASHA Summary Generation ----

export interface ASHASummary {
  patient: {
    id: string;
    name: string;
    age: number;
  };
  lastSync: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  cognitiveSummary: {
    domain: string;
    status: 'stable' | 'watch' | 'review';
    score: number;
    trend: string;
  }[];
  voiceSummary: {
    totalSessions: number;
    unusualCount: number;
    monitorCount: number;
    latestStatus: string;
  } | null;
  alerts: {
    type: string;
    title: string;
    message: string;
  }[];
  recommendation: string;
}

export function generateASHASummary(): ASHASummary {
  const patient = getPatient();
  const results = getCognitiveResults();
  const sessions = getVoiceSessions();
  const fingerprint = getFingerprint();
  const alerts = getAlerts();
  const queueStatus = getSyncQueueStatus();

  // Cognitive domain summaries
  const domains = ['memory', 'language', 'orientation', 'attention', 'judgement'] as const;
  const cognitiveSummary = domains.map(domain => {
    const fp = fingerprint[domain];
    const domainResults = results.filter(r => r.domain === domain && r.probeOrAdaptive === 'probe');
    const latest = domainResults.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];

    let status: 'stable' | 'watch' | 'review' = 'stable';
    if (fp?.trend === 'declining') {
      if (fp.current < 50) status = 'review';
      else status = 'watch';
    }

    return {
      domain: domain.charAt(0).toUpperCase() + domain.slice(1),
      status,
      score: latest?.score || fp?.current || 0,
      trend: fp?.trend || 'stable',
    };
  });

  // Voice summary
  const recentSessions = sessions
    .filter(s => !s.isDemo)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  let voiceSummary = null;
  if (recentSessions.length > 0) {
    voiceSummary = {
      totalSessions: recentSessions.length,
      unusualCount: recentSessions.filter(s => s.status === 'unusual').length,
      monitorCount: recentSessions.filter(s => s.status === 'monitor').length,
      latestStatus: recentSessions[0].status,
    };
  }

  // Active alerts
  const activeAlerts = alerts
    .filter(a => a.status === 'active')
    .slice(0, 5)
    .map(a => ({
      type: a.type,
      title: a.title,
      message: a.message,
    }));

  // Generate recommendation
  const watchDomains = cognitiveSummary.filter(d => d.status === 'watch');
  const reviewDomains = cognitiveSummary.filter(d => d.status === 'review');
  const hasUnusualVoice = voiceSummary && voiceSummary.unusualCount > 0;

  let recommendation = 'No action needed at this time.';
  if (reviewDomains.length > 0 || hasUnusualVoice) {
    recommendation = 'Review recommended. Please check in with the patient soon.';
  } else if (watchDomains.length > 0) {
    recommendation = 'Some changes noted. Monitor during next visit.';
  }

  // Determine overall sync status
  let syncStatus: 'synced' | 'pending' | 'failed' = 'synced';
  if (queueStatus.failed > 0) syncStatus = 'failed';
  else if (queueStatus.pending > 0) syncStatus = 'pending';

  return {
    patient: {
      id: patient.id,
      name: patient.name,
      age: patient.age,
    },
    lastSync: new Date().toISOString(),
    syncStatus,
    cognitiveSummary,
    voiceSummary,
    alerts: activeAlerts,
    recommendation,
  };
}
