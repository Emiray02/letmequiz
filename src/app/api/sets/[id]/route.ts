import { NextResponse } from "next/server";
import { getStudySetById } from "@/lib/data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const set = await getStudySetById(id);

  if (!set) {
    return NextResponse.json({ error: "Set not found." }, { status: 404 });
  }

  return NextResponse.json({ data: set });
}
