// ============================================================
// AI Service Abstraction — OmniRoute / Kiro
// ============================================================
// Uses OmniRoute (OpenAI-compatible) endpoint with Kiro's
// Claude Sonnet 4.5 model.
//
// Never exposes API keys. Handles errors gracefully.
// Falls back to mock mode when credentials are not configured.
//
// Voice-memory transcription remains on OpenAI Whisper via
// the separate Bhashini language-service integration.
// ============================================================

import OpenAI from 'openai';

// ---- Configuration ----
interface AIConfig {
  apiKey: string | undefined;
  baseURL: string;
  model: string;
  mode: 'mock' | 'real';
}

function getConfig(): AIConfig {
  return {
    apiKey: process.env.OMNIROUTE_API_KEY,
    baseURL: process.env.OMNIROUTE_BASE_URL || 'http://127.0.0.1:20128/v1',
    model: process.env.OPENAI_MODEL || 'kr/claude-sonnet-4.5',
    mode: (process.env.AI_MODE as 'mock' | 'real') || 'mock',
  };
}

// ---- Status ----
export function getAIStatus() {
  const config = getConfig();
  const hasKey = !!config.apiKey && config.apiKey !== '' && !config.apiKey.startsWith('sk-your-key');
  return {
    configured: hasKey && config.mode === 'real',
    provider: 'omniroute',
    model: config.model,
    mode: hasKey && config.mode === 'real' ? 'real' : 'mock',
    message: hasKey && config.mode === 'real'
      ? `OmniRoute/Kiro connected — ${config.model}`
      : 'Using demo AI. Set OMNIROUTE_API_KEY and AI_MODE=real for production.',
  };
}

// ---- Client (lazy singleton) ----
let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const config = getConfig();
  if (!config.apiKey || config.apiKey === '' || config.apiKey.startsWith('sk-your-key')) {
    return null;
  }
  if (!client) {
    client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }
  return client;
}

// ---- Generate Text ----
export async function generateText(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  const config = getConfig();
  const startTime = Date.now();

  try {
    const response = await c.chat.completions.create({
      model: config.model,
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: prompt },
      ],
      temperature: 0.7,
      max_completion_tokens: 1024,
    });

    const duration = Date.now() - startTime;
    console.log(`[AI] generateText completed in ${duration}ms`);
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error as Error & { status?: number; error?: { message?: string } };
    const httpStatus = err.status || err.error?.message?.match(/\[(\d+)\]/)?.[1] || '?';
    console.error(`[AI] generateText failed after ${duration}ms — HTTP ${httpStatus}: ${err.message}`);
    throw error;
  }
}

// ---- Generate Structured (JSON) ----
// Claude does not need response_format — we enforce JSON in the prompt
// and validate/parse the response robustly.
export async function generateStructured<T>(
  prompt: string,
  schema: string,
  systemPrompt?: string
): Promise<T> {
  const c = getClient();
  if (!c) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  const config = getConfig();
  const startTime = Date.now();

  const fullSystem = [
    systemPrompt || '',
    `\nYou MUST respond with valid JSON that matches this schema:\n${schema}`,
    'Do not include markdown code fences. Return only raw JSON.',
  ].join('\n');

  try {
    const response = await c.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system' as const, content: fullSystem },
        { role: 'user' as const, content: prompt },
      ],
      temperature: 0.7,
      max_completion_tokens: 2048,
      // No response_format — Claude enforces JSON via system prompt instruction
    });

    const duration = Date.now() - startTime;
    const rawContent = response.choices[0]?.message?.content || '{}';
    const finishReason = response.choices[0]?.finish_reason || 'unknown';
    console.log(`[AI] generateStructured completed in ${duration}ms (response length: ${rawContent.length}, finish_reason: ${finishReason})`);
    if (finishReason === 'length') {
      console.warn(`[AI] WARNING: Response was TRUNCATED by token limit! (max_completion_tokens was 2048)`);
    }

    // Safe dev logging: first/last 200 chars (no secrets)
    if (rawContent.length > 100) {
      console.log(`[AI] response preview: ...${rawContent.slice(0, 200)}...`);
      console.log(`[AI] response tail: ...${rawContent.slice(-200)}...`);
    }

    // Robust JSON extraction: handle markdown fences, leading/trailing text
    const jsonContent = extractJSON(rawContent);
    const parsed = JSON.parse(jsonContent) as T;
    return parsed;
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error as Error & { status?: number; error?: { message?: string } };
    const httpStatus = err.status || err.error?.message?.match(/\[(\d+)\]/)?.[1] || '?';
    console.error(`[AI] generateStructured failed after ${duration}ms — HTTP ${httpStatus}: ${err.message}`);
    throw error;
  }
}

// ---- Extract JSON from potentially wrapped content ----
// Claude sometimes wraps JSON in ```json fences. Strip them.
export function extractJSON(content: string): string {
  let trimmed = content.trim();

  // Remove markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    trimmed = fenceMatch[1].trim();
  }

  // If still not starting with { or [, try to find the JSON object/array
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    const jsonStart = trimmed.indexOf('{');
    const arrayStart = trimmed.indexOf('[');
    const start = jsonStart >= 0 && (arrayStart < 0 || jsonStart < arrayStart)
      ? jsonStart
      : arrayStart;
    if (start >= 0) {
      trimmed = trimmed.slice(start);
    }
  }

  return trimmed;
}

// ---- Analyze Image ----
export async function analyzeImage(
  imageUrl: string,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  const config = getConfig();
  const startTime = Date.now();

  try {
    const response = await c.chat.completions.create({
      model: config.model,
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        {
          role: 'user' as const,
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.5,
      max_completion_tokens: 2048,
    });

    const duration = Date.now() - startTime;
    const choice = response.choices[0];
    const rawContent = choice?.message?.content || '';
    const finishReason = choice?.finish_reason || 'unknown';

    // === FULL DIAGNOSTIC LOG ===
    console.log(`[DIAG-SDK] analyzeImage completed in ${duration}ms`);
    console.log(`[DIAG-SDK] model sent: ${config.model}`);
    console.log(`[DIAG-SDK] max_completion_tokens sent: 2048`);
    console.log(`[DIAG-SDK] response length: ${rawContent.length} chars`);
    console.log(`[DIAG-SDK] finish_reason: ${finishReason}`);
    console.log(`[DIAG-SDK] response.usage: ${JSON.stringify(response.usage || {})}`);
    console.log(`[DIAG-SDK] has content: ${!!choice?.message?.content}`);
    console.log(`[DIAG-SDK] content type: ${typeof choice?.message?.content}`);
    if (finishReason === 'length') {
      console.warn(`[DIAG-SDK] *** TRUNCATION DETECTED *** finish_reason=length with max_completion_tokens=2048`);
    }
    console.log(`[DIAG-SDK] FIRST 400 chars: ${rawContent.slice(0, 400)}`);
    console.log(`[DIAG-SDK] LAST 400 chars: ${rawContent.slice(-400)}`);
    console.log(`[DIAG-SDK] === END DIAGNOSTIC ===`);

    return rawContent;
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error as Error & { status?: number; error?: { message?: string } };
    const httpStatus = err.status || err.error?.message?.match(/\[(\d+)\]/)?.[1] || '?';
    console.error(`[AI] analyzeImage failed after ${duration}ms — HTTP ${httpStatus}: ${err.message}`);
    throw error;
  }
}

// ---- Transcribe Audio (Whisper — via OpenAI direct or OmniRoute) ----
// NOTE: This still uses OpenAI's Whisper API for transcription.
// Voice-memory transcription is a separate language-service concern
// and is NOT part of the OmniRoute/Kiro LLM integration.
export interface TranscriptionResult {
  transcript: string;
  language: string;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  language?: string
): Promise<TranscriptionResult> {
  const c = getClient();
  if (!c) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  const startTime = Date.now();

  try {
    const file = new File([new Uint8Array(audioBuffer)], filename, {
      type: 'audio/webm',
    });

    const response = await c.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: language || undefined,
      response_format: 'verbose_json',
    });

    const duration = Date.now() - startTime;
    console.log(`[AI] transcribeAudio completed in ${duration}ms`);

    return {
      transcript: response.text || '',
      language: response.language || language || 'en',
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[AI] transcribeAudio failed after ${duration}ms:`, (error as Error).message);
    throw error;
  }
}
