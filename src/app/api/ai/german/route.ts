import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Task =
  | "konjugieren"
  | "deklinieren"
  | "doctor"
  | "wortfamilie"
  | "rollenspiel"
  | "news-summary";

type Body = {
  task: Task;
  input: Record<string, unknown>;
};

const SYSTEM = "You are a precise German language assistant. Always return strict JSON, no markdown, no commentary.";

function prompt(task: Task, input: Record<string, unknown>): string {
  switch (task) {
    case "konjugieren":
      return [
        `Conjugate the German verb "${input.verb}".`,
        `Return JSON:`,
        `{ "infinitiv": string, "partizipII": string, "praeteritum_ich": string, "auxiliary": "haben"|"sein", "isSeparable": boolean, "praesens": { "ich":..., "du":..., "er_sie_es":..., "wir":..., "ihr":..., "sie_Sie":... }, "praeteritum": {same keys}, "perfekt": {same keys with full "ich habe gemacht" form}, "imperativ": { "du":..., "ihr":..., "Sie":... }, "trMeaning": string }`,
        `All verb forms in German. trMeaning in Turkish.`,
      ].join("\n");
    case "deklinieren":
      return [
        `Decline the German noun "${input.noun}" (article: ${input.article ?? "?"}).`,
        `Return JSON:`,
        `{ "noun": string, "article": "der"|"die"|"das", "plural": string, "trMeaning": string,`,
        `  "singular": { "nom": "der Hund", "akk": "den Hund", "dat": "dem Hund", "gen": "des Hundes" },`,
        `  "plural_decl": { "nom": "die Hunde", "akk": "die Hunde", "dat": "den Hunden", "gen": "der Hunde" },`,
        `  "tip": "1-2 sentence Turkish memory tip" }`,
      ].join("\n");
    case "doctor":
      return [
        `Analyze the following German sentence for grammar, structure and naturalness.`,
        `Sentence: "${input.sentence}"`,
        `CEFR level: ${input.level ?? "B1"}`,
        `Return JSON:`,
        `{ "isCorrect": boolean, "corrected": string, "structure": [{"part": string, "role": "subjekt"|"verb"|"objekt"|"adverbial"|"konjunktion"|"andere", "case": "nom"|"akk"|"dat"|"gen"|null}],`,
        `  "issues": [{"type":"grammar"|"word-order"|"case"|"agreement"|"vocabulary"|"style", "explanationTr": string, "fix": string}],`,
        `  "alternatives": [{"text": string, "register": "formell"|"informell"|"neutral", "noteTr": string}],`,
        `  "trTranslation": string }`,
      ].join("\n");
    case "wortfamilie":
      return [
        `Build the German word family for "${input.word}".`,
        `Return JSON:`,
        `{ "root": string, "trMeaning": string,`,
        `  "members": [{"word": string, "type": "verb"|"nomen"|"adjektiv"|"adverb"|"phrase", "trMeaning": string, "exampleDe": string, "exampleTr": string}],`,
        `  "memorationTip": "short Turkish tip" }`,
        `Provide 6-12 members. Mix simple and compound forms.`,
      ].join("\n");
    case "rollenspiel": {
      const history = (input.history as Array<{role:string;content:string}>) ?? [];
      const scenario = input.scenario ?? "Bäckerei";
      const level = input.level ?? "A2";
      const last = history[history.length - 1]?.content ?? "";
      return [
        `You are role-playing in German with a CEFR ${level} learner.`,
        `Scenario: ${scenario}. You play the native German speaker (e.g. baker, doctor, landlord).`,
        `Conversation so far:\n${history.map(h => `${h.role}: ${h.content}`).join("\n")}`,
        `Student just said: "${last}"`,
        `Return JSON:`,
        `{ "reply": "your German reply (1-3 sentences, level-appropriate)",`,
        `  "studentFeedback": { "wasUnderstandable": boolean, "tipTr": "1 short Turkish tip", "suggestedReplyDe": "an even better student reply" },`,
        `  "shouldEnd": boolean }`,
      ].join("\n");
    }
    case "news-summary":
      return [
        `Summarize this German news text for a CEFR ${input.level ?? "B1"} learner.`,
        `Text:\n"""${input.text}"""`,
        `Return JSON:`,
        `{ "summaryDe": "3-5 simple German sentences", "summaryTr": "Turkish translation",`,
        `  "keyVocab": [{"word": string, "trMeaning": string, "exampleDe": string}],`,
        `  "comprehensionQuestions": [{"q": string, "a": string}] }`,
        `Provide 5-8 keyVocab and 3 questions.`,
      ].join("\n");
  }
}

async function callOpenAI(p: string): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: p },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty content");
  return JSON.parse(content);
}

export async function POST(req: Request) {
  let body: Body;
  try { body = await req.json() as Body; }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
  if (!body?.task || !body?.input) {
    return NextResponse.json({ ok: false, error: "Missing task/input" }, { status: 400 });
  }
  try {
    const data = await callOpenAI(prompt(body.task, body.input));
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "AI error" }, { status: 500 });
  }
}
