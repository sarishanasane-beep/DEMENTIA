import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  DEMO_NORMAL_VOICE, DEMO_UNUSUAL_VOICE, DEMO_BASELINE
} from '../../utils/demoData';
import { generateVoiceEvent } from '../../services/voiceAnalysis';
import type { VoiceSession } from '../../types';

type DemoStep = 'select' | 'recording' | 'features' | 'baseline' | 'deviation' | 'result';

const STEPS = [
  'Voice interaction recorded',
  'Extracting voice features...',
  'Comparing with personal baseline...',
  'Calculating deviation...',
  'Result',
];

export default function DemoMode() {
  const navigate = useNavigate();
  useAppStore();
  const [sampleType, setSampleType] = useState<'normal' | 'unusual' | null>(null);
  const [step, setStep] = useState<DemoStep>('select');
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<VoiceSession | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [, setIsPlaying] = useState(false);

  const runDemo = useCallback(async (type: 'normal' | 'unusual') => {
    setSampleType(type);
    setIsPlaying(true);
    setStep('recording');
    setStepIndex(0);
    setResult(null);

    // Step 1: Recording
    await new Promise(r => setTimeout(r, 1500));
    setStepIndex(1);
    setStep('features');

    // Step 2: Feature extraction
    await new Promise(r => setTimeout(r, 1500));
    setStepIndex(2);
    setStep('baseline');

    // Step 3: Baseline comparison
    await new Promise(r => setTimeout(r, 1500));
    setStepIndex(3);
    setStep('deviation');

    // Step 4: Deviation calculation
    await new Promise(r => setTimeout(r, 1500));
    setStepIndex(4);
    setStep('result');

    // Step 5: Generate result
    const sampleData = type === 'normal' ? DEMO_NORMAL_VOICE : DEMO_UNUSUAL_VOICE;
    const session = generateVoiceEvent(
      'P001',
      {
        pitchMean: sampleData.pitchMean,
        pitchVariance: sampleData.pitchVariance,
        speakingRate: sampleData.speakingRate,
        averagePause: sampleData.averagePause,
        longPauseCount: sampleData.longPauseCount,
        repetitionCount: sampleData.repetitionCount,
        volumeMean: sampleData.volumeMean,
        volumeVariance: sampleData.volumeVariance,
        speechDuration: sampleData.speechDuration,
      },
      DEMO_BASELINE,
      sampleData.transcript,
      sampleData.duration,
      true
    );

    setResult(session);
    // Use store's addVoiceSession so alerts are generated for unusual results
    useAppStore.getState().addVoiceSession(session);
    setIsPlaying(false);
  }, []);

  const reset = () => {
    setStep('select');
    setStepIndex(0);
    setResult(null);
    setSampleType(null);
    setIsPlaying(false);
  };

  const sampleData = sampleType === 'normal' ? DEMO_NORMAL_VOICE : DEMO_UNUSUAL_VOICE;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white page-enter">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-4 bg-white border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Voice Analysis Demo</h1>
          <p className="text-xs text-gray-400">Interactive demonstration of the analysis pipeline</p>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Step progress */}
        {step !== 'select' && (
          <div className="mb-6">
            <div className="flex items-center gap-1 mb-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i <= stepIndex ? 'bg-primary-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500 font-medium">{STEPS[stepIndex]}</p>
          </div>
        )}

        {/* Sample selection */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 text-lg mb-2">Select a Voice Sample</h2>
              <p className="text-sm text-gray-400 mb-6">
                Choose a sample to demonstrate the voice pattern analysis pipeline.
                The same pipeline is used for both samples.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => runDemo('normal')}
                  className="w-full p-5 rounded-2xl border-2 border-success-200 bg-success-50 text-left hover:border-success-400 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle size={24} className="text-success-500" />
                    <div>
                      <div className="font-bold text-gray-800">Normal Voice Sample</div>
                      <div className="text-sm text-gray-500 mt-1">"Please remind me about my medicine."</div>
                      <div className="text-xs text-success-500 mt-1">Expected: Score ~20-30 (Normal)</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => runDemo('unusual')}
                  className="w-full p-5 rounded-2xl border-2 border-alert-200 bg-alert-50 text-left hover:border-alert-400 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={24} className="text-alert-500" />
                    <div>
                      <div className="font-bold text-gray-800">Unusual Voice Sample</div>
                      <div className="text-sm text-gray-500 mt-1">"I... I don't know... where am I... I can't remember..."</div>
                      <div className="text-xs text-alert-500 mt-1">Expected: Score ~60-80 (Unusual)</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Technical explanation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowTechnical(!showTechnical)}
                className="w-full flex items-center justify-between p-5"
              >
                <div className="flex items-center gap-2">
                  <Info size={18} className="text-primary-500" />
                  <span className="font-bold text-gray-800">How does this work?</span>
                </div>
                {showTechnical ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>

              {showTechnical && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <div className="space-y-3 text-sm">
                    {[
                      { icon: '🎙️', label: 'Audio', desc: 'Patient-initiated voice interaction' },
                      { icon: '📊', label: 'Acoustic Features', desc: 'Pitch, pace, pauses, repetition, volume' },
                      { icon: '👤', label: 'Personal Baseline', desc: 'Patient\'s historical voice pattern (10 sessions)' },
                      { icon: '📐', label: 'Statistical Deviation', desc: 'Z-score comparison with personal baseline' },
                      { icon: '🎯', label: 'Unusual Pattern Indicator', desc: 'Combined anomaly score (0-100)' },
                      { icon: '👨‍⚕️', label: 'Caregiver Review', desc: 'Alert surfaced for human review' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xl w-8 text-center">{item.icon}</span>
                        <div>
                          <span className="font-bold text-gray-700">{item.label}</span>
                          <span className="text-gray-400 ml-1">— {item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-primary-50 rounded-xl">
                    <p className="text-xs text-primary-600 leading-relaxed">
                      <strong>About this prototype:</strong> Our Voice Distress Indicator is an experimental,
                      non-diagnostic feature. It analyses voice characteristics during normal patient-initiated
                      interactions and compares them with that patient's own historical voice pattern. When a
                      sufficiently unusual deviation occurs, the system surfaces a caregiver-facing review signal.
                    </p>
                    <p className="text-xs text-primary-600 leading-relaxed mt-2">
                      We deliberately use personal baselines rather than universal voice thresholds because
                      normal speech varies significantly between individuals.
                    </p>
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium mb-1">Voice Content vs Voice Acoustics</p>
                    <p className="text-xs text-gray-400">
                      <strong>What they say</strong> → handled by speech-to-text / language pipeline (Bhashini).<br />
                      <strong>How they say it</strong> → handled by acoustic feature extraction (pitch, pace, pauses, volume).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recording step */}
        {step === 'recording' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4 mic-pulse">
              <Play size={32} className="text-primary-500 ml-1" />
            </div>
            <p className="text-lg font-bold text-gray-800">Voice interaction recorded</p>
            <p className="text-sm text-gray-400 mt-2">Duration: {sampleData.duration} seconds</p>
            <div className="mt-4 bg-gray-50 rounded-xl p-3">
              <p className="text-sm text-gray-500 italic">"{sampleData.transcript}"</p>
            </div>
          </div>
        )}

        {/* Features step */}
        {step === 'features' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Extracted Voice Features</h3>
            <div className="space-y-2">
              {[
                ['Pitch Mean', `${sampleData.pitchMean} Hz`],
                ['Pitch Variance', `${sampleData.pitchVariance}`],
                ['Speaking Rate', `${sampleData.speakingRate} wpm`],
                ['Avg Pause Duration', `${sampleData.averagePause}s`],
                ['Long Pause Count', `${sampleData.longPauseCount}`],
                ['Repetition Count', `${sampleData.repetitionCount}`],
                ['Volume Mean', `${sampleData.volumeMean}`],
                ['Volume Variance', `${sampleData.volumeVariance}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-bold text-gray-700">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Baseline step */}
        {step === 'baseline' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-2">Personal Baseline Comparison</h3>
            <p className="text-xs text-gray-400 mb-4">Established from {DEMO_BASELINE.sessionsUsed} previous interactions</p>
            <div className="space-y-2">
              {[
                ['Pitch', `${DEMO_BASELINE.pitchMean} Hz`, `${sampleData.pitchMean} Hz`],
                ['Speaking Rate', `${DEMO_BASELINE.speakingRateMean} wpm`, `${sampleData.speakingRate} wpm`],
                ['Pause', `${DEMO_BASELINE.pauseMean}s`, `${sampleData.averagePause}s`],
                ['Repetition', `${DEMO_BASELINE.repetitionMean}`, `${sampleData.repetitionCount}`],
                ['Volume', `${DEMO_BASELINE.volumeMean}`, `${sampleData.volumeMean}`],
              ].map(([label, baseline, current]) => (
                <div key={label} className="flex items-center gap-3 py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500 w-24">{label}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{baseline}</span>
                    <span className="text-xs text-gray-300">→</span>
                    <span className="text-xs font-bold text-gray-700 bg-primary-50 px-2 py-0.5 rounded">{current}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deviation step */}
        {step === 'deviation' && result && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Pattern Deviation Calculation</h3>
            <div className="space-y-3">
              {Object.entries(result.deviations).map(([key, data]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-24 capitalize">{key}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${Math.abs(data.zScore) > 2 ? 'bg-alert-500' : 'bg-primary-500'}`}
                      style={{ width: `${Math.min(100, data.weighted)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-16 text-right ${Math.abs(data.zScore) > 2 ? 'text-alert-500' : 'text-gray-500'}`}>
                    {data.zScore > 0 ? '+' : ''}{data.zScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result step */}
        {step === 'result' && result && (
          <div className="space-y-4">
            {/* Score card */}
            <div className={`rounded-2xl p-6 border-2 ${
              result.status === 'unusual' ? 'bg-alert-50 border-alert-300' :
              result.status === 'monitor' ? 'bg-caution-50 border-caution-300' :
              'bg-success-50 border-success-300'
            }`}>
              <div className="text-center">
                <div className={`text-6xl font-bold ${
                  result.status === 'unusual' ? 'text-alert-500' :
                  result.status === 'monitor' ? 'text-caution-500' :
                  'text-success-500'
                }`}>
                  {result.anomalyScore}
                </div>
                <div className="text-sm text-gray-500 mt-1">out of 100</div>
                <div className={`mt-2 text-lg font-bold ${
                  result.status === 'unusual' ? 'text-alert-600' :
                  result.status === 'monitor' ? 'text-caution-600' :
                  'text-success-600'
                }`}>
                  {result.status.toUpperCase()}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {result.status === 'unusual'
                    ? "Voice interaction differs noticeably from the personal baseline."
                    : result.status === 'monitor'
                    ? "Some variation from the usual pattern."
                    : "Pattern within usual range."}
                </p>
              </div>
            </div>

            {/* Caregiver notification */}
            {result.status === 'unusual' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-alert-200">
                <h3 className="font-bold text-gray-800 mb-2">🔔 Caregiver Notification</h3>
                <div className="bg-alert-50 rounded-xl p-4">
                  <p className="font-bold text-gray-800">Unusual interaction pattern</p>
                  <p className="text-sm text-gray-500 mt-1">
                    An unusual interaction pattern was detected. Please check in with the patient.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs text-gray-400">Score: {result.anomalyScore}/100</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">Patient: Anita Devi</span>
                  </div>
                </div>
              </div>
            )}

            {result.status !== 'unusual' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-success-200">
                <h3 className="font-bold text-gray-800 mb-2">✅ No Alert Generated</h3>
                <p className="text-sm text-gray-500">
                  Voice pattern is within the person's usual range. No caregiver notification needed.
                </p>
              </div>
            )}

            {/* Patient experience */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-2">Patient Experience</h3>
              <div className="bg-primary-50 rounded-xl p-4 text-center">
                <p className="text-lg text-primary-700 font-medium">🙏 Thank you.</p>
                <p className="text-sm text-primary-500 mt-1">I'm here whenever you need me.</p>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                The patient sees a warm, reassuring response — never an alarm.
              </p>
            </div>

            {/* Reset */}
            <button
              onClick={reset}
              className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold active:scale-[0.98]"
            >
              Try Another Sample
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
