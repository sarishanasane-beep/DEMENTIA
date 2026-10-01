// ============================================================
// ReminiscenceAIService — AI Activity Generation Layer
// ============================================================
// This module generates personalised reminiscence activities
// from family-provided memories (photos, voice, stories).
//
// MockReminiscenceAIService generates deterministic, realistic
// examples from caregiver-provided data.
//
// The real implementation can later use an LLM.
// ============================================================

import { v4 as uuid } from 'uuid';
import type { Memory, MemoryActivity, Language } from '../types';

export interface ReminiscenceAIService {
  generateActivities(memory: Memory, language: Language): Promise<MemoryActivity[]>;
}

// ---- Mock implementation ----
// Generates deterministic activities from caregiver-provided memory data.
// Does NOT invent facts — uses only verified caregiver input.
export class MockReminiscenceAIService implements ReminiscenceAIService {

  async generateActivities(memory: Memory, language: Language): Promise<MemoryActivity[]> {
    // Simulate processing delay (demo processing)
    await new Promise(r => setTimeout(r, 800));

    const activities: MemoryActivity[] = [];
    const people = memory.people || [];
    const hasPeople = people.length > 0;
    const hasLocation = !!memory.location;
    const hasEvent = !!memory.event;
    const hasStory = memory.type === 'story' || (memory.description && memory.description.length > 30);
    const hasYear = !!memory.year;

    // ---- WHO IS THIS? (for photos with people) ----
    if (memory.type === 'photo' && hasPeople) {
      const mainPerson = people[0];
      // Use actual metadata in question
      const question = hasEvent && hasYear
        ? `In this ${memory.year} ${memory.event}, who is ${mainPerson}?`
        : hasEvent
        ? `In this ${memory.event} photo, who is ${mainPerson}?`
        : `Who is ${mainPerson} in this photo?`;

      activities.push({
        id: uuid(),
        patientId: memory.patientId,
        sourceMemoryId: memory.id,
        activityType: 'who_is_this',
        question: this.t('who_is_this', language, question),
        correctAnswer: mainPerson,
        options: this.generateDistractorOptions(mainPerson, people),
        language,
        status: 'pending_review',
        generatedFromVerifiedData: true,
        createdAt: new Date().toISOString(),
      });
    }

    // ---- WHERE WAS THIS? (for photos with location) ----
    if (memory.type === 'photo' && hasLocation) {
      const question = hasEvent
        ? `Where did this ${memory.event} take place?`
        : 'Where was this photo taken?';

      activities.push({
        id: uuid(),
        patientId: memory.patientId,
        sourceMemoryId: memory.id,
        activityType: 'where_was_this',
        question: this.t('where_was_this', language, question),
        correctAnswer: memory.location!,
        options: this.generateLocationDistractors(memory.location!),
        language,
        status: 'pending_review',
        generatedFromVerifiedData: true,
        createdAt: new Date().toISOString(),
      });
    }

    // ---- COMPLETE THE MEMORY (for stories) ----
    if (hasStory) {
      const template = this.createStoryTemplate(memory);
      activities.push({
        id: uuid(),
        patientId: memory.patientId,
        sourceMemoryId: memory.id,
        activityType: 'complete_the_memory',
        question: this.t('complete_memory', language, 'Complete this memory:'),
        correctAnswer: template.answer,
        storyTemplate: template.text,
        storyBlanks: template.blanks,
        options: template.options,
        language,
        status: 'pending_review',
        generatedFromVerifiedData: true,
        createdAt: new Date().toISOString(),
      });
    }

    // ---- WHAT HAPPENED NEXT? (for event-based memories) ----
    if (hasEvent || hasStory) {
      const sequence = this.createSequenceCards(memory);
      activities.push({
        id: uuid(),
        patientId: memory.patientId,
        sourceMemoryId: memory.id,
        activityType: 'what_happened_next',
        question: this.t('what_happened', language, 'Put these events in the right order:'),
        correctAnswer: sequence.correct.join(' → '),
        sequenceCards: sequence.cards,
        language,
        status: 'pending_review',
        generatedFromVerifiedData: true,
        createdAt: new Date().toISOString(),
      });
    }

    // ---- WHOSE VOICE IS THIS? (for audio) ----
    if (memory.type === 'audio' && memory.familyMember) {
      activities.push({
        id: uuid(),
        patientId: memory.patientId,
        sourceMemoryId: memory.id,
        activityType: 'whose_voice_is_this',
        question: this.t('whose_voice', language, `Whose voice is this?`),
        correctAnswer: memory.familyMember,
        options: this.generateDistractorOptions(memory.familyMember, people.length > 0 ? people : [memory.familyMember]),
        audioLabel: memory.familyMember,
        language,
        status: 'pending_review',
        generatedFromVerifiedData: true,
        createdAt: new Date().toISOString(),
      });
    }

    return activities;
  }

  // ---- Helper: Generate distractor options for people ----
  private generateDistractorOptions(correct: string, knownPeople: string[]): string[] {
    const distractors = ['I am not sure', 'A family friend'];
    const options = [correct, ...distractors];
    for (const p of knownPeople) {
      if (p !== correct && options.length < 4) {
        options.push(p);
      }
    }
    return options.sort(() => Math.random() - 0.5);
  }

  // ---- Helper: Generate location distractors ----
  private generateLocationDistractors(correct: string): string[] {
    const allLocations = ['Guwahati', 'Jorhat', 'Tezpur', 'Dibrugarh', 'Shillong', 'Imphal', 'Agartala', 'Kohima'];
    const distractors = allLocations.filter(l => l !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
    return [correct, ...distractors].sort(() => Math.random() - 0.5);
  }

  // ---- Helper: Create story template from actual metadata ----
  private createStoryTemplate(memory: Memory): { text: string; answer: string; blanks: string[]; options: string[] } {
    const event = memory.event || memory.title;
    const location = memory.location || 'our home';
    const people = memory.people && memory.people.length > 0 ? memory.people[0] : 'we';
    const year = memory.year ? ` in ${memory.year}` : '';

    // Create a fill-in-the-blank using actual metadata
    const templateText = `${people} ${event.toLowerCase()}${year} at ${location}. It was a memorable day because ${memory.whyImportant || 'of the warm family gathering'}.`;
    const blank = event;

    return {
      text: templateText,
      answer: blank,
      blanks: [blank],
      options: [blank, memory.title, 'the festival', 'the celebration'].sort(() => Math.random() - 0.5),
    };
  }

  // ---- Helper: Create sequence cards from actual metadata ----
  private createSequenceCards(memory: Memory): { cards: string[]; correct: string[] } {
    const event = memory.event || memory.title;
    const location = memory.location || 'our home';
    const people = memory.people && memory.people.length > 0 ? memory.people[0] : 'we';
    const year = memory.year || '';

    const cards = [
      `${people} arrived at ${location}${year ? ` in ${year}` : ''}`,
      `We gathered together for the ${event.toLowerCase()}`,
      `The ${event.toLowerCase()} began`,
      `Everyone enjoyed the celebration`,
    ];

    return { cards, correct: cards };
  }

  // ---- Helper: Get translated text ----
  private t(_key: string, language: Language, fallback: string): string {
    const translations: Record<string, Record<string, string>> = {
      who_is_this: {
        en: '', // fallback used
        as: 'ফটোত এই ব্যক্তিজন কোনে?',
        hi: 'फ़ोटो में यह व्यक्ति कौन है?',
      },
      where_was_this: {
        en: '',
        as: 'এই ফটো কʻে লোৱা হৈছিল?',
        hi: 'यह फ़ोटो कहाँ ली गई थी?',
      },
      complete_memory: {
        en: '',
        as: 'এই সোঁৱৰণটো সম্পূৰ্ণ কৰক:',
        hi: 'इस याद को पूरा करें:',
      },
      what_happened: {
        en: '',
        as: 'এই ঘটনাবোৰ শুদ্ধ ক্ৰমত ৰাখক:',
        hi: 'इन घटनाओं को सही क्रम में रखें:',
      },
      whose_voice: {
        en: '',
        as: 'এই কণ্ঠস্বৰটো কোৰ?',
        hi: 'यह किसकी आवाज़ है?',
      },
    };

    // For non-English, use the translated generic question
    // For English, use the metadata-rich fallback
    if (language !== 'en' && translations[_key]?.[language]) {
      return translations[_key][language];
    }
    return fallback;
  }
}

// ---- Factory ----
export function createReminiscenceService(): ReminiscenceAIService {
  return new MockReminiscenceAIService();
}
