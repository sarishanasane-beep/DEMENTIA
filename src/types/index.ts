// ============================================================
// Data Models for SmartMind — Cognitive Wellness Assistant
// PS 26003: AI-Based Cognitive Gaming & Memory Assistance Platform
// ============================================================

export type Language = 'en' | 'as' | 'hi';
export type UserRole = 'patient' | 'caregiver' | 'asha';
export type TextSize = 'normal' | 'large' | 'xlarge';
export type AnomalyBand = 'normal' | 'monitor' | 'unusual' | 'insufficient_baseline';
export type CognitiveDomain = 'memory' | 'language' | 'orientation' | 'attention' | 'judgement' | 'extra';

// ---- Game Definition ----
export interface GameDefinition {
  id: string;
  name: string;
  domain: CognitiveDomain;
  description: string;
  type: ProbeOrAdaptive;
  estimatedDuration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  instructions: string;
  voiceSupported: boolean;
  icon: string;
  color: string;
}

export interface GameResult {
  id: string;
  gameId: string;
  gameName: string;
  patientId: string;
  domain: CognitiveDomain;
  probeOrAdaptive: ProbeOrAdaptive;
  score: number;
  duration: number;
  correctAnswers: number;
  totalQuestions: number;
  completedAt: string;
}
export type ProbeOrAdaptive = 'probe' | 'adaptive';
export type MemoryActivityType = 'who_is_this' | 'where_was_this' | 'complete_the_memory' | 'what_happened_next' | 'whose_voice_is_this';
export type MemoryProcessingStatus = 'uploaded' | 'processing' | 'generated' | 'pending_review' | 'approved' | 'edited_and_approved' | 'excluded';

export interface Patient {
  id: string;
  name: string;
  age: number;
  preferredLanguage: Language;
  caregiverId: string;
  createdAt: string;
  avatarColor: string;
}

export interface VoiceSession {
  id: string;
  patientId: string;
  timestamp: string;
  duration: number;
  transcript: string;
  // Acoustic features
  pitchMean: number;
  pitchVariance: number;
  speakingRate: number;
  averagePause: number;
  longPauseCount: number;
  repetitionCount: number;
  volumeMean: number;
  volumeVariance: number;
  speechDuration: number;
  // Scoring
  anomalyScore: number;
  status: AnomalyBand;
  // Deviation details
  deviations: FeatureDeviations;
  isDemo: boolean;
}

export interface FeatureDeviations {
  pitch: { baseline: number; current: number; zScore: number; weighted: number };
  pace: { baseline: number; current: number; zScore: number; weighted: number };
  pause: { baseline: number; current: number; zScore: number; weighted: number };
  repetition: { baseline: number; current: number; zScore: number; weighted: number };
  volume: { baseline: number; current: number; zScore: number; weighted: number };
}

export interface BaselineProfile {
  patientId: string;
  sessionsUsed: number;
  pitchMean: number;
  pitchStd: number;
  speakingRateMean: number;
  speakingRateStd: number;
  pauseMean: number;
  pauseStd: number;
  repetitionMean: number;
  repetitionStd: number;
  volumeMean: number;
  volumeStd: number;
  updatedAt: string;
}

export interface CognitiveResult {
  id: string;
  patientId: string;
  date: string;
  domain: CognitiveDomain;
  score: number;
  probeOrAdaptive: ProbeOrAdaptive;
  baselineScore: number;
  baselineDeviation: number;
  gameName: string;
  details?: string;
}

export interface CognitiveFingerprint {
  patientId: string;
  memory: { current: number; baseline: number; trend: 'stable' | 'improving' | 'declining' };
  language: { current: number; baseline: number; trend: 'stable' | 'improving' | 'declining' };
  orientation: { current: number; baseline: number; trend: 'stable' | 'improving' | 'declining' };
  attention: { current: number; baseline: number; trend: 'stable' | 'improving' | 'declining' };
  judgement: { current: number; baseline: number; trend: 'stable' | 'improving' | 'declining' };
  updatedAt: string;
}

export interface Alert {
  id: string;
  patientId: string;
  type: 'voice_anomaly' | 'cognitive_change' | 'system';
  timestamp: string;
  score: number;
  status: 'active' | 'acknowledged' | 'reviewed';
  title: string;
  message: string;
  details?: {
    deviations?: FeatureDeviations;
    domain?: CognitiveDomain;
    previousScore?: number;
    currentScore?: number;
  };
}

export interface Memory {
  id: string;
  patientId: string;
  title: string;
  description: string;
  imageUrl: string;
  mediaId?: string;
  type: 'photo' | 'video' | 'audio' | 'story';
  familyMember?: string;
  transcript?: string;
  transcriptSource?: 'ai_stt' | 'manual';
  generatedQuestion?: string;
  people?: string[];
  event?: string;
  location?: string;
  year?: string;
  whyImportant?: string;
  sensitive?: boolean;
  status: 'approved' | 'pending' | 'excluded';
  processingStatus: MemoryProcessingStatus;
  createdAt: string;
}

export interface MemoryActivity {
  id: string;
  patientId: string;
  sourceMemoryId: string;
  activityType: MemoryActivityType;
  question: string;
  correctAnswer: string;
  options?: string[];
  storyTemplate?: string;
  storyBlanks?: string[];
  sequenceCards?: string[];
  audioLabel?: string;
  language: Language;
  status: MemoryProcessingStatus;
  generatedFromVerifiedData: boolean;
  editedFields?: string[];
  createdAt: string;
}

export interface MemoryCompletion {
  id: string;
  patientId: string;
  activityId: string;
  sourceMemoryId: string;
  activityType: MemoryActivityType;
  score: number;
  patientAnswer: string;
  completedAt: string;
}

export interface Reminder {
  id: string;
  patientId: string;
  title: string;
  description: string;
  time: string;
  repeat: 'daily' | 'weekly' | 'once';
  enabled: boolean;
}

export interface LanguageTranslation {
  [key: string]: string;
}

// App state
export interface AppState {
  currentRole: UserRole;
  currentPatientId: string;
  textSize: TextSize;
  isOnline: boolean;
  pendingSyncCount: number;
  selectedLanguage: Language;
  demoMode: boolean;
}
