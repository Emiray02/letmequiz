import { NextResponse } from "next/server";
import { z } from "zod";
import { createStudySet, listStudySets } from "@/lib/data";

const createSetSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  cards: z
    .array(
      z.object({
        term: z.string().min(1).max(200),
        definition: z.string().min(1).max(800),
      })
    )
    .min(2)
    .max(300),
});

export async function GET() {
  const sets = await listStudySets();
  return NextResponse.json({ data: sets });
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = createSetSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const created = await createStudySet(parsed.data);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
