/**
 * Exam plan generator (telc A1 → B2).
 *
 * Pure, deterministic functions. Given a fixed (level, examDate, dailyMinutes,
 * startDate) we always return the same per-day schedule. Adaptation comes from
 * `progress` (done/skipped) and `weak` (carry-over) lists supplied by the
 * caller (cloud/local store). No randomness, no hidden state.
 *
 * Pedagogy:
 *  - 7-day cycles. Day 7 of every cycle = full review of that cycle's items.
 *  - Every other cycle (i.e. day 14, 28, …) = mock prüfung (Lesen + Hören
 *    + Schreiben + Sprechen). The week before the exam is mock-only.
 *  - Each non-review/non-mock day delivers ≤ N items chosen so total
 *    ≈ dailyMinutes. Items rotate: grammar → vocab → skill → grammar …
 *  - Weak items (recorded by the daily-mode page) get re-injected at the
 *    front of the next study day until marked done with score ≥ 80.
 *
 * telc level inventories below come from the official telc Übungstest
 * specifications (modules: Lesen, Sprachbausteine, Hören, Schreiben,
 * Mündliche Prüfung) cross-referenced with Goethe-Institut A1–B2 syllabi
 * and the GER (CEFR) can-do statements.
 *
 * Sources:
 *  - telc gGmbH — Übungstests A1/A2/B1/B2 Erwachsene
 *      https://www.telc.net/pruefungsteilnehmende/sprachpruefungen.html
 *  - Goethe-Institut — Lernziele A1–B2
 *      https://www.goethe.de/de/spr/kup/prf.html
 *  - Europarat — Gemeinsamer europäischer Referenzrahmen (GER)
 *      https://www.coe.int/en/web/common-european-framework-reference-languages
 */

import { LESSONS as GRAMMAR_LESSONS } from "@/lib/grammar-lessons";

/* ---------------- Types ---------------- */

export type CefrLevel = "A1" | "A2" | "B1" | "B2";

export type PlanItemKind =
  | "grammar"   // a /grammar/lessons/<slug> tutorial
  | "vocab"     // a vocabulary theme drill
  | "skill"     // Hören / Lesen / Schreiben / Sprechen practice
  | "review"    // weekly cumulative review
  | "mock";     // full mock prüfung

export type CatalogItem = {
  id: string;            // stable across the level (used as item_id in DB)
  kind: PlanItemKind;
  title: string;
  desc: string;
  href: string;
  minutes: number;       // estimated study time
};

export type PlanDay = {
  dayIndex: number;             // 0-based, day 0 = startDate
  date: string;                 // YYYY-MM-DD
  isReview: boolean;
  isMock: boolean;
  items: PlanDayItem[];
  totalMinutes: number;
};

export type PlanDayItem = CatalogItem & {
  /** True when this item is being repeated because it was weak earlier. */
  carriedOver?: boolean;
};

export type ExamPlanInput = {
  level: CefrLevel;
  examDate: string;             // YYYY-MM-DD (telc Prüfungstag)
  startDate?: string;           // YYYY-MM-DD; defaults to today
  dailyMinutes: number;         // 15..240
};

export type DailyAdaptation = {
  /** item ids the student finished with score >= 80 (skip from carry-over). */
  done: Set<string>;
  /** item ids the student marked weak (re-inject in upcoming day). */
  weak: Set<string>;
};

/* ---------------- Catalog ---------------- */
/**
 * Build the canonical item catalog for a level. Order = pedagogical order
 * (easiest first). The planner walks this list to fill day after day.
 */
function buildCatalog(level: CefrLevel): CatalogItem[] {
  const grammar: CatalogItem[] = GRAMMAR_LESSONS
    .filter((l) => levelOrder(l.level) <= levelOrder(level))
    .map((l) => ({
      id: `grammar:${l.slug}`,
      kind: "grammar" as const,
      title: l.title,
      desc: l.subtitle,
      href: `/grammar/lessons/${l.slug}`,
      minutes: l.minutes,
    }));

  const vocab: CatalogItem[] = VOCAB_THEMES[level].map((t) => ({
    id: `vocab:${t.slug}`,
    kind: "vocab" as const,
    title: `Wortschatz — ${t.title}`,
    desc: t.desc,
    href: `/wortschatz?theme=${encodeURIComponent(t.slug)}`,
    minutes: 12,
  }));

  const skills: CatalogItem[] = SKILL_DRILLS[level].map((s) => ({
    id: `skill:${s.id}`,
    kind: "skill" as const,
    title: s.title,
    desc: s.desc,
    href: s.href,
    minutes: s.minutes,
  }));

  // Interleave: grammar, vocab, skill, grammar, vocab, skill …
  const out: CatalogItem[] = [];
  const max = Math.max(grammar.length, vocab.length, skills.length);
  for (let i = 0; i < max; i += 1) {
    if (grammar[i]) out.push(grammar[i]);
    if (vocab[i])   out.push(vocab[i]);
    if (skills[i])  out.push(skills[i]);
  }
  return out;
}

function levelOrder(l: CefrLevel | "B1" | "A2" | "A1"): number {
  return ({ A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 } as Record<string, number>)[l] ?? 0;
}

/* ---------------- Vocab themes (telc thematic areas) ----------------- */
/**
 * telc Wortschatzlisten thematic areas (official telc handbooks), e.g.:
 * Familie & persönliche Daten, Wohnen, Einkaufen, Essen & Trinken,
 * Arbeit & Beruf, Reisen, Gesundheit, Freizeit, Bildung, Umwelt …
 * Ref: telc Wortschatz- und Strukturlisten (Deutsch).
 */
const VOCAB_THEMES: Record<CefrLevel, { slug: string; title: string; desc: string }[]> = {
  A1: [
    { slug: "familie",       title: "Familie & Personen",      desc: "Akrabalar, kim kimdir, basit tanışma." },
    { slug: "zahlen-zeit",   title: "Zahlen & Uhrzeit",        desc: "0–1000, saatler, tarihler." },
    { slug: "essen-trinken", title: "Essen & Trinken",         desc: "Yemek, içecek, restoran." },
    { slug: "wohnen",        title: "Wohnen",                  desc: "Ev, oda, eşyalar." },
    { slug: "einkaufen",     title: "Einkaufen",               desc: "Alışveriş, fiyatlar." },
    { slug: "wegbeschreibung", title: "Wegbeschreibung",       desc: "Yol tarifi, şehir." },
  ],
  A2: [
    { slug: "arbeit",        title: "Arbeit & Beruf",          desc: "İş, meslek, başvuru." },
    { slug: "gesundheit",    title: "Gesundheit & Körper",     desc: "Vücut, hastalık, doktor." },
    { slug: "reisen",        title: "Reisen & Verkehr",        desc: "Yolculuk, otel, ulaşım." },
    { slug: "freizeit",      title: "Freizeit & Hobby",        desc: "Hobi, sinema, spor." },
    { slug: "natur-wetter",  title: "Natur & Wetter",          desc: "Hava, mevsim, doğa." },
    { slug: "feste",         title: "Feste & Feiertage",       desc: "Bayramlar, kutlamalar." },
  ],
  B1: [
    { slug: "bildung",       title: "Bildung & Lernen",        desc: "Okul, üniversite, kurs." },
    { slug: "medien",        title: "Medien & Internet",       desc: "Sosyal medya, haberler." },
    { slug: "umwelt",        title: "Umwelt & Klima",          desc: "Çevre, geri dönüşüm." },
    { slug: "gesellschaft",  title: "Gesellschaft",            desc: "Toplum, politika, gönüllülük." },
    { slug: "kultur",        title: "Kultur & Kunst",          desc: "Kitap, müzik, festival." },
    { slug: "wirtschaft",    title: "Arbeitswelt",             desc: "Bewerbung, Vorstellungsgespräch." },
  ],
  B2: [
    { slug: "wissenschaft",  title: "Wissenschaft & Technik",  desc: "Bilim, teknoloji, dijitalleşme." },
    { slug: "globalisierung",title: "Globalisierung",          desc: "Küreselleşme, göç." },
    { slug: "ethik",         title: "Ethik & Werte",           desc: "Etik, değerler, ikilemler." },
    { slug: "wirtschaft-pol",title: "Wirtschaft & Politik",    desc: "Ekonomi, politika, AB." },
    { slug: "kunst",         title: "Kunst & Literatur",       desc: "Sanat, edebiyat akımları." },
    { slug: "psychologie",   title: "Psychologie",             desc: "Davranış, motivasyon." },
  ],
};

/* ---------------- Skill drills (Hören / Lesen / Schreiben / Sprechen) -- */
const SKILL_DRILLS: Record<CefrLevel, { id: string; title: string; desc: string; href: string; minutes: number }[]> = {
  A1: [
    { id: "hoeren-a1",     title: "Hören — kısa diyaloglar",     desc: "telc A1 Teil 1: ana bilgi anlama.", href: "/skills/hoeren?level=A1",     minutes: 12 },
    { id: "lesen-a1",      title: "Lesen — kısa metinler",       desc: "telc A1 Teil 1: anonslar, mesajlar.", href: "/skills/lesen?level=A1",      minutes: 12 },
    { id: "schreiben-a1",  title: "Schreiben — formular & kart", desc: "telc A1 Teil 4: form doldurma + kısa not.", href: "/skills/schreiben?level=A1",  minutes: 15 },
    { id: "sprechen-a1",   title: "Sprechen — selbstvorstellung",desc: "telc A1 Teil 1: kendini tanıtma.", href: "/skills/sprechen?level=A1",   minutes: 10 },
  ],
  A2: [
    { id: "hoeren-a2",     title: "Hören — duyurular ve konuşmalar", desc: "telc A2 Teil 1+2: detay anlama.", href: "/skills/hoeren?level=A2",     minutes: 15 },
    { id: "lesen-a2",      title: "Lesen — e-posta + makaleler", desc: "telc A2 Teil 1+2.", href: "/skills/lesen?level=A2",      minutes: 15 },
    { id: "schreiben-a2",  title: "Schreiben — kısa mektup",     desc: "telc A2: yaklaşık 30 kelimelik kişisel mektup.", href: "/skills/schreiben?level=A2",  minutes: 20 },
    { id: "sprechen-a2",   title: "Sprechen — bilgi alma/verme", desc: "telc A2 Teil 2+3: ortak planlama.", href: "/skills/sprechen?level=A2",   minutes: 12 },
  ],
  B1: [
    { id: "hoeren-b1",     title: "Hören — radio + interview",   desc: "telc B1 Teil 1+2+3.", href: "/skills/hoeren?level=B1",     minutes: 18 },
    { id: "lesen-b1",      title: "Lesen — uzun metin + ilan",   desc: "telc B1 Teil 1+2+3.", href: "/skills/lesen?level=B1",      minutes: 18 },
    { id: "schreiben-b1",  title: "Schreiben — formel/informel mektup", desc: "telc B1: ~150 kelime.", href: "/skills/schreiben?level=B1",  minutes: 25 },
    { id: "sprechen-b1",   title: "Sprechen — discussion + planlama", desc: "telc B1 Teil 1+2+3.", href: "/skills/sprechen?level=B1",   minutes: 15 },
  ],
  B2: [
    { id: "hoeren-b2",     title: "Hören — Vortrag + Diskussion", desc: "telc B2 Teil 1+2+3.", href: "/skills/hoeren?level=B2",     minutes: 22 },
    { id: "lesen-b2",      title: "Lesen — Sachtext + Kommentar", desc: "telc B2 Teil 1+2+3.", href: "/skills/lesen?level=B2",      minutes: 22 },
    { id: "schreiben-b2",  title: "Schreiben — formelle E-Mail", desc: "telc B2: ~200 kelime.", href: "/skills/schreiben?level=B2",  minutes: 30 },
    { id: "sprechen-b2",   title: "Sprechen — Präsentation",     desc: "telc B2 Teil 1+2+3: argümantasyon.", href: "/skills/sprechen?level=B2",   minutes: 18 },
  ],
};

/* ---------------- Date helpers ---------------- */

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseISO(d: string): Date {
  return new Date(`${d}T00:00:00.000Z`);
}
function addDaysISO(d: string, n: number): string {
  const dt = parseISO(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

/* ---------------- Planner core ---------------- */

/**
 * Returns one planned day. Pure function — same input ⇒ same output.
 * `adaptation.weak` items get prepended to today as "carriedOver". `done`
 * items are filtered out from the base catalog if they appear.
 */
export function planForDay(
  input: ExamPlanInput,
  dayIndex: number,
  adaptation: DailyAdaptation = { done: new Set(), weak: new Set() },
): PlanDay {
  const start = input.startDate ?? todayISO();
  const date  = addDaysISO(start, dayIndex);
  const totalDays = Math.max(1, daysBetween(start, input.examDate));
  const daysLeft  = Math.max(0, daysBetween(date, input.examDate));

  const cycleDay = dayIndex % 7;            // 0..6
  const isReview = cycleDay === 6;          // last day of every week
  const cycleNumber = Math.floor(dayIndex / 7);
  const isMock = (cycleNumber > 0 && cycleNumber % 2 === 1 && cycleDay === 5)
              || (daysLeft <= 7 && cycleDay >= 3);  // last week: lots of mocks

  const catalog = buildCatalog(input.level);
  const items: PlanDayItem[] = [];
  let mins = 0;
  const budget = input.dailyMinutes;

  // 1) Carry-over (weak) items first.
  const carry = catalog.filter((c) => adaptation.weak.has(c.id));
  for (const c of carry) {
    if (mins + c.minutes > budget && items.length > 0) break;
    items.push({ ...c, carriedOver: true });
    mins += c.minutes;
  }

  if (isMock) {
    items.push({
      id: `mock:${input.level}:day${dayIndex}`,
      kind: "mock",
      title: `Mock Prüfung ${input.level}`,
      desc: "Tüm modüller — gerçek sınav koşullarında dene.",
      href: `/exam?level=${input.level}&mode=mock`,
      minutes: input.level === "A1" ? 60 : input.level === "A2" ? 80 : 120,
      carriedOver: false,
    });
    return finishDay(date, dayIndex, true, isReview, items);
  }

  if (isReview) {
    // Review = last cycle's items, condensed.
    const cycleStart = dayIndex - 6;
    const seenIds = new Set<string>();
    for (let d = cycleStart; d < dayIndex; d += 1) {
      const day = planForDay(input, d, { done: adaptation.done, weak: new Set() });
      for (const it of day.items) {
        if (it.kind === "review" || it.kind === "mock") continue;
        if (!seenIds.has(it.id)) seenIds.add(it.id);
      }
    }
    items.push({
      id: `review:day${dayIndex}`,
      kind: "review",
      title: "Genel tekrar",
      desc: `Bu hafta gördüğün ${seenIds.size} konuyu kart kart yenile.`,
      href: `/heute?mode=review&day=${dayIndex}`,
      minutes: Math.min(budget - mins, 30),
      carriedOver: false,
    });
    return finishDay(date, dayIndex, false, true, items);
  }

  // 2) Fresh items from catalog at offset = study-day-index (skipping reviews/mocks).
  const studyIndex = countStudyDaysBefore(dayIndex);
  // Pick ~3 items per day (will trim by minute budget below).
  const startOffset = (studyIndex * 3) % catalog.length;
  let i = 0;
  while (mins < budget && i < catalog.length) {
    const c = catalog[(startOffset + i) % catalog.length];
    i += 1;
    if (adaptation.done.has(c.id)) continue;
    if (items.find((x) => x.id === c.id)) continue;
    if (mins + c.minutes > budget && items.length > 0) break;
    items.push({ ...c, carriedOver: false });
    mins += c.minutes;
    if (items.length >= 4) break;
  }
  // Make sure we always emit something.
  if (items.length === 0 && catalog.length > 0) {
    const c = catalog[startOffset];
    items.push({ ...c, carriedOver: false });
  }

  return finishDay(date, dayIndex, false, false, items);

  void totalDays; // referenced only for documentation
}

function finishDay(date: string, dayIndex: number, isMock: boolean, isReview: boolean, items: PlanDayItem[]): PlanDay {
  return {
    dayIndex,
    date,
    isMock,
    isReview,
    items,
    totalMinutes: items.reduce((s, it) => s + it.minutes, 0),
  };
}

/** Counts how many days up to (not including) `dayIndex` are study days. */
function countStudyDaysBefore(dayIndex: number): number {
  let n = 0;
  for (let d = 0; d < dayIndex; d += 1) {
    const cycleDay = d % 7;
    const cycleNumber = Math.floor(d / 7);
    const isReview = cycleDay === 6;
    const isMock = cycleNumber > 0 && cycleNumber % 2 === 1 && cycleDay === 5;
    if (!isReview && !isMock) n += 1;
  }
  return n;
}

/** Build the entire schedule (capped). Useful for the "tüm plan" view. */
export function planAllDays(input: ExamPlanInput, adaptation?: DailyAdaptation): PlanDay[] {
  const start = input.startDate ?? todayISO();
  const total = Math.max(1, Math.min(120, daysBetween(start, input.examDate) + 1));
  const days: PlanDay[] = [];
  for (let d = 0; d < total; d += 1) days.push(planForDay(input, d, adaptation));
  return days;
}

/** Convenience: which dayIndex is "today" for this plan? */
export function todayIndex(input: ExamPlanInput): number {
  const start = input.startDate ?? todayISO();
  return Math.max(0, daysBetween(start, todayISO()));
}
