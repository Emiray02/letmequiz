export type VocabularyTechniqueProfile = {
  keyword: string;
  mnemonicStory: string;
  memoryPalaceCue: string;
  contextSentence: string;
  sentencePatternOne: string;
  sentencePatternTwo: string;
  sentencePatternThree: string;
  sitcomClipNote: string;
  contrastWord: string;
  morphologyNote: string;
  pronunciationTip: string;
  updatedAt: string;
};

export type VocabularyTechniqueMap = Record<string, VocabularyTechniqueProfile>;

export type VocabularyCoverage = {
  keywordCoverage: number;
  mnemonicCoverage: number;
  contextCoverage: number;
  memoryPalaceCoverage: number;
  strongCards: number;
};
