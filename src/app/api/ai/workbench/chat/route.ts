import { NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestionFromSource } from "@/lib/ai-workbench";
import type { AiSourceChatResponse } from "@/types/ai";

export const runtime = "nodejs";

const requestSchema = z.object({
  sourceText: z.string().min(40).max(80_000),
  question: z.string().min(4).max(400),
});

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to answer your question from sources.";
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json<AiSourceChatResponse>(
      {
        ok: false,
        errorMessage: "Invalid JSON payload.",
      },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json<AiSourceChatResponse>(
      {
        ok: false,
        errorMessage: "Validation failed for source chat request.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await answerQuestionFromSource(parsed.data.sourceText, parsed.data.question);

    return NextResponse.json<AiSourceChatResponse>({
      ok: true,
      answer: result.answer,
      citations: result.citations,
      usedAiModel: result.usedAiModel,
    });
  } catch (error) {
    return NextResponse.json<AiSourceChatResponse>(
      {
        ok: false,
        errorMessage: toErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
