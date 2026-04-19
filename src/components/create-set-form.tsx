"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DraftCard = {
  term: string;
  definition: string;
};

const minimumCardRows = 2;

function emptyCard(): DraftCard {
  return {
    term: "",
    definition: "",
  };
}

export default function CreateSetForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cards, setCards] = useState<DraftCard[]>([emptyCard(), emptyCard()]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filledRows = useMemo(
    () => cards.filter((card) => card.term.trim() || card.definition.trim()).length,
    [cards]
  );

  function updateCard(index: number, key: keyof DraftCard, value: string) {
    setCards((current) =>
      current.map((card, cardIndex) =>
        cardIndex === index ? { ...card, [key]: value } : card
      )
    );
  }

  function appendCard() {
    setCards((current) => [...current, emptyCard()]);
  }

  function removeCard(index: number) {
    if (cards.length <= minimumCardRows) {
      return;
    }

    setCards((current) => current.filter((_, cardIndex) => cardIndex !== index));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedCards = cards
      .map((card) => ({
        term: card.term.trim(),
        definition: card.definition.trim(),
      }))
      .filter((card) => card.term.length > 0 && card.definition.length > 0);

    if (title.trim().length < 2) {
      setError("Set title must include at least 2 characters.");
      return;
    }

    if (normalizedCards.length < minimumCardRows) {
      setError("At least 2 complete cards are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/sets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          cards: normalizedCards,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Set could not be created right now."
        );
      }

      router.push(`/set/${payload.data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "An unexpected error occurred while creating the set."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)] backdrop-blur md:p-8"
    >
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Set Title
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Example: Biology Cell Structures"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none ring-teal-500 transition focus:ring"
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="description"
          className="text-sm font-semibold uppercase tracking-wide text-slate-700"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What should this set help you remember?"
          className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none ring-teal-500 transition focus:ring"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-slate-900">Cards</h2>
          <p className="text-sm text-slate-500">
            {filledRows} / {cards.length} row ready
          </p>
        </div>

        <div className="space-y-3">
          {cards.map((card, index) => (
            <div
              key={`draft-card-${index}`}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]"
            >
              <input
                value={card.term}
                onChange={(event) => updateCard(index, "term", event.target.value)}
                placeholder={`Term ${index + 1}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-teal-500 focus:ring"
                required
              />
              <input
                value={card.definition}
                onChange={(event) => updateCard(index, "definition", event.target.value)}
                placeholder="Definition"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-teal-500 focus:ring"
                required
              />
              <button
                type="button"
                onClick={() => removeCard(index)}
                disabled={cards.length <= minimumCardRows}
                className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition enabled:hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={appendCard}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Add Another Card
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Creating Set..." : "Create Set"}
      </button>
    </form>
  );
}
