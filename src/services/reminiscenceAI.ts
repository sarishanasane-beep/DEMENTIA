// ============================================================
// RealReminiscenceAIService
// ============================================================
// Production implementation that calls the backend AI server.
// Falls back to mock when the backend is unavailable.
// ============================================================

import { v4 as uuid } from 'uuid';
import type { Memory, MemoryActivity, Language } from '../types';
import type { ReminiscenceAIService } from './reminiscence';
import { MockReminiscenceAIService } from './reminiscence';
import * as aiClient from './aiClient';

const RETRY_INTERVAL_MS = 30_000; // Retry backend check after 30s if previously unavailable

export class RealReminiscenceAIService implements ReminiscenceAIService {
  private mockFallback = new MockReminiscenceAIService();
  private serverAvailable: boolean | null = null;
  private lastCheckTime = 0;
  private lastImageAnalysis: aiClient.ImageAnalysisResult | null = null;

  private async isServerReachable(): Promise<boolean> {
    const now = Date.now();
    // First check, or retry after RETRY_INTERVAL_MS
    if (this.serverAvailable === null || (this.serverAvailable === false && now - this.lastCheckTime > RETRY_INTERVAL_MS)) {
      this.serverAvailable = await aiClient.checkAIServer();
      this.lastCheckTime = now;
      if (this.serverAvailable) {
        console.log('[RealReminiscence] Backend is now reachable');
      }
    }
    return this.serverAvailable;
  }

  async generateActivities(memory: Memory, language: Language): Promise<MemoryActivity[]> {
    const available = await this.isServerReachable();
    if (!available) {
      console.log('[RealReminiscence] Backend unavailable, using mock fallback');
      return this.mockFallback.generateActivities(memory, language);
    }

    try {
      const response = await aiClient.generateActivities({
        patientId: memory.patientId,
        memory: {
          id: memory.id,
          type: memory.type,
          title: memory.title,
          people: memory.people,
          event: memory.event,
          location: memory.location,
          year: memory.year,
          description: memory.description,
          familyMember: memory.familyMember,
          whyImportant: memory.whyImportant,
          transcript: memory.transcript,
          transcriptSource: memory.transcriptSource,
        },
        imageAnalysis: this.lastImageAnalysis || undefined,
        preferredLanguage: language,
      });

      // Convert backend response to MemoryActivity format
      return response.activities.map(activity => ({
        id: uuid(),
        patientId: memory.patientId,
        sourceMemoryId: activity.sourceMemoryId || memory.id,
        activityType: activity.activityType as MemoryActivity['activityType'],
        question: activity.question,
        correctAnswer: activity.correctAnswer,
        options: activity.options,
        storyTemplate: activity.storyTemplate,
        storyBlanks: activity.storyBlanks,
        sequenceCards: activity.sequenceCards,
        audioLabel: memory.familyMember,
        language,
        status: 'pending_review' as const,
        generatedFromVerifiedData: true,
        createdAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[RealReminiscence] Backend call failed, falling back to mock:', (error as Error).message);
      this.serverAvailable = false;
      return this.mockFallback.generateActivities(memory, language);
    }
  }

  // ---- Analyze Image (not part of ReminiscenceAIService interface) ----
  async analyzeImage(
    imageBase64: string,
    patientId: string,
    memoryId: string,
    metadata: {
      title: string;
      people?: string[];
      event?: string;
      location?: string;
      year?: string;
      description?: string;
    }
  ): Promise<aiClient.ImageAnalysisResult> {
    const available = await this.isServerReachable();
    if (!available) {
      return {
        description: metadata.description || 'Using metadata only.',
        visiblePeopleCount: metadata.people?.length || 0,
        visibleObjects: [],
        setting: metadata.location || '',
        eventHints: metadata.event ? [metadata.event] : [],
        uncertaintyNotes: ['AI server not available. Using caregiver-provided metadata only.'],
        mode: 'mock',
        message: 'AI server not running. Using demo image analysis.',
      };
    }

    const result = await aiClient.analyzeImage({
      imageBase64,
      patientId,
      memoryId,
      metadata,
    });
    this.lastImageAnalysis = result;
    return result;
  }

  // ---- Transcribe Audio (not part of ReminiscenceAIService interface) ----
  async transcribeAudio(
    audioBase64: string,
    patientId: string,
    memoryId: string,
    language?: string,
    speaker?: string,
    title?: string,
  ): Promise<aiClient.TranscriptionResult> {
    const available = await this.isServerReachable();
    if (!available) {
      // Return mock transcription
      return {
        transcript: `This is a voice recording from ${speaker || 'a family member'}. They are sharing a memory about ${title || 'family life'}.`,
        language: language || 'en',
        mode: 'mock',
        message: 'AI server not running. Using demo transcription.',
      };
    }

    return aiClient.transcribeAudio({
      audioBase64,
      patientId,
      memoryId,
      language,
      speaker,
      title,
    });
  }
}

// ---- Factory ----


export function createRealReminiscenceService(): RealReminiscenceAIService {
  return new RealReminiscenceAIService();
}
