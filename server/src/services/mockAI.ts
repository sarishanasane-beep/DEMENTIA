// ============================================================
// Mock AI Services
// ============================================================
// Deterministic mock implementations for development.
// Used when OPENAI_API_KEY is not configured.
// ============================================================

import { v4 as uuid } from 'uuid';

// ---- Types ----
export interface ImageAnalysisResult {
  description: string;
  visiblePeopleCount: number;
  visibleObjects: string[];
  setting: string;
  eventHints: string[];
  uncertaintyNotes: string[];
}

export interface GeneratedActivity {
  activityType: string;
  question: string;
  correctAnswer: string;
  options: string[];
  storyTemplate?: string;
  storyBlanks?: string[];
  sequenceCards?: string[];
  explanation: string;
  sourceMemoryId: string;
}

// ---- Mock Image Understanding ----
export function mockAnalyzeImage(
  _imageBase64: string,
  metadata: {
    title: string;
    people?: string[];
    event?: string;
    location?: string;
    year?: string;
    description?: string;
  }
): ImageAnalysisResult {
  const peopleCount = metadata.people?.length || 0;
  const objects: string[] = [];

  if (metadata.event) {
    if (metadata.event.toLowerCase().includes('wedding')) {
      objects.push('flowers', 'decorations', 'traditional clothing');
    } else if (metadata.event.toLowerCase().includes('bihu') || metadata.event.toLowerCase().includes('festival')) {
      objects.push('traditional dress', 'music instruments', 'decorations');
    } else {
      objects.push('people', 'outdoor setting');
    }
  }

  return {
    description: metadata.description ||
      `A ${metadata.year || 'family'} ${metadata.event || 'gathering'}${metadata.location ? ` in ${metadata.location}` : ''} with ${peopleCount > 0 ? peopleCount + ' people' : 'family members'}.`,
    visiblePeopleCount: peopleCount || Math.floor(Math.random() * 3) + 2,
    visibleObjects: objects.length > 0 ? objects : ['family members', 'outdoor setting', 'natural light'],
    setting: metadata.location || 'family home',
    eventHints: metadata.event ? [metadata.event] : ['family gathering'],
    uncertaintyNotes: [
      'This is a demo analysis — not real AI image understanding.',
      'For production, configure OPENAI_API_KEY for real vision analysis.',
    ],
  };
}

// ---- Mock Activity Generation ----
export function mockGenerateActivities(memory: {
  id: string;
  patientId: string;
  type: string;
  title: string;
  people?: string[];
  event?: string;
  location?: string;
  year?: string;
  description?: string;
  familyMember?: string;
  whyImportant?: string;
  transcript?: string;
}, language: string = 'en'): GeneratedActivity[] {
  const activities: GeneratedActivity[] = [];
  const people = memory.people || [];
  const hasPeople = people.length > 0;
  const hasLocation = !!memory.location;
  const hasEvent = !!memory.event;
  const hasTranscript = !!memory.transcript && memory.transcript.length > 10;
  const hasStory = memory.type === 'story' || (memory.description && memory.description.length > 30) || hasTranscript;
  const hasYear = !!memory.year;

  // WHO IS THIS?
  if (memory.type === 'photo' && hasPeople) {
    const mainPerson = people[0];
    const question = hasEvent && hasYear
      ? `In this ${memory.year} ${memory.event}, who is ${mainPerson}?`
      : hasEvent
      ? `In this ${memory.event} photo, who is ${mainPerson}?`
      : `Who is ${mainPerson} in this photo?`;

    activities.push({
      activityType: 'who_is_this',
      question: language === 'as' ? 'ফটোত এই ব্যক্তিজন কোনে?' :
                language === 'hi' ? 'फ़ोटो में यह व्यक्ति कौन है?' : question,
      correctAnswer: mainPerson,
      options: [mainPerson, 'I am not sure', 'A family friend', people.length > 1 ? people[1] : 'A relative'].sort(() => Math.random() - 0.5),
      explanation: `Based on caregiver-provided information: ${mainPerson}.`,
      sourceMemoryId: memory.id,
    });
  }

  // WHERE WAS THIS?
  if (memory.type === 'photo' && hasLocation) {
    const question = hasEvent
      ? `Where did this ${memory.event} take place?`
      : 'Where was this photo taken?';

    activities.push({
      activityType: 'where_was_this',
      question: language === 'as' ? 'এই ফটোত কেতে লোৱা হৈছিল?' :
                language === 'hi' ? 'यह फ़ोटो कहाँ ली गई थी?' : question,
      correctAnswer: memory.location!,
      options: [memory.location!, 'Guwahati', 'Shillong', 'Imphal'].sort(() => Math.random() - 0.5),
      explanation: `Caregiver specified location: ${memory.location}.`,
      sourceMemoryId: memory.id,
    });
  }

  // COMPLETE THE MEMORY
  if (hasStory) {
    const event = memory.event || memory.title;
    const location = memory.location || 'our home';
    const person = people.length > 0 ? people[0] : 'we';

    // Use transcript as story template if available
    let storyTemplate: string;
    if (hasTranscript) {
      // Build a fill-in-the-blank from the transcript
      const words = memory.transcript!.split(' ');
      if (words.length > 8) {
        // Remove a key phrase and make it a blank
        const blankStart = Math.floor(words.length / 3);
        const blankEnd = Math.min(blankStart + 3, words.length);
        const removedPhrase = words.slice(blankStart, blankEnd).join(' ');
        storyTemplate = words.slice(0, blankStart).join(' ') + ' ______ ' + words.slice(blankEnd).join(' ');
        activities.push({
          activityType: 'complete_the_memory',
          question: language === 'as' ? 'এই সোঁৱৰণটো সম্পূৰ্ণ কৰক:' :
                    language === 'hi' ? 'इस याद को पूरा करें:' : 'Complete this memory:',
          correctAnswer: removedPhrase,
          options: [removedPhrase, 'family gathering', 'the celebration', 'a wonderful day'].sort(() => Math.random() - 0.5),
          storyTemplate,
          storyBlanks: [removedPhrase],
          explanation: `Story based on transcribed family voice recording.`,
          sourceMemoryId: memory.id,
        });
      } else {
        // Transcript too short for blank — use it as-is
        storyTemplate = memory.transcript!;
        activities.push({
          activityType: 'complete_the_memory',
          question: language === 'as' ? 'এই সোঁৱৰণটো সম্পূৰ্ণ কৰক:' :
                    language === 'hi' ? 'इस याद को पूरा करें:' : 'Complete this memory:',
          correctAnswer: memory.transcript!,
          options: [memory.transcript!, 'family gathering', 'the celebration'].sort(() => Math.random() - 0.5),
          storyTemplate,
          storyBlanks: [memory.transcript!],
          explanation: `Story based on transcribed family voice recording.`,
          sourceMemoryId: memory.id,
        });
      }
    } else {
      storyTemplate = `${person} ${event.toLowerCase()}${hasYear ? ` in ${memory.year}` : ''} at ${location}. It was a memorable day because ${memory.whyImportant || 'of the warm family gathering'}.`;
      activities.push({
        activityType: 'complete_the_memory',
        question: language === 'as' ? 'এই সোঁৱৰণটো সম্পূৰ্ণ কৰক:' :
                  language === 'hi' ? 'इस याद को पूरा करें:' : 'Complete this memory:',
        correctAnswer: event,
        options: [event, memory.title, 'the festival', 'the celebration'].sort(() => Math.random() - 0.5),
        storyTemplate,
        storyBlanks: [event],
        explanation: `Story based on caregiver-provided description.`,
        sourceMemoryId: memory.id,
      });
    }
  }

  // WHAT HAPPENED NEXT?
  if (hasEvent || hasStory) {
    const event = memory.event || memory.title;
    const location = memory.location || 'our home';
    const person = people.length > 0 ? people[0] : 'we';

    const cards = [
      `${person} arrived at ${location}${hasYear ? ` in ${memory.year}` : ''}`,
      `We gathered together for the ${event.toLowerCase()}`,
      `The ${event.toLowerCase()} began`,
      `Everyone enjoyed the celebration`,
    ];

    activities.push({
      activityType: 'what_happened_next',
      question: language === 'as' ? 'এই ঘটনাবোৰ শুদ্ধ ক্ৰমত ৰাখক:' :
                language === 'hi' ? 'इन घटनाओं को सही क्रम में रखें:' : 'Put these events in the right order:',
      options: [],
      correctAnswer: cards.join(' -> '),
      sequenceCards: cards,
      explanation: `Sequence based on caregiver-provided event details.`,
      sourceMemoryId: memory.id,
    });
  }

  // WHOSE VOICE IS THIS?
  if (memory.type === 'audio' && memory.familyMember) {
    // If we have a transcript, also generate a COMPLETE THE MEMORY from the transcript content
    if (hasTranscript) {
      activities.push({
        activityType: 'whose_voice_is_this',
        question: language === 'as' ? 'এই কণ্ঠস্বৰটো কোৰ?' :
                  language === 'hi' ? 'यह किसकी आवाज़ है?' : 'Whose voice is this?',
        correctAnswer: memory.familyMember,
        options: [memory.familyMember, 'I am not sure', 'A family friend', 'A relative'].sort(() => Math.random() - 0.5),
        explanation: `Voice speaker identified by caregiver: ${memory.familyMember}. Transcript: "${memory.transcript!.slice(0, 100)}..."`,
        sourceMemoryId: memory.id,
      });
    } else {
      activities.push({
        activityType: 'whose_voice_is_this',
        question: language === 'as' ? 'এই কণ্ঠস্বৰটো কোৰ?' :
                  language === 'hi' ? 'यह किसकी आवाज़ है?' : 'Whose voice is this?',
        correctAnswer: memory.familyMember,
        options: [memory.familyMember, 'I am not sure', 'A family friend', 'A relative'].sort(() => Math.random() - 0.5),
        explanation: `Voice speaker identified by caregiver: ${memory.familyMember}.`,
        sourceMemoryId: memory.id,
      });
    }
  }

  return activities;
}

// ---- Mock Speech-to-Text ----
export function mockTranscribeAudio(
  _audioBuffer: Buffer,
  _filename: string,
  metadata?: {
    title?: string;
    speaker?: string;
    language?: string;
  }
): { transcript: string; language: string } {
  const lang = metadata?.language || 'en';
  const speaker = metadata?.speaker || 'family member';
  const title = metadata?.title || 'voice note';

  const transcripts: Record<string, string> = {
    en: `This is a voice recording from ${speaker}. They are sharing a memory about ${title}. I remember when we used to gather together as a family, and those were truly wonderful days. The laughter and warmth of those moments still brings me joy.`,
    as: `ইয়াটো ${speaker} ৰ এটা কণ্ঠ ৰেকৰ্ডিং। তেওঁ/তেওঁবোৰ ${title}ৰ বিষয়ে এটা সোঁৱৰণ শাখা ছেঁকাইছে। মোলোকে সেই দিনটোবোৰ মন কৰো, যেতিয়া আমি সকলে পৰিয়ালৰ সৈতে একত্ৰিত হোঁ। সেই দিনবোৰ সত্যিকাৰেই দয়ালূ আছিল।`,
    hi: `यह ${speaker} की आवाज़ की रिकॉर्डिंग है। वे ${title} के बारे में एक याद साझा कर रहे हैं। मुझे वो दिन याद हैं जब हम सब परिवार के साथ इकट्ठा होते थे, और वे सच में अद्भुत दिन थे।`,
  };

  return {
    transcript: transcripts[lang] || transcripts['en'],
    language: lang,
  };
}
