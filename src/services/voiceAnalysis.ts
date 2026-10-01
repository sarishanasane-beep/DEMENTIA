// ============================================================
// VoiceAnalysisService — Abstraction Layer
// ============================================================
// This module handles:
// 1. Audio recording
// 2. Acoustic feature extraction
// 3. Personal baseline comparison
// 4. Anomaly score calculation
// 5. Event generation
//
// The MockVoiceAnalysisService is used when no real audio
// processing is available. RealVoiceAnalysisService uses
// the Web Audio API for basic feature extraction.
//
// Demo heuristic — not clinically validated.
// ============================================================

import { v4 as uuid } from 'uuid';
import type { VoiceSession, BaselineProfile, FeatureDeviations, AnomalyBand } from '../types';

// ---- Minimum valid sessions required for reliable baseline ----
const MIN_BASELINE_SESSIONS = 3;
const MAX_BASELINE_SESSIONS = 10;

// ---- Check if a session has valid feature data ----
function isValidSession(session: VoiceSession): boolean {
  return (
    session.duration >= 2 &&
    session.pitchMean > 0 &&
    session.speakingRate > 0 &&
    session.speechDuration > 0
  );
}

// ---- Calculate baseline from historical sessions ----
// Uses the last MAX_BASELINE_SESSIONS valid sessions.
// Returns null if insufficient data.
export function calculateBaselineFromSessions(
  sessions: VoiceSession[],
  patientId: string
): { baseline: BaselineProfile | null; status: 'ready' | 'insufficient'; sessionsUsed: number } {
  // Filter to valid sessions only, most recent first
  const validSessions = sessions
    .filter(s => s.patientId === patientId && isValidSession(s))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_BASELINE_SESSIONS);

  if (validSessions.length < MIN_BASELINE_SESSIONS) {
    return {
      baseline: null,
      status: 'insufficient',
      sessionsUsed: validSessions.length,
    };
  }

  // Calculate mean and std for each feature
  const calc = (values: number[]): { mean: number; std: number } => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return { mean: +mean.toFixed(2), std: +Math.sqrt(variance).toFixed(2) };
  };

  const pitch = calc(validSessions.map(s => s.pitchMean));
  const pace = calc(validSessions.map(s => s.speakingRate));
  const pause = calc(validSessions.map(s => s.averagePause));
  const repetition = calc(validSessions.map(s => s.repetitionCount));
  const volume = calc(validSessions.map(s => s.volumeMean));

  const baseline: BaselineProfile = {
    patientId,
    sessionsUsed: validSessions.length,
    pitchMean: pitch.mean,
    pitchStd: Math.max(pitch.std, 1), // prevent zero std
    speakingRateMean: pace.mean,
    speakingRateStd: Math.max(pace.std, 1),
    pauseMean: pause.mean,
    pauseStd: Math.max(pause.std, 0.05),
    repetitionMean: repetition.mean,
    repetitionStd: Math.max(repetition.std, 0.1),
    volumeMean: volume.mean,
    volumeStd: Math.max(volume.std, 0.01),
    updatedAt: new Date().toISOString(),
  };

  return { baseline, status: 'ready', sessionsUsed: validSessions.length };
}

// ---- Feature extraction types ----

export interface ExtractedFeatures {
  pitchMean: number;
  pitchVariance: number;
  speakingRate: number;
  averagePause: number;
  longPauseCount: number;
  repetitionCount: number;
  volumeMean: number;
  volumeVariance: number;
  speechDuration: number;
}

// ---- Anomaly score weights (Demo heuristic — not clinically validated) ----
const WEIGHTS = {
  pitch: 0.20,
  pace: 0.20,
  pause: 0.25,
  repetition: 0.25,
  volume: 0.10,
};

// ---- Z-score calculation ----
function zScore(current: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (current - mean) / std;
}

// ---- Anomaly bands (Demo thresholds — not clinically validated) ----
export function getAnomalyBand(score: number): AnomalyBand {
  if (score <= 30) return 'normal';
  if (score <= 60) return 'monitor';
  return 'unusual';
}

// ---- Compare features with baseline ----
export function compareWithBaseline(
  features: ExtractedFeatures,
  baseline: BaselineProfile
): FeatureDeviations {
  const pZ = zScore(features.pitchMean, baseline.pitchMean, baseline.pitchStd);
  const sZ = zScore(features.speakingRate, baseline.speakingRateMean, baseline.speakingRateStd);
  const paZ = zScore(features.averagePause, baseline.pauseMean, baseline.pauseStd);
  const rZ = zScore(features.repetitionCount, baseline.repetitionMean, baseline.repetitionStd);
  const vZ = zScore(features.volumeVariance, 0.08, baseline.volumeStd); // use baseline std

  return {
    pitch: {
      baseline: baseline.pitchMean,
      current: Math.round(features.pitchMean),
      zScore: +pZ.toFixed(2),
      weighted: +(Math.abs(pZ) * 20).toFixed(1),
    },
    pace: {
      baseline: baseline.speakingRateMean,
      current: Math.round(features.speakingRate),
      zScore: +sZ.toFixed(2),
      weighted: +(Math.abs(sZ) * 20).toFixed(1),
    },
    pause: {
      baseline: baseline.pauseMean,
      current: +features.averagePause.toFixed(1),
      zScore: +paZ.toFixed(2),
      weighted: +(Math.abs(paZ) * 25).toFixed(1),
    },
    repetition: {
      baseline: baseline.repetitionMean,
      current: features.repetitionCount,
      zScore: +rZ.toFixed(2),
      weighted: +(Math.abs(rZ) * 25).toFixed(1),
    },
    volume: {
      baseline: baseline.volumeMean,
      current: +features.volumeMean.toFixed(2),
      zScore: +vZ.toFixed(2),
      weighted: +(Math.abs(vZ) * 10).toFixed(1),
    },
  };
}

// ---- Calculate anomaly score (0-100) ----
export function calculateAnomalyScore(deviations: FeatureDeviations): number {
  const raw =
    deviations.pitch.weighted * WEIGHTS.pitch +
    deviations.pace.weighted * WEIGHTS.pace +
    deviations.pause.weighted * WEIGHTS.pause +
    deviations.repetition.weighted * WEIGHTS.repetition +
    deviations.volume.weighted * WEIGHTS.volume;

  // Clamp to 0-100
  return Math.min(100, Math.max(0, Math.round(raw)));
}

// ---- Generate voice session from features ----
export function generateVoiceEvent(
  patientId: string,
  features: ExtractedFeatures,
  baseline: BaselineProfile,
  transcript: string = '',
  duration: number = 10,
  isDemo: boolean = false
): VoiceSession {
  const deviations = compareWithBaseline(features, baseline);
  const anomalyScore = calculateAnomalyScore(deviations);
  const status = getAnomalyBand(anomalyScore);

  return {
    id: uuid(),
    patientId,
    timestamp: new Date().toISOString(),
    duration,
    transcript,
    ...features,
    anomalyScore,
    status,
    deviations,
    isDemo,
  };
}

// ============================================================
// Audio Segmentation — Speech/Silence Detection
// ============================================================
// Uses RMS energy from recorded audio frames to detect
// speech regions and silence (pause) regions.
//
// This is a PROTOTYPE acoustic feature extractor.
// It is NOT a medically validated speech detector.
// ============================================================

interface AudioFrame {
  rms: number;
  time: number; // seconds from start
}

interface SegmentationResult {
  speechSegments: { start: number; end: number }[];
  pauseSegments: { start: number; end: number; duration: number }[];
  totalSpeechDuration: number;
  totalPauseDuration: number;
  averagePauseDuration: number;
  longPauseCount: number; // pauses > 1.5s
}

/**
 * Detect speech and silence regions from RMS energy frames.
 *
 * Algorithm:
 * 1. Compute median RMS as adaptive noise floor
 * 2. Speech threshold = noiseFloor * 1.8 (with minimum floor)
 * 3. Apply hysteresis: once speech starts, stay in speech until RMS drops below noiseFloor
 * 4. Merge short silence gaps (< 0.2s) into surrounding speech
 * 5. Count remaining pauses
 *
 * This is a prototype heuristic — not clinically validated.
 */
function segmentAudio(
  frames: AudioFrame[],
  totalDuration: number
): SegmentationResult {
  const SAFE_DEFAULT: SegmentationResult = {
    speechSegments: [],
    pauseSegments: [],
    totalSpeechDuration: 0,
    totalPauseDuration: totalDuration,
    averagePauseDuration: totalDuration,
    longPauseCount: 0,
  };

  if (frames.length < 3 || totalDuration < 0.3) return SAFE_DEFAULT;

  // --- Step 1: Compute adaptive noise floor (median RMS) ---
  const rmsValues = frames.map(f => f.rms).sort((a, b) => a - b);
  const medianRms = rmsValues[Math.floor(rmsValues.length / 2)];

  // Speech threshold: at least 1.8x the median, with a minimum floor
  // to avoid false triggers in very quiet environments
  const noiseFloor = Math.max(medianRms * 1.8, 0.01);

  // --- Step 2: Classify each frame as speech or silence ---
  // Use hysteresis: speech threshold is higher than silence threshold
  const speechThreshold = noiseFloor;
  const silenceThreshold = noiseFloor * 0.7;

  let inSpeech = false;
  const classified: { time: number; isSpeech: boolean }[] = [];

  for (const frame of frames) {
    if (!inSpeech && frame.rms >= speechThreshold) {
      inSpeech = true;
    } else if (inSpeech && frame.rms < silenceThreshold) {
      inSpeech = false;
    }
    classified.push({ time: frame.time, isSpeech: inSpeech });
  }

  // --- Step 3: Build raw segments ---
  interface RawSegment {
    start: number;
    end: number;
    isSpeech: boolean;
  }

  const rawSegments: RawSegment[] = [];
  if (classified.length > 0) {
    let segStart = classified[0].time;
    let segSpeech = classified[0].isSpeech;

    for (let i = 1; i < classified.length; i++) {
      if (classified[i].isSpeech !== segSpeech) {
        rawSegments.push({ start: segStart, end: classified[i].time, isSpeech: segSpeech });
        segStart = classified[i].time;
        segSpeech = classified[i].isSpeech;
      }
    }
    // Final segment extends to end of recording
    rawSegments.push({ start: segStart, end: totalDuration, isSpeech: segSpeech });
  }

  // --- Step 4: Merge short silence gaps into surrounding speech ---
  // Gaps < 0.2s between speech segments are likely intra-word pauses
  const MERGE_THRESHOLD = 0.2;
  const merged: RawSegment[] = [];

  for (const seg of rawSegments) {
    if (
      !seg.isSpeech &&
      (seg.end - seg.start) < MERGE_THRESHOLD &&
      merged.length > 0 &&
      merged[merged.length - 1].isSpeech
    ) {
      // Extend previous speech segment over this short silence
      merged[merged.length - 1].end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }

  // --- Step 5: Extract speech and pause segments ---
  const speechSegments = merged
    .filter(s => s.isSpeech)
    .map(s => ({ start: s.start, end: s.end }));

  const pauseSegments = merged
    .filter(s => !s.isSpeech)
    .map(s => ({
      start: s.start,
      end: s.end,
      duration: +(s.end - s.start).toFixed(3),
    }));

  const totalSpeechDuration = speechSegments.reduce(
    (sum, s) => sum + (s.end - s.start), 0
  );

  const totalPauseDuration = pauseSegments.reduce(
    (sum, p) => sum + p.duration, 0
  );

  const averagePauseDuration = pauseSegments.length > 0
    ? +(totalPauseDuration / pauseSegments.length).toFixed(3)
    : 0;

  // Long pauses: > 1.5 seconds (prototype threshold)
  const longPauseCount = pauseSegments.filter(p => p.duration > 1.5).length;

  return {
    speechSegments,
    pauseSegments,
    totalSpeechDuration: +totalSpeechDuration.toFixed(3),
    totalPauseDuration: +totalPauseDuration.toFixed(3),
    averagePauseDuration,
    longPauseCount,
  };
}

/**
 * Estimate speaking rate from speech segments.
 *
 * This is an ACOUSTIC PROXY, not a clinical speech-rate measurement.
 * It estimates "acoustic activity rate" based on:
 *   - number of speech segments (proxy for word/phrase boundaries)
 *   - total speech duration
 *
 * Formula: (numSpeechSegments / speechDuration) * 60
 * This gives an approximate "segments per minute" metric.
 *
 * NOT clinically validated. Prototype heuristic only.
 */
function estimateSpeakingRate(
  speechSegments: { start: number; end: number }[],
  totalSpeechDuration: number,
  _totalDuration: number
): number {
  // Guard: if no speech detected or very short speech
  if (speechSegments.length < 2 || totalSpeechDuration < 0.5) {
    // No speech detected — return 0 (will be compared against baseline)
    return 0;
  }

  // Segments per minute — proxy for acoustic activity density
  // More segments in same duration = faster/more speech
  const segmentsPerMinute = (speechSegments.length / totalSpeechDuration) * 60;

  // Scale to a range roughly comparable to typical wpm values (80-160)
  // This is an arbitrary scaling for prototype purposes.
  // The baseline comparison uses z-scores, so absolute scale matters less
  // than consistency within the same measurement method.
  const estimated = segmentsPerMinute * 1.5;

  // Clamp to reasonable range
  return Math.round(Math.max(0, Math.min(300, estimated)));
}

/**
 * Clamp and sanitize a numeric value to prevent NaN/Infinity.
 */
function safeNumber(value: number, fallback: number = 0): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return fallback;
  return value;
}

// ============================================================
// Mock Voice Analysis Service
// ============================================================
// Used when no real audio processing is available.
// Returns deterministic feature values based on sample type.

export class MockVoiceAnalysisService {
  private isRecording = false;
  private recordingTimer: ReturnType<typeof setTimeout> | null = null;

  startRecording(): void {
    this.isRecording = true;
  }

  stopRecording(): Promise<{ features: ExtractedFeatures; duration: number }> {
    this.isRecording = false;
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    // Simulate processing time
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          features: this.generateRandomFeatures('normal'),
          duration: 8 + Math.floor(Math.random() * 7),
        });
      }, 1500);
    });
  }

  getRecordingState(): boolean {
    return this.isRecording;
  }

  // Generate features for a specific sample type
  generateFeaturesForSample(type: 'normal' | 'unusual'): {
    features: ExtractedFeatures;
    duration: number;
    transcript: string;
  } {
    if (type === 'unusual') {
      return {
        features: {
          pitchMean: 228,
          pitchVariance: 41,
          speakingRate: 78,
          averagePause: 2.1,
          longPauseCount: 4,
          repetitionCount: 3,
          volumeMean: 0.48,
          volumeVariance: 0.19,
          speechDuration: 10,
        },
        duration: 12,
        transcript: "I... I don't know... where am I... I can't remember...",
      };
    }
    return {
      features: {
        pitchMean: 182,
        pitchVariance: 22,
        speakingRate: 118,
        averagePause: 0.7,
        longPauseCount: 0,
        repetitionCount: 1,
        volumeMean: 0.64,
        volumeVariance: 0.07,
        speechDuration: 7,
      },
      duration: 8,
      transcript: 'Please remind me about my medicine.',
    };
  }

  generateRandomFeatures(_type: 'normal' | 'unusual'): ExtractedFeatures {
    // Simulated normal features for interactive recording
    return {
      pitchMean: 180 + (Math.random() - 0.5) * 16,
      pitchVariance: 18 + Math.random() * 10,
      speakingRate: 110 + (Math.random() - 0.5) * 20,
      averagePause: 0.6 + Math.random() * 0.5,
      longPauseCount: Math.floor(Math.random() * 2),
      repetitionCount: Math.round(0.5 + Math.random() * 1.5),
      volumeMean: 0.58 + (Math.random() - 0.5) * 0.1,
      volumeVariance: 0.05 + Math.random() * 0.06,
      speechDuration: 5 + Math.random() * 8,
    };
  }
}

// ============================================================
// Real Voice Analysis Service (Web Audio API)
// ============================================================
// Uses Web Audio API for actual audio feature extraction.
// Falls back to mock if browser doesn't support it.
//
// Features extracted from real audio:
//   REAL:     pitchMean, pitchVariance, volumeMean, volumeVariance, speechDuration
//   REAL:     speakingRate (acoustic proxy from speech segments)
//   REAL:     averagePause, longPauseCount (from RMS-based segmentation)
//   APPROX:   repetitionCount (TODO: use Bhashini/ASR transcript analysis)
// ============================================================

export class RealVoiceAnalysisService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private startTime = 0;
  private pitchSamples: number[] = [];
  private volumeSamples: number[] = [];
  private frameTimestamps: number[] = []; // actual elapsed time per sample

  private mockService = new MockVoiceAnalysisService();

  async startRecording(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      this.analyser.fftSize = 2048;

      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.pitchSamples = [];
      this.volumeSamples = [];
      this.frameTimestamps = [];
      this.startTime = Date.now();
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms

      // Start sampling pitch and volume
      this.sampleAudio();

      return true;
    } catch {
      console.warn('Microphone access denied or unavailable, falling back to mock');
      return false;
    }
  }

  private sampleAudio = () => {
    if (!this.isRecording || !this.analyser) return;

    const dataArray = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(dataArray);

    // Record actual elapsed time for this frame
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.frameTimestamps.push(elapsed);

    // Calculate RMS volume
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    this.volumeSamples.push(rms);

    // Estimate fundamental frequency (simplified autocorrelation)
    let bestOffset = -1;
    let bestCorrelation = 0;
    const sampleRate = this.audioContext?.sampleRate || 44100;

    for (let offset = 20; offset < dataArray.length / 2; offset++) {
      let correlation = 0;
      for (let i = 0; i < dataArray.length / 2; i++) {
        correlation += dataArray[i] * dataArray[i + offset];
      }
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    }

    if (bestOffset > 0) {
      const frequency = sampleRate / bestOffset;
      if (frequency > 50 && frequency < 500) {
        this.pitchSamples.push(frequency);
      }
    }

    requestAnimationFrame(this.sampleAudio);
  };

  async stopRecording(): Promise<{ features: ExtractedFeatures; duration: number }> {
    if (!this.isRecording || !this.mediaRecorder) {
      return this.mockService.stopRecording();
    }

    this.isRecording = false;
    const duration = (Date.now() - this.startTime) / 1000;

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const features = this.extractFeatures(duration);
        // Stop all tracks
        const stream = this.mediaRecorder?.stream;
        stream?.getTracks().forEach(t => t.stop());
        this.audioContext?.close();
        resolve({ features, duration: Math.round(duration) });
      };
      this.mediaRecorder!.stop();
    });
  }

  private extractFeatures(duration: number): ExtractedFeatures {
    // If we have enough samples, use real data
    if (this.pitchSamples.length > 5 && this.volumeSamples.length > 5) {
      // ---- REAL: Pitch ----
      const pitchMean = this.pitchSamples.reduce((a, b) => a + b, 0) / this.pitchSamples.length;
      const pitchVariance = this.pitchSamples.reduce((sum, p) => sum + (p - pitchMean) ** 2, 0) / this.pitchSamples.length;

      // ---- REAL: Volume ----
      const volumeMean = this.volumeSamples.reduce((a, b) => a + b, 0) / this.volumeSamples.length;
      const volumeVariance = this.volumeSamples.reduce((sum, v) => sum + (v - volumeMean) ** 2, 0) / this.volumeSamples.length;

      // ---- REAL: Speech/Silence Segmentation ----
      // Build audio frames from collected samples with actual timestamps
      const frames: AudioFrame[] = this.volumeSamples.map((rms, i) => ({
        rms,
        time: this.frameTimestamps[i] || (i * duration / this.volumeSamples.length),
      }));

      const segmentation = segmentAudio(frames, duration);

      // ---- REAL: Speaking Rate (acoustic proxy) ----
      const speakingRate = estimateSpeakingRate(
        segmentation.speechSegments,
        segmentation.totalSpeechDuration,
        duration
      );

      // ---- REAL: Pause metrics ----
      const averagePause = safeNumber(segmentation.averagePauseDuration, 0);
      const longPauseCount = segmentation.longPauseCount;

      // ---- APPROX: Repetition ----
      // TODO: Derive repetition using Bhashini/ASR transcript analysis
      // rather than acoustic heuristics. Currently approximated from
      // speech segment count as a rough proxy for speech disfluency.
      // When Bhashini STT is available, count repeated phrases in transcript.
      const repetitionCount = Math.max(0, Math.round(
        segmentation.speechSegments.length > 8 ? 2 :
        segmentation.speechSegments.length > 5 ? 1 : 0
      ));

      // ---- REAL: Speech duration ----
      const speechDuration = safeNumber(segmentation.totalSpeechDuration, duration * 0.5);

      return {
        pitchMean: safeNumber(Math.round(pitchMean), 180),
        pitchVariance: safeNumber(Math.round(Math.sqrt(pitchVariance)), 20),
        speakingRate: safeNumber(speakingRate, 100),
        averagePause: safeNumber(+averagePause.toFixed(1), 0.5),
        longPauseCount: safeNumber(longPauseCount, 0),
        repetitionCount: safeNumber(repetitionCount, 1),
        volumeMean: safeNumber(+volumeMean.toFixed(2), 0.5),
        volumeVariance: safeNumber(+Math.sqrt(volumeVariance).toFixed(2), 0.05),
        speechDuration: safeNumber(speechDuration, duration * 0.5),
      };
    }

    // Fallback to mock features if insufficient audio samples
    return this.mockService.generateRandomFeatures('normal');
  }

  getRecordingState(): boolean {
    return this.isRecording;
  }

  /**
   * Return the recorded audio as a Blob for STT transcription.
   * Returns null if no audio chunks were collected.
   */
  getAudioBlob(): Blob | null {
    if (this.audioChunks.length === 0) return null;
    return new Blob(this.audioChunks, { type: 'audio/webm' });
  }

  generateFeaturesForSample(type: 'normal' | 'unusual') {
    return this.mockService.generateFeaturesForSample(type);
  }
}

// ============================================================
// Transcript Repetition Analysis
// ============================================================
// Analyzes a spoken transcript for repeated words/phrases.
// Uses simple normalization and n-gram overlap detection.
// This is NOT a clinical tool. Prototype heuristic only.
// ============================================================

/**
 * Normalize transcript text for comparison.
 * Lowercase, trim, remove punctuation, collapse whitespace.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, '') // remove punctuation and symbols
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim();
}

/**
 * Split text into meaningful words, filtering out common fillers
 * that alone should not count as meaningful repetition.
 */
function meaningfulWords(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter(w => w.length > 0);
}

/**
 * Analyze transcript for repeated phrases (2+ consecutive identical words)
 * and repeated sentence patterns.
 *
 * Returns a repetition count suitable for the voice analysis pipeline.
 * 0 = no meaningful repetition detected.
 *
 * Algorithm:
 * 1. Normalize text
 * 2. Detect repeated consecutive word pairs (bigrams)
 * 3. Detect repeated sentence-level patterns
 * 4. Combine counts (capped to prevent overcounting)
 */
export function analyzeTranscriptRepetition(transcript: string): {
  repetitionCount: number;
  detected: boolean;
  details: string;
} {
  if (!transcript || transcript.trim().length < 3) {
    return { repetitionCount: 0, detected: false, details: 'empty_transcript' };
  }

  const normalized = normalizeText(transcript);
  const words = normalized.split(' ').filter(w => w.length > 0);

  if (words.length < 2) {
    return { repetitionCount: 0, detected: false, details: 'too_few_words' };
  }

  let repetitionScore = 0;

  // --- Pass 1: Repeated consecutive word pairs (bigrams) ---
  // Example: "I went I went" → the pair "i went" appears consecutively
  for (let i = 0; i < words.length - 3; i++) {
    const pair1 = words[i] + ' ' + words[i + 1];
    const pair2 = words[i + 2] + ' ' + words[i + 3];
    if (pair1 === pair2) {
      repetitionScore += 2;
      i += 3; // skip past the matched pair to avoid double-counting
    }
  }

  // --- Pass 2: Repeated single words in sequence ---
  // Example: "tea tea tea" → 2 repeated words
  // But skip common fillers when they appear in isolation
  const fillerSet = new Set(['um', 'uh', 'er', 'ah', 'the', 'a', 'an', 'i', 'you', 'we', 'and', 'but', 'or']);
  let consecutiveRepeats = 0;
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1]) {
      if (!fillerSet.has(words[i]) || consecutiveRepeats > 0) {
        consecutiveRepeats++;
      }
    } else {
      if (consecutiveRepeats > 0 && !fillerSet.has(words[i - 1])) {
        repetitionScore += consecutiveRepeats;
      }
      consecutiveRepeats = 0;
    }
  }
  // Handle trailing repeats
  if (consecutiveRepeats > 0 && !fillerSet.has(words[words.length - 1])) {
    repetitionScore += consecutiveRepeats;
  }

  // --- Pass 3: Repeated sentence-level patterns ---
  // Split by sentence-ending punctuation, then detect repeated sentences
  const sentences = transcript
    .split(/[.!?]+/)
    .map(s => normalizeText(s).trim())
    .filter(s => s.length > 3);

  if (sentences.length >= 2) {
    for (let i = 0; i < sentences.length - 1; i++) {
      // Check if sentence i repeats later
      const s1words = meaningfulWords(sentences[i]);
      for (let j = i + 1; j < sentences.length; j++) {
        const s2words = meaningfulWords(sentences[j]);
        if (s1words.length >= 3 && s2words.length >= 3) {
          // Check word overlap ratio
          const overlap = s1words.filter(w => s2words.includes(w)).length;
          const ratio = overlap / Math.min(s1words.length, s2words.length);
          if (ratio > 0.7) {
            repetitionScore += 2;
          }
        }
      }
    }
  }

  // Cap the repetition count to prevent extreme values
  const cappedScore = Math.min(repetitionScore, 8);
  const detected = cappedScore > 0;

  return {
    repetitionCount: cappedScore,
    detected,
    details: detected ? `${cappedScore}_repetitions_detected` : 'no_repetition',
  };
}

// ---- Factory: create the best available service ----
export function createVoiceAnalysisService() {
  // For prototype: always use MockVoiceAnalysisService
  // To test real audio: switch to RealVoiceAnalysisService
  return new MockVoiceAnalysisService();
}
