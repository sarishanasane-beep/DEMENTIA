// ============================================================
// Language Routes — Bhashini Integration
// ============================================================
// API endpoints for speech-to-text and text-to-speech.
// Bhashini is the LANGUAGE ACCESS LAYER, not the distress detector.
// ============================================================

import { Router, type Request, type Response } from 'express';
import {
  getBhashiniStatus,
  mockSpeechToText,
  mockTextToSpeech,
  realSpeechToText,
  realTextToSpeech,
} from '../services/bhashini.js';

const router = Router();

// ---- GET /api/language/status ----
// Language service status (no secrets)
router.get('/status', (_req: Request, res: Response) => {
  res.json(getBhashiniStatus());
});

// ---- POST /api/language/speech-to-text ----
// Convert patient speech to text
router.post('/speech-to-text', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { audioBase64, language, context } = req.body;

    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 is required' });
      return;
    }

    const status = getBhashiniStatus();

    if (status.mode === 'mock') {
      const result = mockSpeechToText(
        Buffer.from(''),
        language || 'en',
        context
      );
      console.log(`[Language] Mock STT in ${Date.now() - startTime}ms`);
      res.json({
        ...result,
        mode: 'mock',
        message: 'Using fallback STT. Configure BHASHINI_API_KEY for regional language support.',
      });
      return;
    }

    // Real Bhashini STT
    const base64Data = audioBase64.includes(',')
      ? audioBase64.split(',')[1]
      : audioBase64;
    const audioBuffer = Buffer.from(base64Data, 'base64');

    const result = await realSpeechToText(audioBuffer, language || 'en', context);

    console.log(`[Language] Real STT completed in ${Date.now() - startTime}ms`);

    res.json({
      ...result,
      mode: 'real',
      message: 'Speech-to-text complete.',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Language] STT failed after ${duration}ms:`, (error as Error).message);

    if ((error as Error).message === 'BHASHINI_NOT_CONFIGURED') {
      const { language, context } = req.body;
      const result = mockSpeechToText(Buffer.from(''), language || 'en', context);
      res.json({
        ...result,
        mode: 'mock',
        message: 'Bhashini not configured. Using fallback STT.',
      });
      return;
    }

    // On failure, return empty — frontend can still use text input
    res.json({
      text: '',
      language: req.body.language || 'en',
      confidence: 0,
      mode: 'error',
      message: 'Speech-to-text unavailable. You can type your response instead.',
    });
  }
});

// ---- POST /api/language/text-to-speech ----
// Convert text to spoken audio
router.post('/text-to-speech', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { text, language } = req.body;

    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const status = getBhashiniStatus();

    if (status.mode === 'mock') {
      const result = mockTextToSpeech(text, language || 'en');
      console.log(`[Language] Mock TTS in ${Date.now() - startTime}ms`);
      res.json({
        ...result,
        mode: 'mock',
        message: 'Browser TTS will be used. Configure BHASHINI_API_KEY for regional language TTS.',
      });
      return;
    }

    // Real Bhashini TTS
    const result = await realTextToSpeech(text, language || 'en');

    console.log(`[Language] Real TTS completed in ${Date.now() - startTime}ms`);

    res.json({
      ...result,
      mode: 'real',
      message: 'Text-to-speech complete.',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Language] TTS failed after ${duration}ms:`, (error as Error).message);

    if ((error as Error).message === 'BHASHINI_NOT_CONFIGURED') {
      const { text, language } = req.body;
      const result = mockTextToSpeech(text || '', language || 'en');
      res.json({
        ...result,
        mode: 'mock',
        message: 'Bhashini not configured. Browser TTS will be used.',
      });
      return;
    }

    res.json({
      audioBase64: '',
      language: req.body.language || 'en',
      duration: 0,
      mode: 'error',
      message: 'Text-to-speech unavailable. Browser TTS will be used.',
    });
  }
});

export default router;
