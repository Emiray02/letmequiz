import type { CreateSetInput, StudySet, StudySetSummary } from "@/types/study";

const seedSetId = "seed-tr-101";
const germanSeedSetId = "seed-de-a2-101";

let mockSets: StudySet[] = [
  {
    id: germanSeedSetId,
    title: "Deutsch TELC A2 Starter",
    description: "telc A2 icin temel kaliplar, gunluk iletisim ve kisa sinav odakli kelimeler.",
    createdAt: new Date().toISOString(),
    cards: [
      {
        id: "seed-de-card-1",
        term: "einen Termin vereinbaren",
        definition: "Randevu ayarlamak",
        position: 0,
      },
      {
        id: "seed-de-card-2",
        term: "Wie komme ich zum Bahnhof?",
        definition: "Istasyona nasil giderim?",
        position: 1,
      },
      {
        id: "seed-de-card-3",
        term: "Ich haette gern...",
        definition: "... istemek icin nazik siparis kalibi",
        position: 2,
      },
      {
        id: "seed-de-card-4",
        term: "sich bewerben",
        definition: "is basvurusu yapmak",
        position: 3,
      },
      {
        id: "seed-de-card-5",
        term: "Seit wann lernst du Deutsch?",
        definition: "Ne zamandan beri Almanca ogreniyorsun?",
        position: 4,
      },
      {
        id: "seed-de-card-6",
        term: "Ich habe Kopfschmerzen.",
        definition: "Basim agriyor.",
        position: 5,
      },
      {
        id: "seed-de-card-7",
        term: "Koennen Sie das bitte wiederholen?",
        definition: "Bunu lutfen tekrar eder misiniz?",
        position: 6,
      },
      {
        id: "seed-de-card-8",
        term: "am Wochenende",
        definition: "hafta sonunda",
        position: 7,
      },
      {
        id: "seed-de-card-9",
        term: "frueher / spaeter",
        definition: "daha erken / daha sonra",
        position: 8,
      },
      {
        id: "seed-de-card-10",
        term: "Ich interessiere mich fuer ...",
        definition: "... ile ilgileniyorum",
        position: 9,
      },
    ],
  },
  {
    id: seedSetId,
    title: "Turkce Kelime Hazinesi",
    description: "Sinav oncesi hizli tekrar icin temel kavramlar.",
    createdAt: new Date().toISOString(),
    cards: [
      {
        id: "seed-card-1",
        term: "Mukayese",
        definition: "Iki seyi karsilastirarak degerlendirme yapma.",
        position: 0,
      },
      {
        id: "seed-card-2",
        term: "Mecaz",
        definition: "Bir sozcugun gercek anlami disinda kullanilmasi.",
        position: 1,
      },
      {
        id: "seed-card-3",
        term: "Istiare",
        definition: "Benzetmenin yalnizca bir ogesiyle yapilmasi.",
        position: 2,
      },
      {
        id: "seed-card-4",
        term: "Tariz",
        definition: "Sozun tersini kastederek ince alay yapma.",
        position: 3,
      },
    ],
  },
];

function cloneSet(set: StudySet): StudySet {
  return {
    ...set,
    cards: set.cards.map((card) => ({ ...card })),
  };
}

export function listMockStudySets(): StudySetSummary[] {
  return [...mockSets]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((set) => ({
      id: set.id,
      title: set.title,
      description: set.description,
      createdAt: set.createdAt,
      cardCount: set.cards.length,
    }));
}

export function getMockStudySetById(id: string): StudySet | null {
  const found = mockSets.find((set) => set.id === id);
  return found ? cloneSet(found) : null;
}

export function createMockStudySet(input: CreateSetInput): StudySet {
  const createdAt = new Date().toISOString();
  const created: StudySet = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    createdAt,
    cards: input.cards.map((card, index) => ({
      id: crypto.randomUUID(),
      term: card.term.trim(),
      definition: card.definition.trim(),
      position: index,
    })),
  };

  mockSets = [created, ...mockSets];
  return cloneSet(created);
}
