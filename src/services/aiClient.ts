// ============================================================
// AI Client — Frontend Service Layer
// ============================================================
// Communicates with the backend AI server.
// NEVER contains API keys — those live only on the backend.
// Supports mock/real switching based on backend status.
// ============================================================

const API_BASE = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:3001';

// ---- Types ----
export interface AIStatus {
  configured: boolean;
  provider: string;
  model: string;
  mode: 'mock' | 'real';
  message: string;
}

export interface ImageAnalysisResult {
  description: string;
  visiblePeopleCount: number;
  visibleObjects: string[];
  setting: string;
  eventHints: string[];
  uncertaintyNotes: string[];
  mode: 'mock' | 'real' | 'error';
  message: string;
}

export interface GeneratedActivity {
  activityType: string;
  question: string;
  correctAnswer: string;
  options: string[];
  storyTemplate?: string;
  storyBlanks?: string[];
  sequenceCards?: string[];
  explanation: string;
  sourceMemoryId: string;
}

export interface GenerateResponse {
  activities: GeneratedActivity[];
  mode: 'mock' | 'real';
  message: string;
}

// ---- Health Check ----
export async function checkAIServer(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---- AI Status ----
export async function getAIStatus(): Promise<AIStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/ai/status`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error('Failed to fetch AI status');
    return await res.json();
  } catch {
    return {
      configured: false,
      provider: 'none',
      model: 'unknown',
      mode: 'mock',
      message: 'AI server is not running. Using local demo AI.',
    };
  }
}

// ---- Generate Activities ----
export async function generateActivities(params: {
  patientId: string;
  memory: {
    id: string;
    type: string;
    title: string;
    people?: string[];
    event?: string;
    location?: string;
    year?: string;
    description?: string;
    familyMember?: string;
    whyImportant?: string;
    transcript?: string;
    transcriptSource?: string;
  };
  imageAnalysis?: {
    description: string;
    visibleObjects: string[];
    setting: string;
    eventHints: string[];
  };
  preferredLanguage: string;
}): Promise<GenerateResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/reminiscence/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error('Generate request failed');
    return await res.json();
  } catch (error) {
    console.error('[AI Client] Generate failed:', (error as Error).message);
    throw error;
  }
}

// ---- Analyze Image ----
export async function analyzeImage(params: {
  imageBase64: string;
  patientId: string;
  memoryId: string;
  metadata: {
    title: string;
    people?: string[];
    event?: string;
    location?: string;
    year?: string;
    description?: string;
  };
}): Promise<ImageAnalysisResult> {
  try {
    const res = await fetch(`${API_BASE}/api/reminiscence/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(30000), // 30s for image analysis
    });

    if (!res.ok) throw new Error('Image analysis request failed');
    return await res.json();
  } catch (error) {
    console.error('[AI Client] Image analysis failed:', (error as Error).message);
    // Return safe fallback — memory is preserved
    return {
      description: 'Image analysis was not available.',
      visiblePeopleCount: 0,
      visibleObjects: [],
      setting: '',
      eventHints: [],
      uncertaintyNotes: ['Could not connect to AI server.'],
      mode: 'error',
      message: 'Image analysis unavailable. You can still create activities from the information you entered.',
    };
  }
}

// ---- Transcription Result ----
export interface TranscriptionResult {
  transcript: string;
  language: string;
  mode: 'mock' | 'real' | 'error';
  message: string;
}

// ---- Transcribe Audio ----
export async function transcribeAudio(params: {
  audioBase64: string;
  patientId: string;
  memoryId: string;
  language?: string;
  speaker?: string;
  title?: string;
}): Promise<TranscriptionResult> {
  try {
    const res = await fetch(`${API_BASE}/api/reminiscence/transcribe-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(30000), // 30s for transcription
    });

    if (!res.ok) throw new Error('Transcription request failed');
    return await res.json();
  } catch (error) {
    console.error('[AI Client] Transcription failed:', (error as Error).message);
    return {
      transcript: '',
      language: params.language || 'en',
      mode: 'error',
      message: 'Transcription unavailable. You can enter the transcript manually.',
    };
  }
}
