// ============================================================
// Bhashini Language Service
// ============================================================
// Language-access layer: Speech ↔ Text, Text ↔ Speech
// NOT the distress detector — that is a separate service.
//
// If Bhashini API credentials are not configured:
// - mock mode returns deterministic fallbacks
// - browser TTS is used as a last resort on the frontend
// ============================================================

// ---- Configuration ----
interface BhashiniConfig {
  apiUrl: string | undefined;
  apiKey: string | undefined;
  mode: 'mock' | 'real';
}

function getConfig(): BhashiniConfig {
  return {
    apiUrl: process.env.BHASHINI_API_URL,
    apiKey: process.env.BHASHINI_API_KEY,
    mode: (process.env.BHASHINI_MODE as 'mock' | 'real') || 'mock',
  };
}

export function getBhashiniStatus() {
  const config = getConfig();
  const hasKey = !!config.apiKey && config.apiKey !== '';
  const hasUrl = !!config.apiUrl && config.apiUrl !== '';
  return {
    configured: hasKey && hasUrl && config.mode === 'real',
    provider: 'bhashini',
    mode: hasKey && hasUrl && config.mode === 'real' ? 'real' : 'mock',
    supportedLanguages: ['en', 'as', 'hi'],
    message: hasKey && hasUrl && config.mode === 'real'
      ? 'Bhashini language service is configured.'
      : 'Using fallback language support. Configure BHASHINI_API_KEY for regional language STT/TTS.',
  };
}

// ---- Mock STT ----
export function mockSpeechToText(
  _audioBuffer: Buffer,
  language: string,
  _context?: string
): { text: string; language: string; confidence: number } {
  const mockTranscripts: Record<string, string> = {
    en: 'This is a demo transcription. In production, Bhashini would convert your speech to text.',
    as: 'ইয়াটো এটা ডেমো ৰূপান্তৰ। উৎপাদনত, বHAShini আপোনাৰ কণ্ঠ পাঠ্যলে সলনি কৰিব।',
    hi: 'यह एक डेमो ट्रांसक्रिप्शन है। प्रोडक्शन में, भाषिणी आपकी आवाज़ को टेक्स्ट में बदल देगी।',
  };

  return {
    text: mockTranscripts[language] || mockTranscripts['en'],
    language,
    confidence: 0.95,
  };
}

// ---- Mock TTS ----
export function mockTextToSpeech(
  text: string,
  language: string
): { audioBase64: string; language: string; duration: number } {
  // In mock mode, return empty audio — the frontend will use browser TTS
  console.log(`[Bhashini Mock] TTS request for ${language}: "${text.slice(0, 50)}..."`);
  return {
    audioBase64: '',
    language,
    duration: Math.ceil(text.length * 0.08), // rough estimate
  };
}

// ---- Real STT (Bhashini API) ----
export async function realSpeechToText(
  audioBuffer: Buffer,
  language: string,
  _context?: string
): Promise<{ text: string; language: string; confidence: number }> {
  const config = getConfig();
  if (!config.apiUrl || !config.apiKey) {
    throw new Error('BHASHINI_NOT_CONFIGURED');
  }

  const startTime = Date.now();

  try {
    // Bhashini API call — structure based on standard Bhashini APIs
    const response = await fetch(`${config.apiUrl}/v1/speech-to-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        audio: audioBuffer.toString('base64'),
        language,
        model: 'ai4bharat/stt',
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Bhashini STT failed: ${response.status}`);
    }

    const result = await response.json() as {
      text?: string;
      confidence?: number;
      language?: string;
    };

    const duration = Date.now() - startTime;
    console.log(`[Bhashini] Real STT completed in ${duration}ms`);

    return {
      text: result.text || '',
      language: result.language || language,
      confidence: result.confidence || 0,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Bhashini] Real STT failed after ${duration}ms:`, (error as Error).message);
    throw error;
  }
}

// ---- Real TTS (Bhashini API) ----
export async function realTextToSpeech(
  text: string,
  language: string
): Promise<{ audioBase64: string; language: string; duration: number }> {
  const config = getConfig();
  if (!config.apiUrl || !config.apiKey) {
    throw new Error('BHASHINI_NOT_CONFIGURED');
  }

  const startTime = Date.now();

  try {
    const response = await fetch(`${config.apiUrl}/v1/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        text,
        language,
        model: 'ai4bharat/tts',
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Bhashini TTS failed: ${response.status}`);
    }

    const result = await response.json() as {
      audio?: string;
      duration?: number;
    };

    const duration = Date.now() - startTime;
    console.log(`[Bhashini] Real TTS completed in ${duration}ms`);

    return {
      audioBase64: result.audio || '',
      language,
      duration: result.duration || Math.ceil(text.length * 0.08),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Bhashini] Real TTS failed after ${duration}ms:`, (error as Error).message);
    throw error;
  }
}
