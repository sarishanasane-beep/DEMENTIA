// ============================================================
// Scoring Utilities — Reusable game scoring functions
// ============================================================
// All scores normalized to 0–100.
// These are activity performance scores, NOT medical scores.
// ============================================================

/**
 * Score by accuracy: correct / total * 100
 */
export function scoreByAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Score by sequence: how many items are in correct position
 */
export function scoreBySequence(studentOrder: string[], correctOrder: string[]): number {
  if (correctOrder.length === 0) return 0;
  let correctPositions = 0;
  for (let i = 0; i < correctOrder.length; i++) {
    if (studentOrder[i] === correctOrder[i]) correctPositions++;
  }
  return Math.round((correctPositions / correctOrder.length) * 100);
}

/**
 * Score by recall: items recalled / items shown * 100
 */
export function scoreByRecall(recalled: number, shown: number): number {
  if (shown === 0) return 0;
  return Math.round((recalled / shown) * 100);
}

/**
 * Score by response count: valid responses / expected * 100
 */
export function scoreByResponseCount(responses: number, expected: number): number {
  if (expected === 0) return 0;
  return Math.min(100, Math.round((responses / expected) * 100));
}

/**
 * Get performance label (not medical)
 */
export function getPerformanceLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Keep trying';
}

/**
 * Get encouraging message
 */
export function getEncouragingMessage(score: number): string {
  if (score >= 80) return 'Wonderful! You remembered perfectly.';
  if (score >= 60) return 'Good effort! Let\'s continue.';
  if (score >= 40) return 'Nice try. Every practice helps.';
  return 'Let\'s try that together. You\'re doing well.';
}
