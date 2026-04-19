import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

  const provider = hasOpenAI ? "openai" : hasOpenRouter ? "openrouter" : "heuristic";
  const model = hasOpenAI
    ? process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
    : hasOpenRouter
      ? process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free"
      : "heuristic-local";

  return NextResponse.json({
    ready: hasOpenAI || hasOpenRouter,
    provider,
    model,
  });
}
