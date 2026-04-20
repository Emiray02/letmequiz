/**
 * Heuristic Türkçe / Almanca dil dedektörü.
 * Kısa metinlerde bile makul doğruluk veren basit puanlama.
 */
export type DetectedLang = "de" | "tr" | "mixed" | "unknown";

const DE_ONLY_CHARS = /[äöüÄÖÜß]/g;
const TR_ONLY_CHARS = /[çÇğĞıİşŞ]/g;

const DE_WORDS = new Set([
  "der",
  "die",
  "das",
  "und",
  "ich",
  "du",
  "er",
  "sie",
  "es",
  "wir",
  "ihr",
  "nicht",
  "ist",
  "sind",
  "war",
  "haben",
  "habe",
  "hat",
  "ein",
  "eine",
  "mit",
  "auf",
  "zu",
  "von",
  "im",
  "in",
  "den",
  "dem",
  "des",
  "wie",
  "was",
  "warum",
  "weil",
  "aber",
  "auch",
  "sehr",
  "schon",
  "noch",
  "doch",
]);

const TR_WORDS = new Set([
  "ve",
  "bir",
  "bu",
  "şu",
  "için",
  "değil",
  "var",
  "yok",
  "ben",
  "sen",
  "biz",
  "siz",
  "çok",
  "az",
  "ama",
  "fakat",
  "çünkü",
  "ile",
  "gibi",
  "kadar",
  "daha",
  "şimdi",
  "sonra",
  "önce",
  "evet",
  "hayır",
  "olmak",
  "etmek",
  "yapmak",
  "merhaba",
  "selam",
]);

export function detectLanguage(text: string): {
  lang: DetectedLang;
  confidence: number;
  germanScore: number;
  turkishScore: number;
} {
  const sample = (text || "").toLowerCase().trim();
  if (sample.length < 4) {
    return { lang: "unknown", confidence: 0, germanScore: 0, turkishScore: 0 };
  }
  const deCharHits = (sample.match(DE_ONLY_CHARS) || []).length;
  const trCharHits = (sample.match(TR_ONLY_CHARS) || []).length;
  const tokens = sample.split(/[^a-zçğıöşüäöüß]+/i).filter((t) => t.length > 0);
  let deWordHits = 0;
  let trWordHits = 0;
  for (const t of tokens) {
    if (DE_WORDS.has(t)) deWordHits += 1;
    if (TR_WORDS.has(t)) trWordHits += 1;
  }
  const germanScore = deCharHits * 2 + deWordHits * 3;
  const turkishScore = trCharHits * 2 + trWordHits * 3;

  const total = germanScore + turkishScore;
  if (total === 0) {
    return { lang: "unknown", confidence: 0, germanScore, turkishScore };
  }
  const dominant = germanScore > turkishScore ? "de" : "tr";
  const ratio = Math.max(germanScore, turkishScore) / total;
  if (ratio < 0.62 && total >= 6) {
    return { lang: "mixed", confidence: ratio, germanScore, turkishScore };
  }
  return { lang: dominant, confidence: ratio, germanScore, turkishScore };
}
