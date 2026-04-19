import { NextResponse } from "next/server";
import {
  buildSourceBundle,
  extractTextFromFile,
  generateStudyToolkitFromSource,
} from "@/lib/ai-workbench";
import type { AiWorkbenchResponse } from "@/types/ai";

export const runtime = "nodejs";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to process the uploaded file.";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const maybeFile = formData.get("file");
    const maybeFiles = formData.getAll("files");
    const rawFocus = formData.get("focus");

    const files = maybeFiles.filter((value): value is File => value instanceof File);
    if (files.length === 0 && maybeFile instanceof File) {
      files.push(maybeFile);
    }

    if (files.length === 0) {
      return NextResponse.json<AiWorkbenchResponse>(
        {
          ok: false,
          errorMessage: "Please upload a valid file.",
        },
        { status: 400 }
      );
    }

    const focus = typeof rawFocus === "string" ? rawFocus.trim().slice(0, 240) : "";
    const extracted = [] as Awaited<ReturnType<typeof extractTextFromFile>>[];
    for (const file of files) {
      extracted.push(await extractTextFromFile(file));
    }

    const sourceBundle = buildSourceBundle(
      extracted.map((item) => ({
        fileName: item.fileName,
        text: item.text,
      }))
    );

    const sourceForGeneration = focus ? `Student focus: ${focus}\n\n${sourceBundle}` : sourceBundle;

    const { toolkit, usedAiModel } = await generateStudyToolkitFromSource(sourceForGeneration);

    const warnings = extracted.flatMap((item) => item.warnings);
    const totalChars = extracted.reduce((sum, item) => sum + item.text.length, 0);
    const primary = extracted[0];

    return NextResponse.json<AiWorkbenchResponse>({
      ok: true,
      fileName: primary.fileName,
      mimeType: primary.mimeType,
      sizeBytes: primary.sizeBytes,
      extractedChars: totalChars,
      sourceFiles: extracted.map((item) => ({
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        extractedChars: item.text.length,
      })),
      sourceBundle,
      toolkit,
      warnings,
      usedAiModel,
    });
  } catch (error) {
    return NextResponse.json<AiWorkbenchResponse>(
      {
        ok: false,
        errorMessage: toErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
