// ============================================================
// Reminiscence Routes
// ============================================================
// API endpoints for reminiscence activity generation,
// image understanding, and speech-to-text transcription.
// ============================================================

import { Router, type Request, type Response } from 'express';
import { generateStructured, analyzeImage, transcribeAudio, getAIStatus, extractJSON } from '../services/openai.js';
import { mockAnalyzeImage, mockGenerateActivities, mockTranscribeAudio } from '../services/mockAI.js';

const router = Router();

// ---- POST /api/reminiscence/generate ----
// Generate reminiscence activities from a family memory
// Accepts: metadata, transcript, imageAnalysis — uses all available context
router.post('/generate', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { patientId, memory, imageAnalysis, preferredLanguage } = req.body;

    if (!patientId || !memory) {
      res.status(400).json({ error: 'patientId and memory are required' });
      return;
    }

    const status = getAIStatus();

    if (status.mode === 'mock') {
      // Mock mode — use deterministic mock generation
      const activities = mockGenerateActivities(memory, preferredLanguage || 'en');
      console.log(`[Reminiscence] Mock generate: ${activities.length} activities in ${Date.now() - startTime}ms`);
      res.json({
        activities,
        mode: 'mock',
        message: 'Generated using demo AI.',
      });
      return;
    }

    // ---- Real AI mode — call OpenAI ----

    const langLabel = preferredLanguage === 'as' ? 'Assamese' : preferredLanguage === 'hi' ? 'Hindi' : 'English';

    const systemPrompt = `You are a compassionate AI assistant creating personalised reminiscence activities for an elderly person with cognitive challenges.

YOUR GOAL: Help the person connect with a meaningful family memory through gentle, warm questions. This is REMINISCENCE, not a quiz. The purpose is emotional connection and engagement, not testing knowledge.

CRITICAL RULES:
1. ONLY use information the caregiver has explicitly provided. NEVER invent names, relationships, dates, locations, or events.
2. If the caregiver did not provide a relationship (e.g., "sister", "daughter"), do NOT add one. Use only the name as given.
3. Questions must be SHORT, SIMPLE, and WARM — suitable for an elderly person. One idea per question. Use everyday vocabulary.
4. Never use medical language. Never mention dementia, depression, anxiety, or any diagnosis.
5. Never produce upsetting or distressing content. Keep everything positive and gentle.
6. Support ${langLabel} language. If ${langLabel} is not English, translate the question and options.
7. Return ONLY valid JSON matching the schema. No markdown. No extra text.

HOW TO CREATE MEANINGFUL ACTIVITIES:

First, UNDERSTAND the memory:
- What is this memory about? (a song, a place, a person, an event, a habit)
- Why does it matter to the family? (the caregiver description explains this)
- What emotional significance does it carry? (love, joy, togetherness, tradition)

Then, create questions that explore THIS MEANING — not questions that just extract isolated words.

For audio memories specifically:
- The transcript tells you WHAT was said about the memory.
- The caregiver description tells you WHY the memory is meaningful.
- Use BOTH together. The caregiver context is authoritative.
- Create questions that connect the spoken words to the emotional meaning.

ACTIVITY TYPES — choose ONLY the 2-4 most suitable for THIS memory:

- who_is_this: Only when a verified person is clearly associated with the memory. For audio: "Whose favourite song was this?" or "Who enjoyed this?" — NOT just "Who is [name]?"
- where_was_this: Only when a verified location is relevant to the memory. Do NOT force a location question if location is unknown or unimportant.
- complete_the_memory: Create a meaningful sentence from the context with ONE blank. The blank should contain a key word or phrase that captures the memory's meaning. Example: "This song was special because it was her ______ song." Answer: "favourite"
- what_happened_next: Only when the memory contains a clear sequence of events. For audio memories, a meaningful reflection question is often better than forcing a sequence.
- whose_voice_is_this: For audio memories when a speaker is identified. Options: correct speaker + 3 gentle distractors.

QUALITY CHECKLIST for every activity:
- Does the question help the person connect with the MEANING of the memory?
- Is the answer grounded in verified caregiver information?
- Would this feel warm and inviting to an elderly person?
- Is the language simple and familiar?

DO NOT:
- Extract random words from the transcript and make fill-in-the-blank questions
- Force activity types that don't fit the memory
- Create questions with answers like "listen to this song" or isolated words
- Invent details not present in the verified context

GOOD EXAMPLES:
Memory: "This was her favourite song and she was always eager to listen to it."
✓ "Do you remember why this song was special to her?" Answer: "It was her favourite song."
✓ "Complete: She was always ______ to listen to this song." Answer: "eager"
✗ "Do you remember this?" Answer: "listen to this song"
✗ "Complete this memory: favourite"

Memory: A wedding photo with people named Mina and Raj.
✓ "Who is in this wedding photo?" Answer: "Mina and Raj"
✓ "Where was this wedding?" Answer: "Guwahati"
✗ "What happened at the wedding?" (too vague)`;

    // Build context sections from all available data
    const contextParts: string[] = [];

    contextParts.push(`## Caregiver-Provided Information (AUTHORITATIVE — use as truth)
Title: ${memory.title || 'Unknown'}
Memory type: ${memory.type}
People mentioned: ${memory.people?.join(', ') || 'Not provided'}
Event: ${memory.event || 'Not provided'}
Location: ${memory.location || 'Not provided'}
Year: ${memory.year || 'Not provided'}
Description: ${memory.description || 'Not provided'}
Speaker (audio): ${memory.familyMember || 'N/A'}
Why this memory is important: ${memory.whyImportant || 'Not provided'}`);

    if (memory.transcript) {
      contextParts.push(`## Voice Transcript (from speech-to-text)
"${memory.transcript}"

This is what the family member said about the memory. Use it to understand WHAT the memory is about. Combine this with the caregiver description to understand WHY it matters. Create questions that connect the spoken words to the emotional meaning of the memory.`);
    }

    if (imageAnalysis) {
      contextParts.push(`## Image Understanding (from AI vision — supplementary context)
Description: ${imageAnalysis.description || 'N/A'}
Visible objects: ${imageAnalysis.visibleObjects?.join(', ') || 'N/A'}
Setting: ${imageAnalysis.setting || 'N/A'}
Event hints: ${imageAnalysis.eventHints?.join(', ') || 'N/A'}

Note: Image observations are supplementary. Caregiver metadata is authoritative.`);
    }

    const prompt = `Generate personalised reminiscence activities for this family memory.

${contextParts.join('\n\n')}

TASK:
1. First, understand what this memory means to the family.
2. Then create 2-4 activities that help the person connect with this memory's meaning.
3. Each activity should feel warm, personal, and grounded in the verified information above.
4. Choose only the activity types that fit THIS specific memory.
5. Every answer must be supported by the verified caregiver information.

Return valid JSON matching the schema.`;

    const schema = `{
      "activities": [
        {
          "activityType": "who_is_this | where_was_this | complete_the_memory | what_happened_next | whose_voice_is_this",
          "question": "Short, warm, elderly-friendly question string",
          "correctAnswer": "The correct answer from caregiver-provided data",
          "options": ["correct answer", "distractor 1", "distractor 2", "distractor 3"],
          "storyTemplate": "Fill-in-the-blank story with ______ (only for complete_the_memory)",
          "storyBlanks": ["the missing word or phrase"] (only for complete_the_memory),
          "sequenceCards": ["step 1", "step 2", "step 3"] (only for what_happened_next, use 3-4 cards),
          "explanation": "Brief note on what caregiver data was used",
          "sourceMemoryId": "${memory.id}"
        }
      ]
    }`;

    const result = await generateStructured<{ activities: Array<{
      activityType: string;
      question: string;
      correctAnswer: string;
      options: string[];
      storyTemplate?: string;
      storyBlanks?: string[];
      sequenceCards?: string[];
      explanation: string;
      sourceMemoryId: string;
    }> }>(prompt, schema, systemPrompt);

    // Validate output
    const validTypes = ['who_is_this', 'where_was_this', 'complete_the_memory', 'what_happened_next', 'whose_voice_is_this'];
    const activities = (result.activities || []).filter(a => {
      if (!validTypes.includes(a.activityType)) {
        console.warn(`[Reminiscence] Rejected invalid activity type: ${a.activityType}`);
        return false;
      }
      if (!a.question || !a.correctAnswer) {
        console.warn(`[Reminiscence] Rejected activity with missing question/answer`);
        return false;
      }
      return true;
    });

    // Ensure all activities have required fields
    const cleaned = activities.map(a => ({
      activityType: a.activityType,
      question: a.question,
      correctAnswer: a.correctAnswer,
      options: Array.isArray(a.options) ? a.options : [a.correctAnswer],
      storyTemplate: a.storyTemplate || undefined,
      storyBlanks: Array.isArray(a.storyBlanks) ? a.storyBlanks : undefined,
      sequenceCards: Array.isArray(a.sequenceCards) ? a.sequenceCards : undefined,
      explanation: a.explanation || 'Generated from caregiver-provided information.',
      sourceMemoryId: a.sourceMemoryId || memory.id,
    }));

    console.log(`[Reminiscence] Real AI generate: ${cleaned.length} activities in ${Date.now() - startTime}ms`);

    res.json({
      activities: cleaned,
      mode: 'real',
      message: 'Generated using OmniRoute/Kiro.',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errMsg = (error as Error).message;
    console.error(`[Reminiscence] Generate failed after ${duration}ms:`, errMsg);

    // Always fall back to mock on ANY real-AI failure (including JSON parse errors)
    const { memory, preferredLanguage } = req.body;
    const activities = mockGenerateActivities(memory, preferredLanguage || 'en');

    if (errMsg === 'AI_NOT_CONFIGURED') {
      res.json({
        activities,
        mode: 'mock',
        message: 'Real AI is not configured. Using demo AI.',
      });
    } else {
      // JSON parse error, connection error, or any other failure
      console.error(`[Reminiscence] Real AI failed (${errMsg}), falling back to mock generation`);
      res.json({
        activities,
        mode: 'mock',
        message: `Real AI generation encountered an issue (${errMsg}). Using demo AI.`,
      });
    }
  }
});

// ---- POST /api/reminiscence/analyze-image ----
// Analyze a family photo for supporting context
router.post('/analyze-image', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { imageBase64, patientId, memoryId, metadata } = req.body;

    if (!patientId || !memoryId) {
      res.status(400).json({ error: 'patientId and memoryId are required' });
      return;
    }

    const status = getAIStatus();

    if (status.mode === 'mock' || !imageBase64) {
      const result = mockAnalyzeImage(imageBase64 || '', metadata || {});
      console.log(`[Reminiscence] Mock image analysis in ${Date.now() - startTime}ms`);
      res.json({
        ...result,
        mode: 'mock',
        message: imageBase64
          ? 'Using demo image analysis. Configure OPENAI_API_KEY for real analysis.'
          : 'No image provided. Using metadata only.'
      });
      return;
    }

    // Real AI mode — call OpenAI Vision
    const systemPrompt = `You are analysing a family photograph for a reminiscence therapy application.

RULES:
- Describe what you SEE in the image objectively. Keep descriptions SHORT (1-2 sentences).
- Never claim to identify specific individuals — only note the number of visible people.
- Be respectful and sensitive.
- Note any uncertainty briefly.
- Return ONLY valid JSON. No markdown fences. No explanation outside the JSON.
- Keep each field concise. Do NOT write long paragraphs.`;

    const metadataText = metadata
      ? `\n\nCaregiver-provided context (authoritative):
Title: ${metadata.title || 'Unknown'}
People named: ${metadata.people?.join(', ') || 'None provided'}
Event: ${metadata.event || 'Unknown'}
Location: ${metadata.location || 'Unknown'}
Year: ${metadata.year || 'Unknown'}
Description: ${metadata.description || 'None provided'}`
      : '';

    const prompt = `Analyse this family photograph. Return ONLY valid JSON matching this exact schema. No markdown fences. No extra text.

${metadataText}

{
  "description": "1-2 sentence description of what you see",
  "visiblePeopleCount": 0,
  "visibleObjects": ["object1", "object2"],
  "setting": "brief setting description",
  "eventHints": ["hint1"],
  "uncertaintyNotes": ["any uncertainty"]
}`;

    const imageContent = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const rawResult = await analyzeImage(imageContent, prompt, systemPrompt);

    // === DIAGNOSTIC LOGGING (development only) ===
    console.log(`[DIAG] Image analysis raw response length: ${rawResult.length} chars`);
    console.log(`[DIAG] Image analysis FIRST 500 chars: ${rawResult.slice(0, 500)}`);
    console.log(`[DIAG] Image analysis LAST 500 chars: ${rawResult.slice(-500)}`);
    console.log(`[DIAG] Raw response ends with: >>>${rawResult.slice(-50)}<<<`);
    // Check for common truncation indicators
    const lastChar = rawResult.trim().slice(-1);
    console.log(`[DIAG] Last character: '${lastChar}' (code: ${lastChar.charCodeAt(0)})`);
    console.log(`[DIAG] Response has closing brace: ${rawResult.includes('}')}`);
    console.log(`[DIAG] Balanced braces: open=${(rawResult.match(/\{/g) || []).length} close=${(rawResult.match(/\}/g) || []).length}`);
    console.log(`[DIAG] Balanced brackets: open=${(rawResult.match(/\[/g) || []).length} close=${(rawResult.match(/\]/g) || []).length}`);
    // === END DIAGNOSTIC ===

    let parsed;
    try {
      // Use extractJSON to handle markdown fences before parsing
      const jsonContent = extractJSON(rawResult);
      console.log(`[DIAG] After extractJSON, length: ${jsonContent.length}`);
      console.log(`[DIAG] extractJSON first 300: ${jsonContent.slice(0, 300)}`);
      console.log(`[DIAG] extractJSON last 300: ${jsonContent.slice(-300)}`);
      parsed = JSON.parse(jsonContent);
    } catch (parseErr) {
      console.error(`[DIAG] Image analysis JSON PARSE FAILED: ${(parseErr as Error).message}`);
      console.error(`[DIAG] Raw response for debugging (first 800 chars): ${rawResult.slice(0, 800)}`);
      console.error(`[DIAG] Raw response for debugging (last 500 chars): ${rawResult.slice(-500)}`);
      parsed = {
        description: rawResult.slice(0, 500),
        visiblePeopleCount: metadata?.people?.length || 0,
        visibleObjects: [],
        setting: metadata?.location || 'Unknown',
        eventHints: metadata?.event ? [metadata.event] : [],
        uncertaintyNotes: ['AI response could not be parsed as structured JSON.'],
      };
    }

    const result = {
      description: parsed.description || 'Image analysed.',
      visiblePeopleCount: parsed.visiblePeopleCount || 0,
      visibleObjects: Array.isArray(parsed.visibleObjects) ? parsed.visibleObjects : [],
      setting: parsed.setting || metadata?.location || 'Unknown',
      eventHints: Array.isArray(parsed.eventHints) ? parsed.eventHints : [],
      uncertaintyNotes: Array.isArray(parsed.uncertaintyNotes) ? parsed.uncertaintyNotes : [],
    };

    console.log(`[Reminiscence] Real image analysis completed in ${Date.now() - startTime}ms`);

    res.json({ ...result, mode: 'real', message: 'Image analysis complete (OmniRoute/Kiro).' });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Reminiscence] Image analysis failed after ${duration}ms:`, (error as Error).message);

    if ((error as Error).message === 'AI_NOT_CONFIGURED') {
      const { imageBase64, metadata } = req.body;
      const result = mockAnalyzeImage(imageBase64 || '', metadata || {});
      res.json({ ...result, mode: 'mock', message: 'OmniRoute not configured. Using demo image analysis.' });
      return;
    }

    res.json({
      description: 'Image analysis was not available.',
      visiblePeopleCount: 0,
      visibleObjects: [],
      setting: '',
      eventHints: [],
      uncertaintyNotes: ['Image analysis failed. You can still create activities from the information you entered.'],
      mode: 'error',
      message: 'Image analysis unavailable. You can still create activities from the information you entered.',
    });
  }
});

// ---- POST /api/reminiscence/transcribe-audio ----
// Transcribe a family voice recording using speech-to-text
router.post('/transcribe-audio', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { audioBase64, patientId, memoryId, language, speaker, title } = req.body;

    if (!patientId || !memoryId) {
      res.status(400).json({ error: 'patientId and memoryId are required' });
      return;
    }

    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 is required' });
      return;
    }

    const status = getAIStatus();

    if (status.mode === 'mock') {
      const result = mockTranscribeAudio(
        Buffer.from(''),
        'voice.webm',
        { title, speaker, language: language || 'en' }
      );
      console.log(`[Reminiscence] Mock transcribe in ${Date.now() - startTime}ms`);
      res.json({ ...result, mode: 'mock', message: 'Using demo transcription. Configure OMNIROUTE_API_KEY for real AI.' });
      return;
    }

    // Real AI mode — call OpenAI Whisper
    const base64Data = audioBase64.includes(',')
      ? audioBase64.split(',')[1]
      : audioBase64;
    const audioBuffer = Buffer.from(base64Data, 'base64');

    const filename = `voice_${memoryId}.webm`;
    const langCode = language === 'as' ? 'as' : language === 'hi' ? 'hi' : undefined;

    const result = await transcribeAudio(audioBuffer, filename, langCode);

    console.log(`[Reminiscence] Real transcription completed in ${Date.now() - startTime}ms`);

    res.json({ ...result, mode: 'real', message: 'Transcription complete (Whisper).' });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Reminiscence] Transcription failed after ${duration}ms:`, (error as Error).message);

    if ((error as Error).message === 'AI_NOT_CONFIGURED') {
      const { title, speaker, language } = req.body;
      const result = mockTranscribeAudio(
        Buffer.from(''),
        'voice.webm',
        { title, speaker, language: language || 'en' }
      );
      res.json({ ...result, mode: 'mock', message: 'Real AI is not configured. Using demo transcription.' });
      return;
    }

    res.json({
      transcript: '',
      language: req.body.language || 'en',
      mode: 'error',
      message: 'Transcription unavailable. You can still enter the transcript manually.',
    });
  }
});

export default router;
