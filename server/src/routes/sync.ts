// ============================================================
// Sync Routes — ASHA Worker Offline Sync
// ============================================================
// Prototype endpoint for syncing patient summary records.
// This is a DEMO sync endpoint — not connected to any government system.
// ============================================================

import { Router, type Request, type Response } from 'express';

const router = Router();

// In-memory store for prototype (resets on server restart)
const syncStore = new Map<string, Array<{
  id: string;
  type: string;
  timestamp: string;
  data: unknown;
  receivedAt: string;
}>>();

// ---- POST /api/sync ----
// Accept a batch of patient summary records
router.post('/', (req: Request, res: Response) => {
  try {
    const { patientId, records } = req.body;

    if (!patientId || !Array.isArray(records)) {
      res.status(400).json({
        success: false,
        error: 'patientId and records array are required',
      });
      return;
    }

    // Get or initialize patient's sync store
    const patientRecords = syncStore.get(patientId) || [];
    let syncedCount = 0;

    for (const record of records) {
      if (!record.id || !record.type || !record.timestamp) {
        continue; // Skip invalid records
      }

      // Deduplication: if record ID exists, update it (newest wins)
      const existingIdx = patientRecords.findIndex(r => r.id === record.id);
      const entry = {
        id: record.id,
        type: record.type,
        timestamp: record.timestamp,
        data: record.data,
        receivedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        patientRecords[existingIdx] = entry;
      } else {
        patientRecords.push(entry);
      }
      syncedCount++;
    }

    syncStore.set(patientId, patientRecords);

    console.log(`[Sync] Received ${syncedCount} records for patient ${patientId}`);

    res.json({
      success: true,
      syncedCount,
      totalRecords: patientRecords.length,
      message: `${syncedCount} records synced successfully`,
    });
  } catch (error) {
    console.error('[Sync] Error:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: 'Please try again later.',
    });
  }
});

// ---- GET /api/sync/status ----
// Overall sync status (must be before /:patientId route)
router.get('/status', (_req: Request, res: Response) => {
  let totalPatients = 0;
  let totalRecords = 0;

  syncStore.forEach((records) => {
    totalPatients++;
    totalRecords += records.length;
  });

  res.json({
    status: 'ok',
    totalPatients,
    totalRecords,
    mode: 'prototype',
    message: 'Prototype sync endpoint — not connected to government health systems',
  });
});

// ---- GET /api/sync/:patientId ----
// Retrieve synced records for a patient (for ASHA dashboard)
router.get('/:patientId', (req: Request, res: Response) => {
  const patientId = req.params.patientId as string;
  const records = syncStore.get(patientId) || [];

  res.json({
    patientId,
    records,
    totalRecords: records.length,
    lastSync: records.length > 0
      ? records.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())[0].receivedAt
      : null,
  });
});

export default router;
