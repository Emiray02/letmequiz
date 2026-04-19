export type StudyGlossaryItem = {
  term: string;
  definition: string;
  example: string;
};

export type StudyQuizQuestion = {
  question: string;
  options: [string, string, string, string];
  answerIndex: number;
  explanation: string;
};

export type StudyTimelineItem = {
  label: string;
  detail: string;
};

export type StudyCitation = {
  quote: string;
  source: string;
};

export type StudyToolkit = {
  title: string;
  conciseSummary: string;
  deepSummary: string;
  keyInsights: string[];
  glossary: StudyGlossaryItem[];
  flashcards: Array<{
    term: string;
    definition: string;
  }>;
  quiz: StudyQuizQuestion[];
  studyGuide: {
    memorizeFirst: string[];
    commonTraps: string[];
    examStylePrompts: string[];
  };
  citations: StudyCitation[];
  timeline: StudyTimelineItem[];
  writingPrompts: string[];
};

export type AiSourceFile = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  extractedChars: number;
};

export type WorkbenchResponse = {
  source: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    extractedChars: number;
    usedAiModel: string;
  };
  toolkit: StudyToolkit;
};

export type AiWorkbenchSuccessResponse = {
  ok: true;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  extractedChars: number;
  sourceFiles: AiSourceFile[];
  sourceBundle: string;
  toolkit: StudyToolkit;
  warnings: string[];
  usedAiModel: string;
};

export type AiWorkbenchErrorResponse = {
  ok: false;
  errorMessage: string;
};

export type AiWorkbenchResponse = AiWorkbenchSuccessResponse | AiWorkbenchErrorResponse;

export type AiSourceChatSuccessResponse = {
  ok: true;
  answer: string;
  citations: StudyCitation[];
  usedAiModel: string;
};

export type AiSourceChatErrorResponse = {
  ok: false;
  errorMessage: string;
};

export type AiSourceChatResponse = AiSourceChatSuccessResponse | AiSourceChatErrorResponse;
