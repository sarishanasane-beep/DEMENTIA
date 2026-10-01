// ============================================================
// LanguageService — Bhashini Integration Layer
// ============================================================
// Bhashini is the language-access layer, NOT the distress detector.
// Its role: Speech ↔ Text, Text ↔ Speech
//
// Two implementations:
// - MockLanguageService: uses browser TTS, simulates STT
// - RealBhashiniLanguageService: calls our backend → Bhashini API
//
// Factory auto-selects based on backend availability.
// ============================================================

import type { Language } from '../types';

const API_BASE = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:3001';

// ---- Language Service Interface ----
export interface LanguageService {
  speechToText(audioBlob: Blob, language: Language): Promise<string>;
  textToSpeech(text: string, language: Language): Promise<void>;
  getSupportedLanguages(): { code: Language; name: string; nativeName: string }[];
  getMode(): 'mock' | 'real';
}

// ---- Mock implementation ----
export class MockLanguageService implements LanguageService {
  async speechToText(_audioBlob: Blob, _language: Language): Promise<string> {
    await new Promise(r => setTimeout(r, 800));
    return '[Transcription available in real deployment]';
  }

  async textToSpeech(text: string, _language: Language): Promise<void> {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  getSupportedLanguages() {
    return [
      { code: 'en' as Language, name: 'English', nativeName: 'English' },
      { code: 'as' as Language, name: 'Assamese', nativeName: 'অসমীয়া' },
      { code: 'hi' as Language, name: 'Hindi', nativeName: 'हिन्दी' },
    ];
  }

  getMode() {
    return 'mock' as const;
  }
}

// ---- Real Bhashini implementation (via our backend) ----
export class RealBhashiniLanguageService implements LanguageService {
  private backendAvailable = false;
  private langStatus: { configured: boolean; mode: string; message: string } | null = null;

  constructor() {
    this.checkBackend().catch(() => {
      this.backendAvailable = false;
    });
  }

  private async checkBackend(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/language/status`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        this.langStatus = await res.json();
        this.backendAvailable = this.langStatus?.mode === 'real';
      }
    } catch {
      this.backendAvailable = false;
    }
  }

  async speechToText(audioBlob: Blob, language: Language): Promise<string> {
    if (!this.backendAvailable) {
      return new MockLanguageService().speechToText(audioBlob, language);
    }

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const res = await fetch(`${API_BASE}/api/language/speech-to-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          language,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error('STT request failed');
      const data = await res.json();
      return data.text || '';
    } catch (error) {
      console.error('[Language] STT failed, falling back:', (error as Error).message);
      return new MockLanguageService().speechToText(audioBlob, language);
    }
  }

  async textToSpeech(text: string, language: Language): Promise<void> {
    if (!this.backendAvailable) {
      return new MockLanguageService().textToSpeech(text, language);
    }

    try {
      const res = await fetch(`${API_BASE}/api/language/text-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error('TTS request failed');
      const data = await res.json();

      // If backend returned audio, play it
      if (data.audioBase64 && data.audioBase64.length > 0) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        await audio.play();
      } else {
        // Backend returned no audio (mock mode) — use browser TTS
        await new MockLanguageService().textToSpeech(text, language);
      }
    } catch (error) {
      console.error('[Language] TTS failed, falling back:', (error as Error).message);
      await new MockLanguageService().textToSpeech(text, language);
    }
  }

  getSupportedLanguages() {
    return [
      { code: 'en' as Language, name: 'English', nativeName: 'English' },
      { code: 'as' as Language, name: 'Assamese', nativeName: 'অসমীয়া' },
      { code: 'hi' as Language, name: 'Hindi', nativeName: 'हिन्दी' },
    ];
  }

  getMode() {
    return this.backendAvailable ? ('real' as const) : ('mock' as const);
  }

  getStatus() {
    return this.langStatus;
  }
}

// ---- Helpers ----
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result); // Already includes data:mime;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---- Language service status check (for caregiver UI) ----
export async function getLanguageServiceStatus(): Promise<{
  configured: boolean;
  mode: string;
  provider: string;
  message: string;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/api/language/status`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

// ---- Factory ----
export function createLanguageService(): LanguageService {
  // Try to create real service; it auto-checks backend
  return new RealBhashiniLanguageService();
}
