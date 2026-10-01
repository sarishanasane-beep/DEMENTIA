import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { t } from '../../utils/translations';
import { createVoiceAnalysisService } from '../../services/voiceAnalysis';
import { getBaseline } from '../../services/storage';
import { generateVoiceEvent, analyzeTranscriptRepetition } from '../../services/voiceAnalysis';
import PrivacyNote from '../../components/shared/PrivacyNote';

const API_BASE = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:3001';

type VoiceState = 'idle' | 'recording' | 'processing' | 'thankyou';

export default function VoiceInteraction() {
  const navigate = useNavigate();
  const { language, addVoiceSession, setCurrentVoiceSession } = useAppStore();
  const [state, setState] = useState<VoiceState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>(new Array(20).fill(4));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serviceRef = useRef(createVoiceAnalysisService());

  // Waveform animation during recording
  const startWaveAnimation = useCallback(() => {
    waveRef.current = setInterval(() => {
      setWaveHeights(prev => prev.map(() => 4 + Math.random() * 20));
    }, 100);
  }, []);

  const stopWaveAnimation = useCallback(() => {
    if (waveRef.current) clearInterval(waveRef.current);
    setWaveHeights(new Array(20).fill(4));
  }, []);

  const startRecording = useCallback(async () => {
    setState('recording');
    setElapsed(0);

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    startWaveAnimation();

    // Start voice analysis recording
    serviceRef.current.startRecording();
  }, [startWaveAnimation]);

  const stopRecording = useCallback(async () => {
    setState('processing');
    if (timerRef.current) clearInterval(timerRef.current);
    stopWaveAnimation();

    try {
      // Get features from the recording
      const { features, duration } = await serviceRef.current.stopRecording();

      // --- STT: Get transcript for repetition analysis ---
      let transcript = `[Voice interaction — ${duration}s]`;
      let repetitionSource: 'transcript' | 'acoustic' = 'acoustic';

      try {
        // Get audio blob if available (RealVoiceAnalysisService collects chunks)
        const svc = serviceRef.current;
        const audioBlob = 'getAudioBlob' in svc && typeof svc.getAudioBlob === 'function'
          ? (svc as { getAudioBlob: () => Blob | null }).getAudioBlob()
          : null;

        if (audioBlob && audioBlob.size > 0) {
          const reader = new FileReader();
          const audioBase64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(audioBlob);
          });

          // Call backend STT (Bhashini or mock fallback)
          const sttRes = await fetch(`${API_BASE}/api/language/speech-to-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64,
              language: language || 'en',
              context: 'voice_interaction',
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (sttRes.ok) {
            const sttData = await sttRes.json();
            if (sttData.text && sttData.text.length > 2 && sttData.mode !== 'error') {
              transcript = sttData.text;
              repetitionSource = 'transcript';
            }
          }
        }
      } catch {
        // STT failed — continue with acoustic-only repetition
        // This is expected when backend is not running
      }

      // --- Repetition analysis ---
      if (repetitionSource === 'transcript') {
        // Use transcript-based repetition (Bhashini STT)
        const repResult = analyzeTranscriptRepetition(transcript);
        features.repetitionCount = repResult.repetitionCount;
      }
      // else: keep acoustic-based repetition from extractFeatures()

      const baseline = getBaseline();
      const hasBaseline = baseline.sessionsUsed >= 3;

      let session;
      if (hasBaseline) {
        // Sufficient baseline — compare against personal history
        session = generateVoiceEvent(
          'P001',
          features,
          baseline,
          transcript,
          duration,
          false
        );
      } else {
        // Insufficient baseline — real interaction, but no personal baseline to compare against yet
        session = generateVoiceEvent(
          'P001',
          features,
          baseline,
          transcript,
          duration,
          false // isDemo = false — this IS a real patient interaction
        );
        // Override status to indicate insufficient baseline
        session.status = 'insufficient_baseline';
        session.anomalyScore = 0;
      }

      // Add to store (this triggers alert if unusual and recalculates baseline)
      addVoiceSession(session);
      setCurrentVoiceSession(session);

      // Wait a moment, then show thank you
      await new Promise(r => setTimeout(r, 1200));
      setState('thankyou');

      // Navigate back after delay
      setTimeout(() => {
        navigate('/patient');
      }, 2500);
    } catch {
      // If anything fails, still show a polite response
      setState('thankyou');
      setTimeout(() => navigate('/patient'), 2500);
    }
  }, [addVoiceSession, setCurrentVoiceSession, navigate, stopWaveAnimation]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveRef.current) clearInterval(waveRef.current);
    };
  }, []);

  const handleMicPress = () => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white page-enter">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">{t('voice.title', language)}</h1>
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: '55vh' }}>
        {/* State text */}
        <div className="text-center mb-8">
          {state === 'idle' && (
            <p className="text-xl text-gray-500 font-medium">{t('voice.tap', language)}</p>
          )}
          {state === 'recording' && (
            <div>
              <p className="text-xl text-primary-600 font-bold animate-pulse">{t('voice.listening', language)}</p>
              <p className="text-sm text-gray-400 mt-2">{formatTime(elapsed)}</p>
            </div>
          )}
          {state === 'processing' && (
            <div>
              <p className="text-xl text-primary-600 font-medium">{t('voice.processing', language)}</p>
              <div className="flex justify-center gap-1 mt-3">
                <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          {state === 'thankyou' && (
            <div className="animate-[page-in_0.3s_ease-out]">
              <p className="text-2xl text-success-600 font-bold">🙏</p>
              <p className="text-xl text-gray-700 font-medium mt-2">{t('voice.thankyou', language)}</p>
              <p className="text-sm text-gray-400 mt-2">I'm here whenever you need me.</p>
            </div>
          )}
        </div>

        {/* Waveform */}
        {(state === 'recording' || state === 'processing') && (
          <div className="flex items-center justify-center gap-1 mb-8 h-8">
            {waveHeights.map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-primary-400 transition-all duration-100"
                style={{ height: `${h}px`, opacity: state === 'processing' ? 0.4 : 0.8 }}
              />
            ))}
          </div>
        )}

        {/* Microphone button */}
        {state !== 'thankyou' && (
          <button
            onClick={handleMicPress}
            disabled={state === 'processing'}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              state === 'recording'
                ? 'bg-red-500 text-white mic-pulse'
                : state === 'processing'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-500 text-white hover:bg-primary-600 active:scale-95 shadow-lg hover:shadow-xl'
            }`}
          >
            {state === 'recording' ? (
              <MicOff size={40} />
            ) : state === 'processing' ? (
              <div className="w-6 h-6 border-4 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Mic size={40} />
            )}
          </button>
        )}

        {state !== 'thankyou' && (
          <p className="text-sm text-gray-400 mt-4">
            {state === 'recording' ? t('voice.recording', language) : t('voice.ready', language)}
          </p>
        )}
      </div>

      <PrivacyNote />
    </div>
  );
}
