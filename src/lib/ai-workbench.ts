import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { z } from "zod";
import type { StudyCitation, StudyToolkit } from "@/types/ai";

const maxUploadBytes = 8 * 1024 * 1024;
const maxSourceChars = 28_000;
const maxCombinedSourceChars = 60_000;

const toolkitSchema = z.object({
  title: z.string().min(2).max(180),
  conciseSummary: z.string().min(20).max(1200),
  deepSummary: z.string().min(40).max(6000),
  keyInsights: z.array(z.string().min(3).max(400)).min(4).max(12),
  glossary: z
    .array(
      z.object({
        term: z.string().min(1).max(120),
        definition: z.string().min(1).max(600),
        example: z.string().min(1).max(600),
      })
    )
    .min(4)
    .max(30),
  flashcards: z
    .array(
      z.object({
        term: z.string().min(1).max(200),
        definition: z.string().min(1).max(900),
      })
    )
    .min(6)
    .max(80),
  quiz: z
    .array(
      z.object({
        question: z.string().min(6).max(700),
        options: z.tuple([
          z.string().min(1).max(240),
          z.string().min(1).max(240),
          z.string().min(1).max(240),
          z.string().min(1).max(240),
        ]),
        answerIndex: z.number().int().min(0).max(3),
        explanation: z.string().min(2).max(600),
      })
    )
    .min(4)
    .max(24),
  studyGuide: z.object({
    memorizeFirst: z.array(z.string().min(3).max(400)).min(3).max(16),
    commonTraps: z.array(z.string().min(3).max(400)).min(3).max(16),
    examStylePrompts: z.array(z.string().min(3).max(400)).min(4).max(16),
  }),
  citations: z
    .array(
      z.object({
        quote: z.string().min(6).max(320),
        source: z.string().min(2).max(220),
      })
    )
    .min(2)
    .max(20),
  timeline: z
    .array(
      z.object({
        label: z.string().min(2).max(140),
        detail: z.string().min(2).max(500),
      })
    )
    .min(3)
    .max(16),
  writingPrompts: z.array(z.string().min(4).max(500)).min(4).max(20),
});

const sourceChatSchema = z.object({
  answer: z.string().min(20).max(3000),
  citations: z
    .array(
      z.object({
        quote: z.string().min(6).max(320),
        source: z.string().min(2).max(220),
      })
    )
    .min(1)
    .max(10),
});

type ExtractedSource = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  text: string;
  warnings: string[];
};

type GeneratedToolkit = {
  toolkit: StudyToolkit;
  usedAiModel: string;
};

type SourceAnswer = {
  answer: string;
  citations: StudyCitation[];
  usedAiModel: string;
};

type SourceSegment = {
  source: string;
  text: string;
};

function buildUserPrompt(sourceText: string): string {
  return [
    "Create a NotebookLM-style study toolkit for this source.",
    "Return JSON with keys:",
    "title, conciseSummary, deepSummary, keyInsights, glossary, flashcards, quiz, studyGuide, citations, timeline, writingPrompts",
    "Rules:",
    "- glossary item: term, definition, example",
    "- quiz item: question, options (exactly 4), answerIndex (0-3), explanation",
    "- studyGuide: memorizeFirst, commonTraps, examStylePrompts",
    "- citations item: quote, source",
    "- citations must cite short exact snippets from uploaded sources",
    "- keep flashcards between 10 and 40 if possible",
    "- keep quiz between 6 and 15 if possible",
    "Source:\n" + sourceText,
  ].join("\n");
}

function buildChatPrompt(sourceText: string, question: string): string {
  return [
    "Answer the student's question strictly based on these sources.",
    "Return JSON with keys: answer, citations",
    "Rules:",
    "- answer should be concise but complete",
    "- citations array items must have quote and source",
    "- quote should be a short exact snippet from sources",
    "Question:",
    question,
    "Sources:\n" + sourceText,
  ].join("\n");
}

function splitSourceSegments(sourceText: string): SourceSegment[] {
  const chunks = sourceText
    .split("\n\n---\n\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (chunks.length === 0) {
    return [{ source: "Uploaded source", text: sourceText }];
  }

  return chunks.map((chunk) => {
    const match = chunk.match(/^\[SOURCE:\s*(.+?)\]\n([\s\S]*)$/);
    if (!match) {
      return {
        source: "Uploaded source",
        text: chunk,
      };
    }

    return {
      source: match[1].trim(),
      text: match[2].trim(),
    };
  });
}

function buildCitationsFromSource(sourceText: string, limit = 5): StudyCitation[] {
  const segments = splitSourceSegments(sourceText);
  const citations: StudyCitation[] = [];

  for (const segment of segments) {
    const picks = splitSentences(segment.text).slice(0, 2);
    for (const sentence of picks) {
      if (citations.length >= limit) {
        return citations;
      }

      citations.push({
        quote: sentence.slice(0, 300),
        source: segment.source,
      });
    }
  }

  if (citations.length === 0) {
    return [
      {
        quote: sourceText.slice(0, 280),
        source: "Uploaded source",
      },
    ];
  }

  return citations;
}

function parseToolkitFromModelResponse(content: string, sourceText: string): StudyToolkit {
  const parsedJson = extractJsonBlock(content);
  const parsed = JSON.parse(parsedJson) as Partial<StudyToolkit>;

  if (!parsed.citations || parsed.citations.length === 0) {
    parsed.citations = buildCitationsFromSource(sourceText, 6);
  }

  return toolkitSchema.parse(parsed);
}

function parseSourceAnswerFromModel(content: string, sourceText: string): SourceAnswer {
  const parsedJson = extractJsonBlock(content);
  const parsed = JSON.parse(parsedJson) as {
    answer?: string;
    citations?: StudyCitation[];
  };

  if (!parsed.citations || parsed.citations.length === 0) {
    parsed.citations = buildCitationsFromSource(sourceText, 4);
  }

  const validated = sourceChatSchema.parse(parsed);
  return {
    answer: validated.answer,
    citations: validated.citations,
    usedAiModel: "model-response",
  };
}

function cleanText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function withBoundedLength(text: string): string {
  if (text.length <= maxSourceChars) {
    return text;
  }

  return `${text.slice(0, maxSourceChars)}\n\n[TRUNCATED_SOURCE]`;
}

function getExtension(fileName: string): string {
  const chunks = fileName.toLowerCase().split(".");
  return chunks.length >= 2 ? chunks[chunks.length - 1] : "";
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 18);
}

function firstMeaningfulLine(text: string): string {
  const line = text
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.length >= 4);
  return line ?? "AI Study Source";
}

function buildFallbackToolkit(text: string): StudyToolkit {
  const sentences = splitSentences(text);
  const sourceLines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12);

  const topSentences = (sentences.length ? sentences : sourceLines).slice(0, 12);
  if (topSentences.length === 0) {
    topSentences.push(text.slice(0, 220));
  }

  const pairCandidates = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes(":"))
    .map((line) => {
      const splitAt = line.indexOf(":");
      const left = line.slice(0, splitAt).trim();
      const right = line.slice(splitAt + 1).trim();
      return { left, right };
    })
    .filter((item) => item.left.length > 1 && item.left.length <= 120 && item.right.length > 2)
    .slice(0, 26);

  const flashcards = pairCandidates.length
    ? pairCandidates.map((item) => ({
        term: item.left,
        definition: item.right,
      }))
    : topSentences.slice(0, 16).map((sentence, index) => ({
        term: `Concept ${index + 1}`,
        definition: sentence,
      }));

  while (flashcards.length < 12) {
    const source = topSentences[flashcards.length % topSentences.length] ?? text;
    flashcards.push({
      term: `Concept ${flashcards.length + 1}`,
      definition: source,
    });
  }

  const glossary = flashcards.slice(0, 14).map((card) => ({
    term: card.term,
    definition: card.definition,
    example: `Use "${card.term}" when explaining: ${card.definition.slice(0, 120)}.`,
  }));

  while (glossary.length < 6) {
    const anchor = flashcards[glossary.length % flashcards.length];
    glossary.push({
      term: anchor.term,
      definition: anchor.definition,
      example: `Create a sentence that uses ${anchor.term} correctly.`,
    });
  }

  const quiz = flashcards.slice(0, Math.min(10, flashcards.length)).map((card, index) => {
    const distractors = flashcards
      .filter((candidate) => candidate.term !== card.term)
      .slice(index, index + 3)
      .map((candidate) => candidate.definition);

    while (distractors.length < 3) {
      distractors.push(`Not directly related to ${card.term}`);
    }

    const options = [card.definition, ...distractors].slice(0, 4) as [string, string, string, string];
    return {
      question: `Which explanation best matches ${card.term}?`,
      options,
      answerIndex: 0,
      explanation: `${card.term} is best described by the first option.`,
    };
  });

  while (quiz.length < 6) {
    const card = flashcards[quiz.length % flashcards.length];
    quiz.push({
      question: `What is the closest meaning of ${card.term}?`,
      options: [
        card.definition,
        `Unrelated detail about ${card.term}`,
        `Opposite interpretation of ${card.term}`,
        `A random statement not tied to ${card.term}`,
      ],
      answerIndex: 0,
      explanation: `${card.term} maps to the first option.`,
    });
  }

  const timelineMatches = text.match(/\b(19|20)\d{2}\b/g) ?? [];
  const timeline = timelineMatches.slice(0, 8).map((year, index) => ({
    label: year,
    detail: topSentences[index] ?? `Important development related to ${year}.`,
  }));

  const preparedTimeline = timeline.length
    ? timeline
    : topSentences.slice(0, 5).map((item, index) => ({
        label: `Phase ${index + 1}`,
        detail: item,
      }));

  while (preparedTimeline.length < 4) {
    preparedTimeline.push({
      label: `Phase ${preparedTimeline.length + 1}`,
      detail: topSentences[preparedTimeline.length % topSentences.length],
    });
  }

  const keyInsights = topSentences.slice(0, 8);
  while (keyInsights.length < 5) {
    keyInsights.push(flashcards[keyInsights.length % flashcards.length].definition.slice(0, 180));
  }

  const citations = buildCitationsFromSource(text, 6);

  return {
    title: firstMeaningfulLine(text).slice(0, 120),
    conciseSummary: topSentences.slice(0, 3).join(" "),
    deepSummary: topSentences.slice(0, 10).join(" "),
    keyInsights,
    glossary,
    flashcards,
    quiz,
    studyGuide: {
      memorizeFirst: flashcards.slice(0, 6).map((item) => `${item.term}: ${item.definition.slice(0, 120)}`),
      commonTraps: [
        "Do not only reread summaries; force active recall.",
        "Confusing similar terms is common; contrast them explicitly.",
        "Skipping context examples weakens retention.",
      ],
      examStylePrompts: [
        "Explain the topic to a beginner in 5 bullet points.",
        "Write one short-answer question and answer it.",
        "Compare two key concepts from the source.",
        "Identify one misconception and correct it with evidence.",
      ],
    },
    citations,
    timeline: preparedTimeline,
    writingPrompts: [
      "Write a concise summary in your own words.",
      "Create an analogy for the hardest concept.",
      "Draft a mini-essay connecting three key terms.",
      "Generate two exam questions based on the source.",
    ],
  };
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw;
}

async function generateWithOpenRouter(sourceText: string): Promise<GeneratedToolkit> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing.");
  }

  const selectedModel = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://letmequiz.local",
      "X-Title": "LetMeQuiz AI Workbench",
    },
    body: JSON.stringify({
      model: selectedModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You transform source documents into high-quality study toolkits. Return only valid JSON that matches the required schema. Avoid markdown, avoid extra keys, and keep output factual to the source.",
        },
        {
          role: "user",
          content: buildUserPrompt(sourceText),
        },
      ],
    }),
  });

  if (!response.ok) {
    const reason = await response.text();
    throw new Error(`OpenRouter error: ${reason}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter returned empty content.");
  }

  const toolkit = parseToolkitFromModelResponse(content, sourceText);

  return {
    toolkit,
    usedAiModel: selectedModel,
  };
}

async function generateWithOpenAI(sourceText: string): Promise<GeneratedToolkit> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const selectedModel = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: selectedModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You transform source documents into high-quality study toolkits. Return only valid JSON that matches the required schema. Avoid markdown, avoid extra keys, and keep output factual to the source.",
        },
        {
          role: "user",
          content: buildUserPrompt(sourceText),
        },
      ],
    }),
  });

  if (!response.ok) {
    const reason = await response.text();
    throw new Error(`OpenAI error: ${reason}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned empty content.");
  }

  const toolkit = parseToolkitFromModelResponse(content, sourceText);

  return {
    toolkit,
    usedAiModel: selectedModel,
  };
}

async function answerWithOpenRouter(sourceText: string, question: string): Promise<SourceAnswer> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing.");
  }

  const selectedModel = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://letmequiz.local",
      "X-Title": "LetMeQuiz Source Chat",
    },
    body: JSON.stringify({
      model: selectedModel,
      temperature: 0.15,
      messages: [
        {
          role: "system",
          content:
            "You answer questions from sources. Return only valid JSON with keys answer and citations. Keep citations exact and grounded in the provided source.",
        },
        {
          role: "user",
          content: buildChatPrompt(sourceText, question),
        },
      ],
    }),
  });

  if (!response.ok) {
    const reason = await response.text();
    throw new Error(`OpenRouter chat error: ${reason}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter chat returned empty content.");
  }

  const parsed = parseSourceAnswerFromModel(content, sourceText);
  return {
    ...parsed,
    usedAiModel: selectedModel,
  };
}

async function answerWithOpenAI(sourceText: string, question: string): Promise<SourceAnswer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const selectedModel = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: selectedModel,
      temperature: 0.15,
      messages: [
        {
          role: "system",
          content:
            "You answer questions from sources. Return only valid JSON with keys answer and citations. Keep citations exact and grounded in the provided source.",
        },
        {
          role: "user",
          content: buildChatPrompt(sourceText, question),
        },
      ],
    }),
  });

  if (!response.ok) {
    const reason = await response.text();
    throw new Error(`OpenAI chat error: ${reason}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI chat returned empty content.");
  }

  const parsed = parseSourceAnswerFromModel(content, sourceText);
  return {
    ...parsed,
    usedAiModel: selectedModel,
  };
}

export async function extractTextFromFile(file: File): Promise<ExtractedSource> {
  const warnings: string[] = [];

  if (file.size <= 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (file.size > maxUploadBytes) {
    throw new Error("File is too large. Maximum size is 8 MB.");
  }

  const extension = getExtension(file.name);
  let extractedText = "";

  if (file.type.includes("pdf") || extension === "pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      extractedText = parsed.text;
    } finally {
      await parser.destroy();
    }
  } else if (
    file.type.includes("word") ||
    file.type.includes("officedocument") ||
    extension === "docx"
  ) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await mammoth.extractRawText({ buffer });
    extractedText = parsed.value;
    if (parsed.messages.length > 0) {
      warnings.push("DOCX conversion produced non-critical parser messages.");
    }
  } else {
    extractedText = await file.text();
  }

  const cleaned = withBoundedLength(cleanText(extractedText));
  if (cleaned.length < 40) {
    throw new Error("Not enough readable text extracted from file.");
  }

  return {
    fileName: file.name,
    mimeType: file.type || extension || "unknown",
    sizeBytes: file.size,
    text: cleaned,
    warnings,
  };
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n\n[TRUNCATED_SOURCE_BUNDLE]`;
}

export function buildSourceBundle(extractions: Array<Pick<ExtractedSource, "fileName" | "text">>): string {
  const joined = extractions
    .map((item) => `[SOURCE: ${item.fileName}]\n${item.text}`)
    .join("\n\n---\n\n");

  return truncateText(joined, maxCombinedSourceChars);
}

function fallbackSourceAnswer(sourceText: string, question: string): SourceAnswer {
  const normalizedTerms = question
    .toLocaleLowerCase("en-US")
    .split(/[^a-z0-9]+/)
    .filter((item) => item.length >= 4)
    .slice(0, 8);

  const segments = splitSourceSegments(sourceText);
  const citations: StudyCitation[] = [];

  for (const segment of segments) {
    for (const sentence of splitSentences(segment.text)) {
      const normalizedSentence = sentence.toLocaleLowerCase("en-US");
      const matches = normalizedTerms.some((term) => normalizedSentence.includes(term));
      if (matches) {
        citations.push({
          quote: sentence.slice(0, 300),
          source: segment.source,
        });
      }

      if (citations.length >= 5) {
        break;
      }
    }

    if (citations.length >= 5) {
      break;
    }
  }

  const selected = citations.length ? citations : buildCitationsFromSource(sourceText, 4);
  const answer = selected.length
    ? [
        "Based on your uploaded sources, these points best answer your question:",
        ...selected.slice(0, 4).map((item) => `- ${item.quote}`),
      ].join("\n")
    : "The uploaded sources do not contain enough explicit context to answer this precisely.";

  return {
    answer,
    citations: selected,
    usedAiModel: "heuristic-source-chat",
  };
}

export async function answerQuestionFromSource(
  sourceText: string,
  question: string
): Promise<SourceAnswer> {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  if (hasOpenAI) {
    try {
      return await answerWithOpenAI(sourceText, question);
    } catch (error) {
      console.warn("OpenAI source chat failed, trying next provider.", error);
    }
  }

  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  if (hasOpenRouter) {
    try {
      return await answerWithOpenRouter(sourceText, question);
    } catch (error) {
      console.warn("OpenRouter source chat failed, using heuristic fallback.", error);
    }
  }

  return fallbackSourceAnswer(sourceText, question);
}

export async function generateStudyToolkitFromSource(sourceText: string): Promise<GeneratedToolkit> {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  if (hasOpenAI) {
    try {
      return await generateWithOpenAI(sourceText);
    } catch (error) {
      console.warn("OpenAI generation failed, trying next provider.", error);
    }
  }

  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  if (hasOpenRouter) {
    try {
      return await generateWithOpenRouter(sourceText);
    } catch (error) {
      console.warn("OpenRouter generation failed, using heuristic fallback.", error);
    }
  }

  return {
    toolkit: buildFallbackToolkit(sourceText),
    usedAiModel: hasOpenAI || hasOpenRouter ? "heuristic-fallback" : "heuristic-local",
  };
}
