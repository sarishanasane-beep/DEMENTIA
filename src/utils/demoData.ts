import { v4 as uuid } from 'uuid';
import type {
  Patient, VoiceSession, BaselineProfile, CognitiveResult,
  CognitiveFingerprint, Alert, Memory, Reminder, MemoryActivity
} from '../types';

// ============================================================
// Demo Patient
// ============================================================
export const DEMO_PATIENT: Patient = {
  id: 'P001',
  name: 'Anita Devi',
  age: 72,
  preferredLanguage: 'as',
  caregiverId: 'C001',
  createdAt: '2026-06-01T08:00:00Z',
  avatarColor: '#6366F1',
};

export const DEMO_CAREGIVER = {
  id: 'C001',
  name: 'Rahul Devi',
  relation: 'Son',
  patientId: 'P001',
};

// ============================================================
// Demo Baseline — 10 historical sessions
// ============================================================
export const DEMO_BASELINE: BaselineProfile = {
  patientId: 'P001',
  sessionsUsed: 10,
  pitchMean: 184,
  pitchStd: 12,
  speakingRateMean: 116,
  speakingRateStd: 14,
  pauseMean: 0.8,
  pauseStd: 0.25,
  repetitionMean: 0.8,
  repetitionStd: 0.5,
  volumeMean: 0.62,
  volumeStd: 0.08,
  updatedAt: '2026-08-30T10:00:00Z',
};

// ============================================================
// Demo Voice Sessions — 10 historical + 1 current unusual
// ============================================================
function makeSession(
  dateOffset: number, hour: number, minute: number,
  score: number, status: 'normal' | 'monitor' | 'unusual',
  overrides: Partial<VoiceSession> = {}
): VoiceSession {
  const d = new Date('2026-09-01T10:30:00Z');
  d.setDate(d.getDate() + dateOffset);
  d.setHours(hour, minute, 0, 0);

  const baseline = DEMO_BASELINE;
  const normalFeatures = () => ({
    pitchMean: baseline.pitchMean + (Math.random() - 0.5) * 10,
    pitchVariance: 20 + Math.random() * 8,
    speakingRate: baseline.speakingRateMean + (Math.random() - 0.5) * 16,
    averagePause: baseline.pauseMean + (Math.random() - 0.5) * 0.3,
    longPauseCount: Math.floor(Math.random() * 2),
    repetitionCount: Math.round(baseline.repetitionMean + (Math.random() - 0.5) * 1),
    volumeMean: baseline.volumeMean + (Math.random() - 0.5) * 0.06,
    volumeVariance: 0.06 + Math.random() * 0.04,
  });

  const features = normalFeatures();

  const computeDeviations = () => {
    const pZ = (features.pitchMean - baseline.pitchMean) / baseline.pitchStd;
    const sZ = (features.speakingRate - baseline.speakingRateMean) / baseline.speakingRateStd;
    const paZ = (features.averagePause - baseline.pauseMean) / baseline.pauseStd;
    const rZ = (features.repetitionCount - baseline.repetitionMean) / baseline.repetitionStd;
    const vZ = (features.volumeVariance - 0.08) / baseline.volumeStd;
    return {
      pitch: { baseline: baseline.pitchMean, current: Math.round(features.pitchMean), zScore: +pZ.toFixed(2), weighted: +Math.abs(pZ * 20).toFixed(1) },
      pace: { baseline: baseline.speakingRateMean, current: Math.round(features.speakingRate), zScore: +sZ.toFixed(2), weighted: +Math.abs(sZ * 20).toFixed(1) },
      pause: { baseline: baseline.pauseMean, current: +features.averagePause.toFixed(1), zScore: +paZ.toFixed(2), weighted: +Math.abs(paZ * 25).toFixed(1) },
      repetition: { baseline: baseline.repetitionMean, current: features.repetitionCount, zScore: +rZ.toFixed(2), weighted: +Math.abs(rZ * 25).toFixed(1) },
      volume: { baseline: baseline.volumeMean, current: +features.volumeMean.toFixed(2), zScore: +vZ.toFixed(2), weighted: +Math.abs(vZ * 10).toFixed(1) },
    };
  };

  const id = overrides.id || uuid();

  return {
    id,
    patientId: 'P001',
    timestamp: d.toISOString(),
    duration: 8 + Math.floor(Math.random() * 7),
    transcript: '',
    anomalyScore: score,
    status,
    deviations: computeDeviations(),
    isDemo: true,
    ...features,
    ...overrides,
  } as VoiceSession;
}

export const DEMO_VOICE_SESSIONS: VoiceSession[] = [
  makeSession(-9, 9, 15, 21, 'normal', { transcript: 'Please remind me about my medicine.' }),
  makeSession(-8, 10, 45, 18, 'normal', { transcript: 'I want to play a game.' }),
  makeSession(-7, 8, 30, 24, 'normal', { transcript: 'Can you tell me about today?' }),
  makeSession(-6, 11, 10, 27, 'normal', { transcript: 'Show me my family photos.' }),
  makeSession(-5, 9, 50, 20, 'normal', { transcript: 'What time is it now?' }),
  makeSession(-4, 10, 22, 29, 'normal', { transcript: 'I would like to talk to someone.' }),
  makeSession(-3, 8, 45, 22, 'normal', { transcript: 'Help me remember something.' }),
  makeSession(-2, 9, 33, 25, 'normal', { transcript: 'Let us play the word game.' }),
  makeSession(-1, 11, 5, 19, 'normal', { transcript: 'Can you read to me?' }),
  makeSession(0, 9, 22, 23, 'normal', { transcript: 'Tell me about my grandchildren.' }),
];

// Current unusual session (today)
export const DEMO_CURRENT_UNUSUAL: VoiceSession = makeSession(
  0, 10, 32, 68, 'unusual',
  {
    id: 'session-current',
    transcript: "I... I don't know... where am I... I can't remember...",
    pitchMean: 228,
    pitchVariance: 41,
    speakingRate: 78,
    averagePause: 2.1,
    longPauseCount: 4,
    repetitionCount: 3,
    volumeMean: 0.48,
    volumeVariance: 0.19,
    duration: 12,
    deviations: {
      pitch: { baseline: 184, current: 228, zScore: 3.67, weighted: 73.3 },
      pace: { baseline: 116, current: 78, zScore: -2.71, weighted: 54.3 },
      pause: { baseline: 0.8, current: 2.1, zScore: 5.2, weighted: 130 },
      repetition: { baseline: 0.8, current: 3, zScore: 4.4, weighted: 110 },
      volume: { baseline: 0.62, current: 0.48, zScore: -1.75, weighted: 17.5 },
    },
  }
);

// ============================================================
// Demo Cognitive Results
// ============================================================
export const DEMO_COGNITIVE_RESULTS: CognitiveResult[] = [
  { id: uuid(), patientId: 'P001', date: '2026-08-30', domain: 'memory', score: 78, probeOrAdaptive: 'probe', baselineScore: 80, baselineDeviation: -2, gameName: 'Object Recall' },
  { id: uuid(), patientId: 'P001', date: '2026-08-30', domain: 'language', score: 80, probeOrAdaptive: 'probe', baselineScore: 82, baselineDeviation: -2, gameName: 'Word Match' },
  { id: uuid(), patientId: 'P001', date: '2026-08-30', domain: 'orientation', score: 55, probeOrAdaptive: 'probe', baselineScore: 75, baselineDeviation: -20, gameName: 'Day & Place' },
  { id: uuid(), patientId: 'P001', date: '2026-08-30', domain: 'attention', score: 80, probeOrAdaptive: 'probe', baselineScore: 82, baselineDeviation: -2, gameName: 'Pattern Continue' },
  { id: uuid(), patientId: 'P001', date: '2026-08-30', domain: 'judgement', score: 72, probeOrAdaptive: 'probe', baselineScore: 74, baselineDeviation: -2, gameName: 'Judgement Check' },
  { id: uuid(), patientId: 'P001', date: '2026-08-30', domain: 'judgement', score: 75, probeOrAdaptive: 'adaptive', baselineScore: 74, baselineDeviation: 1, gameName: 'Safety Story' },
  // Historical
  { id: uuid(), patientId: 'P001', date: '2026-08-15', domain: 'memory', score: 80, probeOrAdaptive: 'probe', baselineScore: 80, baselineDeviation: 0, gameName: 'Object Recall' },
  { id: uuid(), patientId: 'P001', date: '2026-08-15', domain: 'orientation', score: 75, probeOrAdaptive: 'probe', baselineScore: 75, baselineDeviation: 0, gameName: 'Day & Place' },
  { id: uuid(), patientId: 'P001', date: '2026-08-01', domain: 'memory', score: 79, probeOrAdaptive: 'probe', baselineScore: 80, baselineDeviation: -1, gameName: 'Object Recall' },
  { id: uuid(), patientId: 'P001', date: '2026-08-01', domain: 'orientation', score: 73, probeOrAdaptive: 'probe', baselineScore: 75, baselineDeviation: -2, gameName: 'Day & Place' },
];

// ============================================================
// Demo Cognitive Fingerprint
// ============================================================
export const DEMO_FINGERPRINT: CognitiveFingerprint = {
  patientId: 'P001',
  memory: { current: 78, baseline: 80, trend: 'stable' },
  language: { current: 80, baseline: 82, trend: 'stable' },
  orientation: { current: 55, baseline: 75, trend: 'declining' },
  attention: { current: 80, baseline: 82, trend: 'stable' },
  judgement: { current: 72, baseline: 74, trend: 'stable' },
  updatedAt: '2026-09-01T10:00:00Z',
};

// ============================================================
// Demo Alerts
// ============================================================
export const DEMO_ALERTS: Alert[] = [
  {
    id: uuid(),
    patientId: 'P001',
    type: 'voice_anomaly',
    timestamp: '2026-09-01T10:32:00Z',
    score: 68,
    status: 'active',
    title: 'Unusual voice interaction',
    message: "Today's voice interaction differs noticeably from the patient's usual pattern.",
  },
  {
    id: uuid(),
    patientId: 'P001',
    type: 'cognitive_change',
    timestamp: '2026-08-30T14:00:00Z',
    score: 20,
    status: 'acknowledged',
    title: 'Orientation score change',
    message: "Orientation score shows noticeable change from personal baseline.",
    details: { domain: 'orientation', previousScore: 75, currentScore: 55 },
  },
];

// ============================================================
// Demo Memories
// ============================================================
export const DEMO_MEMORY_IDS = {
  wedding: 'mem-wedding-001',
  bihu: 'mem-bihu-001',
  marketStory: 'mem-market-001',
  voiceNote: 'mem-voice-001',
  teaGarden: 'mem-tea-001',
  painfulEvent: 'mem-painful-001',
};

export const DEMO_MEMORIES: Memory[] = [
  {
    id: DEMO_MEMORY_IDS.wedding,
    patientId: 'P001',
    title: 'Family Wedding',
    description: 'Anita Devi at her daughter Priti\'s wedding in Guwahati, 2019. A beautiful traditional Assamese wedding ceremony.',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop',
    type: 'photo',
    familyMember: 'Daughter',
    people: ['Priti', 'Anita Devi', 'Rahul'],
    event: 'Wedding ceremony',
    location: 'Guwahati',
    year: '2019',
    whyImportant: 'Daughter Priti\'s wedding — a cherished family celebration',
    sensitive: false,
    status: 'approved',
    processingStatus: 'approved',
    createdAt: '2026-06-15T10:00:00Z',
  },
  {
    id: DEMO_MEMORY_IDS.bihu,
    patientId: 'P001',
    title: 'Rongali Bihu Celebration',
    description: 'Celebrating Rongali Bihu with family in Jorhat. Traditional dance, feasting, and family gatherings.',
    imageUrl: 'https://images.unsplash.com/photo-1604948501466-4e9c3bb172f8?w=400&h=300&fit=crop',
    type: 'photo',
    people: ['Anita Devi', 'Family members'],
    event: 'Rongali Bihu festival',
    location: 'Jorhat',
    year: '2020',
    whyImportant: 'Annual Bihu celebration with extended family',
    sensitive: false,
    status: 'approved',
    processingStatus: 'approved',
    createdAt: '2026-06-20T10:00:00Z',
  },
  {
    id: DEMO_MEMORY_IDS.marketStory,
    patientId: 'P001',
    title: 'Sunday Market Visit',
    description: 'Every Sunday, Anita Devi and her husband Hariram would walk to the local market in Jorhat. They would buy fresh vegetables, fruits, and sometimes special sweets for the grandchildren. Hariram always bought fresh fish from the fisherman\'s stall near the river.',
    imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=300&fit=crop',
    type: 'story',
    familyMember: 'Husband Hariram',
    people: ['Anita Devi', 'Hariram'],
    event: 'Weekly market visit',
    location: 'Jorhat local market',
    whyImportant: 'A cherished weekly ritual with her husband',
    sensitive: false,
    status: 'approved',
    processingStatus: 'approved',
    createdAt: '2026-07-10T10:00:00Z',
  },
  {
    id: DEMO_MEMORY_IDS.voiceNote,
    patientId: 'P001',
    title: 'Daughter Priti\'s Voice Note',
    description: 'A short voice message from daughter Priti, saying she will visit next month and bringing the grandchildren.',
    imageUrl: '',
    type: 'audio',
    familyMember: 'Priti (Daughter)',
    transcript: 'Hello Ma! I am coming to visit you next month. I will bring the grandchildren with me. We are all so excited to see you. I remember how you used to make pitha for us every winter. Those were such wonderful days. I love you very much.',
    transcriptSource: 'ai_stt',
    people: ['Priti'],
    event: 'Voice message',
    whyImportant: 'Priti\'s warm voice — a reminder of her daughter\'s love',
    sensitive: false,
    status: 'approved',
    processingStatus: 'approved',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: DEMO_MEMORY_IDS.teaGarden,
    patientId: 'P001',
    title: 'Tea Garden Morning Walk',
    description: 'Morning walk through the tea gardens near home.',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
    type: 'photo',
    event: 'Morning walk',
    location: 'Tea gardens near Jorhat',
    whyImportant: 'Daily morning walks through the tea gardens',
    sensitive: false,
    status: 'pending',
    processingStatus: 'pending_review',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: DEMO_MEMORY_IDS.painfulEvent,
    patientId: 'P001',
    title: 'Hospital Visit Memory',
    description: 'A difficult memory from a hospital visit. Family gathered to support each other during a challenging time.',
    imageUrl: '',
    type: 'story',
    people: ['Anita Devi', 'Hariram', 'Priti'],
    event: 'Hospital visit',
    location: 'Guwahati hospital',
    year: '2022',
    whyImportant: 'A painful family event — not suitable for regular reminiscence',
    sensitive: true,
    status: 'excluded',
    processingStatus: 'excluded',
    createdAt: '2026-07-15T10:00:00Z',
  },
];

// ============================================================
// Demo Reminders
// ============================================================
export const DEMO_REMINDERS: Reminder[] = [
  { id: uuid(), patientId: 'P001', title: 'Morning Medicine', description: 'Take morning medicine with breakfast', time: '08:00', repeat: 'daily', enabled: true },
  { id: uuid(), patientId: 'P001', title: 'Evening Walk', description: 'Go for a short walk in the garden', time: '17:00', repeat: 'daily', enabled: true },
  { id: uuid(), patientId: 'P001', title: 'Phone Call', description: 'Rahul will call at 7 PM', time: '19:00', repeat: 'daily', enabled: true },
  { id: uuid(), patientId: 'P001', title: 'Doctor Appointment', description: 'Monthly checkup with Dr. Sharma', time: '10:00', repeat: 'once', enabled: true },
];

// ============================================================
// Demo voice session for "normal" sample
// ============================================================
export const DEMO_NORMAL_VOICE: VoiceSession = makeSession(
  0, 9, 0, 24, 'normal',
  {
    id: 'session-demo-normal',
    transcript: 'Please remind me about my medicine.',
    pitchMean: 182,
    pitchVariance: 22,
    speakingRate: 118,
    averagePause: 0.7,
    longPauseCount: 0,
    repetitionCount: 1,
    volumeMean: 0.64,
    volumeVariance: 0.07,
    duration: 8,
    deviations: {
      pitch: { baseline: 184, current: 182, zScore: -0.17, weighted: 3.3 },
      pace: { baseline: 116, current: 118, zScore: 0.14, weighted: 2.9 },
      pause: { baseline: 0.8, current: 0.7, zScore: -0.4, weighted: 10.0 },
      repetition: { baseline: 0.8, current: 1, zScore: 0.4, weighted: 10.0 },
      volume: { baseline: 0.62, current: 0.64, zScore: 0.25, weighted: 2.5 },
    },
  }
);

export const DEMO_UNUSUAL_VOICE: VoiceSession = makeSession(
  0, 10, 30, 68, 'unusual',
  {
    id: 'session-demo-unusual',
    transcript: "I... I don't know... where am I... I can't remember...",
    pitchMean: 228,
    pitchVariance: 41,
    speakingRate: 78,
    averagePause: 2.1,
    longPauseCount: 4,
    repetitionCount: 3,
    volumeMean: 0.48,
    volumeVariance: 0.19,
    duration: 12,
    deviations: {
      pitch: { baseline: 184, current: 228, zScore: 3.67, weighted: 73.3 },
      pace: { baseline: 116, current: 78, zScore: -2.71, weighted: 54.3 },
      pause: { baseline: 0.8, current: 2.1, zScore: 5.2, weighted: 130 },
      repetition: { baseline: 0.8, current: 3, zScore: 4.4, weighted: 110 },
      volume: { baseline: 0.62, current: 0.48, zScore: -1.75, weighted: 17.5 },
    },
  }
);

// ============================================================
// Demo Memory Activities
// ============================================================
export const DEMO_MEMORY_ACTIVITIES: MemoryActivity[] = [
  // --- Wedding Photo Activities ---
  {
    id: 'act-wedding-who-001',
    patientId: 'P001',
    sourceMemoryId: DEMO_MEMORY_IDS.wedding,
    activityType: 'who_is_this',
    question: 'Who is the bride in this wedding photo?',
    correctAnswer: 'Priti',
    options: ['Priti', 'Anita Devi', 'A family friend', 'I am not sure'],
    language: 'en',
    status: 'approved',
    generatedFromVerifiedData: true,
    createdAt: '2026-06-16T10:00:00Z',
  },
  {
    id: 'act-wedding-where-001',
    patientId: 'P001',
    sourceMemoryId: DEMO_MEMORY_IDS.wedding,
    activityType: 'where_was_this',
    question: 'Where was this wedding ceremony held?',
    correctAnswer: 'Guwahati',
    options: ['Guwahati', 'Jorhat', 'Tezpur', 'Dibrugarh'],
    language: 'en',
    status: 'approved',
    generatedFromVerifiedData: true,
    createdAt: '2026-06-16T10:00:00Z',
  },
  // --- Bihu Festival Activity ---
  {
    id: 'act-bihu-who-001',
    patientId: 'P001',
    sourceMemoryId: DEMO_MEMORY_IDS.bihu,
    activityType: 'who_is_this',
    question: 'In this 2020 Rongali Bihu festival in Jorhat, who is celebrating?',
    correctAnswer: 'Anita Devi and family',
    options: ['Anita Devi and family', 'Strangers', 'A neighbours family', 'I am not sure'],
    language: 'en',
    status: 'approved',
    generatedFromVerifiedData: true,
    createdAt: '2026-06-21T10:00:00Z',
  },
  // --- Market Story Activity ---
  {
    id: 'act-market-complete-001',
    patientId: 'P001',
    sourceMemoryId: DEMO_MEMORY_IDS.marketStory,
    activityType: 'complete_the_memory',
    question: 'Complete this memory:',
    correctAnswer: 'fresh fish',
    storyTemplate: 'Every Sunday, Anita Devi and Hariram went to the market. Hariram always bought ______ from the fisherman\'s stall.',
    storyBlanks: ['fresh fish'],
    options: ['fresh fish', 'fresh flowers', 'new clothes', 'books'],
    language: 'en',
    status: 'approved',
    generatedFromVerifiedData: true,
    createdAt: '2026-07-11T10:00:00Z',
  },
  {
    id: 'act-market-sequence-001',
    patientId: 'P001',
    sourceMemoryId: DEMO_MEMORY_IDS.marketStory,
    activityType: 'what_happened_next',
    question: 'Put these events in the right order:',
    correctAnswer: 'Walk to market → Buy vegetables → Hariram buys fish → Buy sweets for grandchildren',
    sequenceCards: [
      'Walk to market together',
      'Buy fresh vegetables and fruits',
      'Hariram buys fish from the fisherman',
      'Buy sweets for the grandchildren',
    ],
    language: 'en',
    status: 'approved',
    generatedFromVerifiedData: true,
    createdAt: '2026-07-11T10:00:00Z',
  },
  // --- Voice Note Activity ---
  {
    id: 'act-voice-who-001',
    patientId: 'P001',
    sourceMemoryId: DEMO_MEMORY_IDS.voiceNote,
    activityType: 'whose_voice_is_this',
    question: 'Whose voice is this?',
    correctAnswer: 'Priti',
    options: ['Priti', 'Rahul', 'A friend', 'I am not sure'],
    audioLabel: 'Priti (Daughter)',
    language: 'en',
    status: 'approved',
    generatedFromVerifiedData: true,
    createdAt: '2026-08-02T10:00:00Z',
  },
];
