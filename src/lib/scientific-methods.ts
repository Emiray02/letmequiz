/**
 * Bilim destekli dil öğrenme metodolojisi sabitleri.
 * Kaynaklar: Ebbinghaus (forgetting curve), Bjork (desirable difficulty),
 * Krashen (comprehensible input + i+1), Karpicke (testing effect),
 * Anderson (interleaving), Roediger (retrieval practice), Cirillo (Pomodoro),
 * Ericsson (deliberate practice), Paivio (dual coding), Cepeda (spaced repetition).
 */

export type LearningPrinciple = {
  id: string;
  title: string;
  shortLabel: string;
  description: string;
  evidence: string;
  appliedIn: string[];
};

export const LEARNING_PRINCIPLES: LearningPrinciple[] = [
  {
    id: "srs",
    title: "Aralıklı tekrar (SRS)",
    shortLabel: "SRS",
    description:
      "Bilgiyi unutmadan hemen önce tekrar etmek uzun süreli belleğe yerleştirir. Ebbinghaus unutma eğrisi ve Cepeda meta-analizi ile doğrulanmıştır.",
    evidence: "Cepeda et al. 2006 — 317 deney meta-analizi; aralıklı tekrar masif tekrara üstün.",
    appliedIn: ["Vocabulary Lab", "Smart Review", "Artikel Trainer"],
  },
  {
    id: "active-recall",
    title: "Aktif geri çağırma (Testing Effect)",
    shortLabel: "Aktif geri çağırma",
    description:
      "Yeniden okumak yerine kendine sorup cevaplamak öğrenmeyi 2-3x hızlandırır. Karpicke & Roediger çalışmaları temel referans.",
    evidence: "Karpicke & Blunt 2011 — testing > re-reading + concept mapping.",
    appliedIn: ["Quiz Player", "Mock Sınav", "Flashcard Player"],
  },
  {
    id: "comprehensible-input",
    title: "Anlaşılır girdi (i+1)",
    shortLabel: "Comprehensible Input",
    description:
      "Krashen: dil edinimi mevcut seviyenizden hafif zor (i+1) içerikle gerçekleşir. Diziler, podcastler, kısa metinler bu nedenle çok güçlüdür.",
    evidence: "Krashen 1985 — Input Hypothesis.",
    appliedIn: ["Sitcom Clip Library", "Listening Drill", "Diktat"],
  },
  {
    id: "interleaving",
    title: "Karışık çalışma (Interleaving)",
    shortLabel: "Interleaving",
    description:
      "Konuları blok blok yerine karışık çalışmak transferi ve uzun vadeli aklında kalmayı arttırır. Bjork, Rohrer çalışmaları.",
    evidence: "Rohrer & Taylor 2007 — karışık problem setleri %43 daha iyi.",
    appliedIn: ["Dynamic Plan", "Mock Sınav"],
  },
  {
    id: "deliberate-practice",
    title: "Bilinçli pratik",
    shortLabel: "Deliberate Practice",
    description:
      "Ericsson: zayıf noktalara odaklı, geri bildirimle yapılan tekrarlar profesyonel yetkinlik üretir.",
    evidence: "Ericsson 1993 — Role of deliberate practice.",
    appliedIn: ["AI Feedback", "Skill Map", "Adaptive Planner"],
  },
  {
    id: "dual-coding",
    title: "Çift kodlama",
    shortLabel: "Dual Coding",
    description:
      "Görsel + sözel kodlama hatırlamayı arttırır (Paivio). Bu yüzden kelimeleri görsel/durumla eşleştirin.",
    evidence: "Paivio 1971 — Dual Coding Theory.",
    appliedIn: ["Sitcom Clips", "Vocabulary Lab"],
  },
  {
    id: "pomodoro",
    title: "Pomodoro & dikkat döngüsü",
    shortLabel: "Pomodoro",
    description:
      "25 dk yoğun + 5 dk mola döngüsü dikkati korur. Uzun seanslarda öğrenme platosuna ulaşılır.",
    evidence: "Cirillo 1980 — Pomodoro Technique.",
    appliedIn: ["Study Reminder", "Dynamic Plan"],
  },
  {
    id: "output-hypothesis",
    title: "Üretim (Output) hipotezi",
    shortLabel: "Output",
    description:
      "Swain: yalnızca girdi yetmez, dilde gerçek üretim (yazma/konuşma) öğrenmeyi sıkıştırır. Geri bildirim hayati.",
    evidence: "Swain 1985 — Output Hypothesis.",
    appliedIn: ["Schreiben Studio", "Sprechen Coach"],
  },
];

/**
 * SRS algoritması (basitleştirilmiş SM-2).
 * Kart 0-5 puan ile değerlendirilir. Sonraki tekrar aralığı (gün) döner.
 */
export function nextReviewIntervalDays(
  previousIntervalDays: number,
  easeFactor: number,
  quality: number,
): { intervalDays: number; easeFactor: number } {
  const q = Math.max(0, Math.min(5, quality));
  let ef = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ef < 1.3) ef = 1.3;

  let interval: number;
  if (q < 3) {
    interval = 1; // başarısız → ertesi gün
  } else if (previousIntervalDays === 0) {
    interval = 1;
  } else if (previousIntervalDays === 1) {
    interval = 6;
  } else {
    interval = Math.round(previousIntervalDays * ef);
  }
  return { intervalDays: interval, easeFactor: ef };
}
