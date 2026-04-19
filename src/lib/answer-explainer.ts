type ExplanationInput = {
  prompt: string;
  correctAnswer: string;
  selectedAnswer?: string;
  timedOut?: boolean;
};

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[.,!?;:()\[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((item) => item.length >= 3)
  );
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.max(a.size, b.size);
}

export function buildWrongAnswerExplanation(input: ExplanationInput): string {
  if (input.timedOut) {
    return "Time management issue detected. Read the stem first, then scan options for key constraints before picking.";
  }

  const selected = input.selectedAnswer?.trim() || "";
  if (!selected) {
    return "No option was selected. Use elimination: remove two obviously unrelated options, then compare the remaining two.";
  }

  const promptTokens = tokens(input.prompt);
  const correctTokens = tokens(input.correctAnswer);
  const selectedTokens = tokens(selected);

  const selectedVsCorrect = overlapRatio(selectedTokens, correctTokens);
  const selectedVsPrompt = overlapRatio(selectedTokens, promptTokens);
  const correctVsPrompt = overlapRatio(correctTokens, promptTokens);

  if (selectedVsCorrect < 0.2 && correctVsPrompt > selectedVsPrompt) {
    return "The chosen option is weakly connected to the target concept. Focus on the core cue in the prompt and match it to the most direct definition.";
  }

  if (selectedVsCorrect >= 0.2 && selectedVsCorrect < 0.55) {
    return "Your choice is partially related but misses a key detail. Recheck time/place/intent words that disambiguate similar options.";
  }

  return "This is a close distractor. When options look similar, verify which one answers the exact question wording, not just a related idea.";
}

export function buildRecoveryTip(prompt: string): string {
  const shortPrompt = prompt.trim().slice(0, 72);
  return `Create one mini drill for: ${shortPrompt}. Repeat after 24h and again after 72h.`;
}
