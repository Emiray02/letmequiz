import { createClient } from "@supabase/supabase-js";
import type { CreateSetInput, StudySet, StudySetSummary } from "@/types/study";
import {
  createMockStudySet,
  getMockStudySetById,
  listMockStudySets,
} from "@/lib/mock-data";

type StudySetRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

type CardRow = {
  id: string;
  set_id: string;
  term: string;
  definition: string;
  position: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

export const usingMockData = supabase === null;

function toSummary(row: StudySetRow, cardCount: number): StudySetSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    createdAt: row.created_at,
    cardCount,
  };
}

function toStudySet(row: StudySetRow, cards: CardRow[]): StudySet {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    createdAt: row.created_at,
    cards: cards
      .sort((a, b) => a.position - b.position)
      .map((card) => ({
        id: card.id,
        term: card.term,
        definition: card.definition,
        position: card.position,
      })),
  };
}

export async function listStudySets(): Promise<StudySetSummary[]> {
  if (!supabase) {
    return listMockStudySets();
  }

  const { data: setRows, error: setsError } = await supabase
    .from("study_sets")
    .select("id,title,description,created_at")
    .order("created_at", { ascending: false });

  if (setsError || !setRows) {
    console.error("Failed to load study sets", setsError);
    return listMockStudySets();
  }

  const { data: cardRows, error: cardsError } = await supabase
    .from("cards")
    .select("set_id");

  if (cardsError || !cardRows) {
    return (setRows as StudySetRow[]).map((row) => toSummary(row, 0));
  }

  const counts = (cardRows as Array<{ set_id: string }>).reduce(
    (acc, row) => {
      const current = acc.get(row.set_id) ?? 0;
      acc.set(row.set_id, current + 1);
      return acc;
    },
    new Map<string, number>()
  );

  return (setRows as StudySetRow[]).map((row) => toSummary(row, counts.get(row.id) ?? 0));
}

export async function getStudySetById(id: string): Promise<StudySet | null> {
  if (!supabase) {
    return getMockStudySetById(id);
  }

  const { data: setRow, error: setError } = await supabase
    .from("study_sets")
    .select("id,title,description,created_at")
    .eq("id", id)
    .maybeSingle();

  if (setError || !setRow) {
    return null;
  }

  const { data: cardRows, error: cardsError } = await supabase
    .from("cards")
    .select("id,set_id,term,definition,position")
    .eq("set_id", id)
    .order("position", { ascending: true });

  if (cardsError || !cardRows) {
    return {
      id: setRow.id,
      title: setRow.title,
      description: setRow.description ?? "",
      createdAt: setRow.created_at,
      cards: [],
    };
  }

  return toStudySet(setRow as StudySetRow, cardRows as CardRow[]);
}

export async function createStudySet(input: CreateSetInput): Promise<StudySet> {
  if (!supabase) {
    return createMockStudySet(input);
  }

  const title = input.title.trim();
  const description = input.description?.trim() ?? "";
  const cards = input.cards.map((card) => ({
    term: card.term.trim(),
    definition: card.definition.trim(),
  }));

  const { data: createdSet, error: setError } = await supabase
    .from("study_sets")
    .insert({ title, description })
    .select("id,title,description,created_at")
    .single();

  if (setError || !createdSet) {
    throw new Error("Set could not be created.");
  }

  const cardsPayload = cards.map((card, index) => ({
    set_id: createdSet.id,
    term: card.term,
    definition: card.definition,
    position: index,
  }));

  if (cardsPayload.length > 0) {
    const { error: cardsError } = await supabase.from("cards").insert(cardsPayload);
    if (cardsError) {
      await supabase.from("study_sets").delete().eq("id", createdSet.id);
      throw new Error("Cards could not be created.");
    }
  }

  const hydrated = await getStudySetById(createdSet.id);
  if (!hydrated) {
    throw new Error("Set created but could not be reloaded.");
  }

  return hydrated;
}
