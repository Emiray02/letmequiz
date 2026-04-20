import { NextRequest, NextResponse } from "next/server";
import { detectLanguage } from "@/lib/language-detect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Skill = "schreiben" | "sprechen" | "lesen" | "hoeren";

type FeedbackBody = {
  skill: Skill;
  text: string;
  prompt?: string;
  level?: string; // CEFR
  provider?: string;
};

type Correction = {
  wrong: string;
  right: string;
  reason: string;
  category: "grammatik" | "wortschatz" | "rechtschreibung" | "stil" | "andere";
};

type FeedbackResponse = {
  detectedLanguage: ReturnType<typeof detectLanguage>;
  corrections: Correction[];
  rewrittenText: string;
  scores: { grammatik: number; wortschatz: number; aufgabe: number; stil: number; gesamt: number };
  tips: string[];
  vocabSuggestions: { word: string; meaning: string; example: string }[];
  usedAiModel: string;
};

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function buildPrompt(body: FeedbackBody, lang: string): string {
  return [
    `You are a strict but encouraging German language tutor (CEFR ${body.level ?? "A2"}).`,
    `Student is preparing for ${body.provider ?? "telc/Goethe"}.`,
    `Skill being practiced: ${body.skill}.`,
    `Detected language of student's response: ${lang}.`,
    body.prompt ? `Original task prompt was:\n${body.prompt}` : "",
    `Student response:\n${body.text}`,
    "",
    "Return ONLY valid JSON matching this TypeScript type (no markdown, no commentary):",
    "{",
    '  "corrections": Array<{ "wrong": string, "right": string, "reason": string, "category": "grammatik"|"wortschatz"|"rechtschreibung"|"stil"|"andere" }>,',
    '  "rewrittenText": string,  // German, fluent, level-appropriate',
    '  "scores": { "grammatik": 0-100, "wortschatz": 0-100, "aufgabe": 0-100, "stil": 0-100, "gesamt": 0-100 },',
    '  "tips": string[],         // 3-6 short Turkish tips for the student',
    '  "vocabSuggestions": Array<{ "word": string, "meaning": string, "example": string }>',
    "}",
    "Rules:",
    "- All `reason` and `tips` must be in Turkish.",
    "- All `wrong`/`right`/`example`/`rewrittenText` must be in German.",
    "- If student wrote Turkish, treat it as 'wanted to say' and translate to German in rewrittenText, then list corrections as if they had attempted it in German.",
    "- Provide at most 12 corrections; pick the most impactful.",
    "- vocabSuggestions: 3-6 useful words at the same CEFR level.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function callOpenAI(body: FeedbackBody, lang: string): Promise<FeedbackResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a precise German tutor. Return only valid JSON. Tips and reasons in Turkish; corrections and rewritten text in German.",
        },
        { role: "user", content: buildPrompt(body, lang) },
      ],
    }),
  });
  if (!res.ok) return null;
  const payload = await res.json();
  const content: unknown = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  try {
    const parsed = JSON.parse(content);
    return {
      detectedLanguage: detectLanguage(body.text),
      corrections: Array.isArray(parsed.corrections) ? parsed.corrections.slice(0, 12) : [],
      rewrittenText: typeof parsed.rewrittenText === "string" ? parsed.rewrittenText : "",
      scores: {
        grammatik: clampScore(parsed.scores?.grammatik),
        wortschatz: clampScore(parsed.scores?.wortschatz),
        aufgabe: clampScore(parsed.scores?.aufgabe),
        stil: clampScore(parsed.scores?.stil),
        gesamt: clampScore(parsed.scores?.gesamt),
      },
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 8) : [],
      vocabSuggestions: Array.isArray(parsed.vocabSuggestions)
        ? parsed.vocabSuggestions.slice(0, 8)
        : [],
      usedAiModel: model,
    };
  } catch {
    return null;
  }
}

function heuristicFeedback(body: FeedbackBody): FeedbackResponse {
  const det = detectLanguage(body.text);
  const corrections: Correction[] = [];

  // Common A1/A2 patterns to check.
  const text = body.text;
  const checks: { pattern: RegExp; right: string; reason: string; category: Correction["category"] }[] = [
    { pattern: /\bich bin (\d+) Jahre? alt\b/i, right: "ich bin $1 Jahre alt", reason: "Sayıdan sonra 'Jahre' (çoğul) gelir.", category: "grammatik" },
    { pattern: /\bich gehe in die Schule\b/i, right: "ich gehe zur Schule", reason: "Okula gitmek için 'zur Schule' kalıbı kullanılır.", category: "stil" },
    { pattern: /\bich möchte ein bier\b/i, right: "Ich möchte ein Bier", reason: "Almanca'da isimler büyük harfle başlar.", category: "rechtschreibung" },
    { pattern: /\bich liebe dir\b/i, right: "Ich liebe dich", reason: "lieben fiili Akkusativ alır: dich.", category: "grammatik" },
    { pattern: /\bweil ich bin\b/i, right: "weil ich bin → weil ich … bin", reason: "weil yan cümlesinde fiil sona gider.", category: "grammatik" },
  ];
  for (const c of checks) {
    const match = text.match(c.pattern);
    if (match) {
      corrections.push({
        wrong: match[0],
        right: c.right.replace("$1", match[1] ?? ""),
        reason: c.reason,
        category: c.category,
      });
    }
  }

  // Lowercase nouns (very rough): word starting lowercase after period? Skip — too noisy.

  const len = text.trim().split(/\s+/).filter(Boolean).length;
  const baseGrammar = Math.max(40, 95 - corrections.length * 10);
  const baseVocab = Math.min(100, 50 + Math.min(30, Math.round(len / 3)));

  return {
    detectedLanguage: det,
    corrections,
    rewrittenText:
      det.lang === "tr"
        ? "(AI kapalı — Türkçe yazdın. Almanca cevap için OPENAI_API_KEY ekle.)"
        : text,
    scores: {
      grammatik: baseGrammar,
      wortschatz: baseVocab,
      aufgabe: Math.min(100, len >= 30 ? 75 : 50),
      stil: 60,
      gesamt: Math.round((baseGrammar + baseVocab + 60) / 3),
    },
    tips: [
      "AI anahtarı tanımlı değil — yerel sezgisel kontroller çalışıyor.",
      "Daha iyi geri bildirim için OPENAI_API_KEY ekle.",
      det.lang === "tr"
        ? "Cevabını Almanca yazmaya çalış; sistem Türkçe yazdığını fark etti."
        : "Yan cümlelerde fiilin sonda olduğundan emin ol (weil/dass).",
      "İsimleri büyük harfle başlat (Substantive groß).",
    ],
    vocabSuggestions: [],
    usedAiModel: "heuristic-local",
  };
}

export async function POST(req: NextRequest) {
  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  if (body.text.length > 6000) {
    return NextResponse.json({ error: "text too long" }, { status: 413 });
  }

  const det = detectLanguage(body.text);
  const ai = await callOpenAI(body, det.lang).catch(() => null);
  const result = ai ?? heuristicFeedback(body);
  return NextResponse.json(result);
}
